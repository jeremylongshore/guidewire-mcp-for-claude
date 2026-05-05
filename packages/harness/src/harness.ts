import { createHash, randomUUID } from 'node:crypto';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { AuditAppendInput } from '@intentsolutions/guidewire-audit';
import type {
  Approval,
  EvidenceBundle,
  Plan,
  PlanInput,
  PolicyDecision,
  ExecuteResult,
  RollbackHint,
} from '@intentsolutions/guidewire-schemas';
import { makeHarnessError } from './error.js';
import type { Harness, HarnessConfig, SideEffect } from './types.js';

/**
 * Canonical idempotency key formula per 02-PRD § 5.4 / 05-TECHNICAL-SPEC § 3.4:
 *
 *   idempotencyKey = "gwh1:" + sha256(
 *     toolName + ':' + toolVersion + ':' + tenantId + ':' +
 *     canonicalize(args) + ':' + actorId
 *   )
 *
 * `canonicalize(args)` is JCS-style canonical JSON (RFC 8785) — map-order
 * independent. The `gwh1:` prefix is the harness major-version tag so a
 * future replay-store schema change is distinguishable.
 *
 * `dbTransactionId` = sha256(idempotencyKey) — 64 hex chars, no prefix. This
 * is sent as the `GW-DBTransaction-ID` HTTP header on Cloud API write requests
 * (librarian P1). Guidewire fails duplicates with AlreadyExecutedException;
 * it does NOT replay (unlike Stripe-style Idempotency-Key).
 */
function deriveKeys(input: PlanInput): { idempotencyKey: string; dbTransactionId: string } {
  const canonicalArgs = canonicalizeArgs(input.args);
  const preimage = [
    input.toolName,
    input.toolVersion,
    input.tenantId,
    canonicalArgs,
    input.actorId,
  ].join(':');
  const keyHash = createHash('sha256').update(preimage).digest('hex');
  const idempotencyKey = `gwh1:${keyHash}`;
  const dbTransactionId = createHash('sha256').update(idempotencyKey).digest('hex');
  return { idempotencyKey, dbTransactionId };
}

/**
 * JCS-like canonical JSON (RFC 8785 subset sufficient for our args shapes).
 * Keys sorted recursively; arrays preserve order. Covers all JSON-serializable
 * arg types; non-serializable values throw at Zod validation before this runs.
 */
function canonicalizeArgs(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalizeArgs(v)).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalizeArgs(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * SHA-256 hex of the plan content — used as the content-addressed `planId`.
 */
function derivePlanId(input: PlanInput, idempotencyKey: string): string {
  const preimage = JSON.stringify({
    toolName: input.toolName,
    toolVersion: input.toolVersion,
    mode: input.mode,
    tenantId: input.tenantId,
    actorId: input.actorId,
    args: canonicalizeArgs(input.args),
    summary: input.summary,
    traceId: input.traceId,
    idempotencyKey,
  });
  return createHash('sha256').update(preimage).digest('hex');
}

/**
 * In-memory idempotency cache. Maps `idempotencyKey` → serialized
 * `ExecuteResult`. In production this is a Postgres `idempotency_keys` table;
 * the skeleton uses a module-level `Map` so tests within one process exercise
 * the replay path correctly.
 *
 * The cache is NOT shared across `createHarness()` instances — each instance
 * gets its own closure. This is intentional: in production, each server
 * process has its own cache pointing to the shared DB.
 */
function createIdempotencyCache(): {
  get: (key: string) => ExecuteResult<unknown> | undefined;
  set: (key: string, result: ExecuteResult<unknown>) => void;
} {
  const cache = new Map<string, ExecuteResult<unknown>>();
  return {
    get: (key) => cache.get(key),
    set: (key, result) => { cache.set(key, result); },
  };
}

const TRACER_NAME = '@intentsolutions/guidewire-harness';

/**
 * `createHarness()` — the factory per 02-PRD § 5.8 + 05-TECHNICAL-SPEC § 3.8.
 *
 * Returns a `Harness` handle that tools call in sequence:
 *   plan() → policy() → approve()? → execute() → evidence()
 *
 * Every public method opens an OTel span tagged `[code, tool_name, mode]` per
 * Hard Rule #6 + 05-TECHNICAL-SPEC § 4. Sentry grouping fingerprint follows
 * from AppError.toSentryEvent().
 */
export function createHarness(cfg: HarnessConfig): Harness {
  const { audit, policy, approvals, evidence, observability, profile } = cfg;
  const tracer = trace.getTracer(TRACER_NAME);
  const idempCache = createIdempotencyCache();

  // ─── plan() ───────────────────────────────────────────────────────────────

  const buildPlan: Harness['plan'] = (input: PlanInput): Plan => {
    const { idempotencyKey, dbTransactionId } = deriveKeys(input);
    const planId = derivePlanId(input, idempotencyKey);
    return {
      toolName: input.toolName,
      toolVersion: input.toolVersion,
      mode: input.mode,
      tenantId: input.tenantId,
      actorId: input.actorId,
      args: input.args,
      summary: input.summary,
      traceId: input.traceId,
      planId,
      createdAt: new Date().toISOString(),
      idempotencyKey,
      wire: { dbTransactionId },
    };
  };

  // ─── policy() ─────────────────────────────────────────────────────────────

  const evaluatePolicy: Harness['policy'] = async (plan: Plan): Promise<PolicyDecision> => {
    const span = tracer.startSpan('harness.policy.evaluate', {
      attributes: {
        'harness.tool_name': plan.toolName,
        'harness.mode': plan.mode,
        'harness.plan_id': plan.planId,
        'harness.tenant_id': plan.tenantId,
      },
    });

    try {
      // Audit: plan.created (written here, on first policy call, because plan()
      // is pure / sync and cannot perform I/O itself)
      const entryId = randomUUID();
      await audit.append({
        entryId,
        tenantId: plan.tenantId,
        eventType: 'plan.created',
        planId: plan.planId,
        traceId: plan.traceId,
        actorId: plan.actorId,
        toolName: plan.toolName,
        toolVersion: plan.toolVersion,
        mode: plan.mode,
        idempotencyKey: plan.idempotencyKey,
        recordedAt: new Date().toISOString(),
      });

      let decision: PolicyDecision;
      try {
        decision = await policy.evaluate(plan);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'policy engine unreachable' });
        throw makeHarnessError('POLICY_UNREACHABLE', 'Policy engine threw unexpectedly', {
          trace_id: plan.traceId,
          tenant_id: plan.tenantId,
          tool_name: plan.toolName,
          mode: plan.mode,
          planId: plan.planId,
          cause: err,
        });
      }

      span.setAttributes({
        'harness.policy.outcome': decision.outcome,
        'harness.policy.tier': decision.tier,
        'harness.decision_id': decision.decisionId,
      });

      // Audit: policy.decided
      await audit.append({
        entryId: randomUUID(),
        tenantId: plan.tenantId,
        eventType: 'policy.decided',
        planId: plan.planId,
        traceId: plan.traceId,
        actorId: plan.actorId,
        toolName: plan.toolName,
        toolVersion: plan.toolVersion,
        mode: plan.mode,
        idempotencyKey: plan.idempotencyKey,
        recordedAt: new Date().toISOString(),
      });

      if (decision.outcome === 'deny') {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'POLICY_DENIED' });
        throw makeHarnessError('POLICY_DENIED', `Policy denied: ${decision.reason}`, {
          trace_id: plan.traceId,
          tenant_id: plan.tenantId,
          tool_name: plan.toolName,
          mode: plan.mode,
          planId: plan.planId,
          decisionId: decision.decisionId,
        });
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return decision;
    } finally {
      span.end();
    }
  };

  // ─── approve() ────────────────────────────────────────────────────────────

  const requestApproval: Harness['approve'] = async (
    plan: Plan,
    decision: PolicyDecision,
  ): Promise<Approval> => {
    const span = tracer.startSpan('harness.approval.wait', {
      attributes: {
        'harness.tool_name': plan.toolName,
        'harness.mode': plan.mode,
        'harness.plan_id': plan.planId,
        'harness.decision_id': decision.decisionId,
      },
    });

    try {
      const approval = await approvals.request(plan, decision);

      await audit.append({
        entryId: randomUUID(),
        tenantId: plan.tenantId,
        eventType: 'approval.requested',
        planId: plan.planId,
        traceId: plan.traceId,
        actorId: plan.actorId,
        toolName: plan.toolName,
        toolVersion: plan.toolVersion,
        mode: plan.mode,
        idempotencyKey: plan.idempotencyKey,
        recordedAt: new Date().toISOString(),
      });

      span.setAttribute('harness.approval.id', approval.approvalId);

      // Wait for the approval to be resolved.
      const defaultTimeoutMs = 24 * 60 * 60 * 1000; // 24 h per PRD § 5.3
      const resolved = await approvals.wait(approval.approvalId, { timeoutMs: defaultTimeoutMs });

      span.setAttribute('harness.approval.state', resolved.state);

      await audit.append({
        entryId: randomUUID(),
        tenantId: plan.tenantId,
        eventType: 'approval.decided',
        planId: plan.planId,
        traceId: plan.traceId,
        actorId: plan.actorId,
        toolName: plan.toolName,
        toolVersion: plan.toolVersion,
        mode: plan.mode,
        idempotencyKey: plan.idempotencyKey,
        recordedAt: new Date().toISOString(),
      });

      if (resolved.state === 'denied') {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'APPROVAL_DENIED' });
        throw makeHarnessError('APPROVAL_DENIED', 'Approval was denied by the approver(s)', {
          trace_id: plan.traceId,
          tenant_id: plan.tenantId,
          tool_name: plan.toolName,
          mode: plan.mode,
          planId: plan.planId,
          decisionId: decision.decisionId,
        });
      }

      if (resolved.state === 'expired' || resolved.state === 'cancelled') {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'APPROVAL_TIMEOUT' });
        throw makeHarnessError(
          'APPROVAL_TIMEOUT',
          `Approval ${resolved.state} before a decision was reached`,
          {
            trace_id: plan.traceId,
            tenant_id: plan.tenantId,
            tool_name: plan.toolName,
            mode: plan.mode,
            planId: plan.planId,
            decisionId: decision.decisionId,
          },
        );
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return resolved;
    } finally {
      span.end();
    }
  };

  // ─── execute() ────────────────────────────────────────────────────────────

  const executeEffect: Harness['execute'] = async <T>(
    plan: Plan,
    decision: PolicyDecision,
    effect: SideEffect<T>,
    opts?: { approval?: Approval },
  ): Promise<ExecuteResult<T>> => {
    const span = tracer.startSpan('harness.execute', {
      attributes: {
        'harness.tool_name': plan.toolName,
        'harness.mode': plan.mode,
        'harness.plan_id': plan.planId,
        'harness.idempotency_key': plan.idempotencyKey,
      },
    });

    try {
      // Guard: approved_execute requires either a matching Approval or the
      // decision outcome must be 'allow' (not 'require_approval').
      if (plan.mode === 'approved_execute') {
        if (decision.outcome === 'require_approval' && opts?.approval === undefined) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'missing approval' });
          throw makeHarnessError(
            'APPROVAL_DENIED',
            'approved_execute requires an Approval but none was provided',
            {
              trace_id: plan.traceId,
              tenant_id: plan.tenantId,
              tool_name: plan.toolName,
              mode: plan.mode,
              planId: plan.planId,
              decisionId: decision.decisionId,
            },
          );
        }
      }

      // Replay short-circuit (05-TECHNICAL-SPEC § 3.4.2)
      const cached = idempCache.get(plan.idempotencyKey);
      if (cached !== undefined) {
        span.setAttribute('harness.execute.replay', true);

        await audit.append({
          entryId: randomUUID(),
          tenantId: plan.tenantId,
          eventType: 'execute.replayed',
          planId: plan.planId,
          traceId: plan.traceId,
          actorId: plan.actorId,
          toolName: plan.toolName,
          toolVersion: plan.toolVersion,
          mode: plan.mode,
          idempotencyKey: plan.idempotencyKey,
          recordedAt: new Date().toISOString(),
          blobRef: cached.auditEntryId,
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return {
          outcome: 'replayed',
          idempotencyKey: plan.idempotencyKey,
          auditEntryId: cached.auditEntryId,
          value: cached.value as T,
          evidenceBundleRef: plan.traceId,
        };
      }

      // Audit: execute.started
      const startEntryId = randomUUID();
      await audit.append({
        entryId: startEntryId,
        tenantId: plan.tenantId,
        eventType: 'execute.started',
        planId: plan.planId,
        traceId: plan.traceId,
        actorId: plan.actorId,
        toolName: plan.toolName,
        toolVersion: plan.toolVersion,
        mode: plan.mode,
        idempotencyKey: plan.idempotencyKey,
        recordedAt: new Date().toISOString(),
      });

      let value: T;
      const approval = opts?.approval;
      const executeCtx: import('./types.js').ExecuteContext = approval !== undefined
        ? { plan, decision, approval, span }
        : { plan, decision, span };

      try {
        value = await effect(executeCtx);
      } catch (err) {
        // Audit: execute.failed
        await audit.append({
          entryId: randomUUID(),
          tenantId: plan.tenantId,
          eventType: 'execute.failed',
          planId: plan.planId,
          traceId: plan.traceId,
          actorId: plan.actorId,
          toolName: plan.toolName,
          toolVersion: plan.toolVersion,
          mode: plan.mode,
          idempotencyKey: plan.idempotencyKey,
          recordedAt: new Date().toISOString(),
        });

        // Surface GW-DBTransaction-ID duplicate as a typed HarnessError.
        if (isDbTransactionDuplicateError(err)) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'GW_DBTRANSACTION_DUPLICATE' });
          throw makeHarnessError(
            'GW_DBTRANSACTION_DUPLICATE',
            'Guidewire rejected GW-DBTransaction-ID as duplicate (AlreadyExecutedException) — ' +
              'harness cache missed the replay; forensic-only path',
            {
              trace_id: plan.traceId,
              tenant_id: plan.tenantId,
              tool_name: plan.toolName,
              mode: plan.mode,
              planId: plan.planId,
              cause: err,
            },
          );
        }

        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      }

      // Audit: execute.completed
      const completeEntryId = randomUUID();
      const completedEntry = await audit.append({
        entryId: completeEntryId,
        tenantId: plan.tenantId,
        eventType: 'execute.completed',
        planId: plan.planId,
        traceId: plan.traceId,
        actorId: plan.actorId,
        toolName: plan.toolName,
        toolVersion: plan.toolVersion,
        mode: plan.mode,
        idempotencyKey: plan.idempotencyKey,
        recordedAt: new Date().toISOString(),
      });

      const result: ExecuteResult<T> = {
        outcome: 'executed',
        idempotencyKey: plan.idempotencyKey,
        auditEntryId: completedEntry.entryId,
        value,
        evidenceBundleRef: plan.traceId,
      };

      // Cache for replay short-circuit (per-process; Postgres in production).
      idempCache.set(plan.idempotencyKey, result as ExecuteResult<unknown>);

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } finally {
      span.end();
    }
  };

  // ─── evidence() ───────────────────────────────────────────────────────────

  const buildEvidence: Harness['evidence'] = async (
    traceId: string,
    opts?: { includeSpans?: boolean },
  ): Promise<EvidenceBundle> => {
    const span = tracer.startSpan('harness.evidence.bundle', {
      attributes: {
        'harness.trace_id': traceId,
        'harness.tenant_id': profile.tenantId,
      },
    });
    try {
      const bundle = await evidence.build(traceId, opts);
      span.setStatus({ code: SpanStatusCode.OK });
      return bundle;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      span.end();
    }
  };

  // ─── rollback() ───────────────────────────────────────────────────────────

  const issueRollback: Harness['rollback'] = async (
    result: ExecuteResult<unknown>,
    opts: { humanInstruction: string; cautions?: readonly string[] },
  ): Promise<RollbackHint> => {
    const span = tracer.startSpan('harness.rollback.hint', {
      attributes: {
        'harness.audit_entry_id': result.auditEntryId,
        'harness.idempotency_key': result.idempotencyKey,
      },
    });

    try {
      const hintId = createHash('sha256')
        .update(`rollback:${result.auditEntryId}:${Date.now()}`)
        .digest('hex');

      const hint: RollbackHint = {
        hintId,
        planId: result.evidenceBundleRef,   // traceId used as planId reference
        auditEntryId: result.auditEntryId,
        humanInstruction: opts.humanInstruction,
        cautions: opts.cautions ?? [],
        issuedAt: new Date().toISOString(),
      };

      span.setStatus({ code: SpanStatusCode.OK });
      return hint;
    } finally {
      span.end();
    }
  };

  return {
    plan: buildPlan,
    policy: evaluatePolicy,
    approve: requestApproval,
    execute: executeEffect,
    evidence: buildEvidence,
    rollback: issueRollback,
  };
}

/**
 * Heuristic check for Guidewire AlreadyExecutedException on the effect error.
 * The real client-sdk wrapper will throw a typed error; the skeleton uses a
 * string-matching fallback so tests can exercise the path without a real
 * Guidewire tenant (per D-021 / NO MOCKS rule — the heuristic is not a mock,
 * it's the harness-layer detection pattern for a real error shape).
 */
function isDbTransactionDuplicateError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as Record<string, unknown>;
  return (
    e['code'] === 'GW_DBTRANSACTION_DUPLICATE' ||
    (typeof e['message'] === 'string' && e['message'].includes('AlreadyExecutedException'))
  );
}
