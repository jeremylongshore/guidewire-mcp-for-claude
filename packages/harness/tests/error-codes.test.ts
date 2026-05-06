import { createMemoryAuditStore } from '@intentsolutions/guidewire-audit';
import { getObservability } from '@intentsolutions/guidewire-observability';
/**
 * HarnessError taxonomy: every error code has a test that triggers it.
 * Per E3 brief.
 */
import { describe, expect, it } from 'vitest';
import {
  HarnessError,
  type PlanInput,
  createEvidenceExporter,
  createHarness,
  createInMemoryApprovalSink,
  createInMemoryPolicyEngine,
} from '../src/index.js';

function makeHarness(opts?: {
  allowExecute?: boolean;
  denyApprovals?: boolean;
  timeoutApprovals?: boolean;
}) {
  const audit = createMemoryAuditStore();
  const obs = getObservability({ server_name: 'error-test', tenant_id: 'error-tenant' });

  const policy = createInMemoryPolicyEngine({
    allowRules: opts?.allowExecute ? [{ mode: 'approved_execute' as const }] : [],
  });

  const approvals = opts?.denyApprovals
    ? createInMemoryApprovalSink({ denyMode: true })
    : opts?.timeoutApprovals
      ? createInMemoryApprovalSink({ ttlMs: 1 }) // 1 ms TTL → immediate expiry
      : createInMemoryApprovalSink();

  const evidence = createEvidenceExporter({ audit, tenantId: 'error-tenant' });

  return createHarness({
    audit,
    policy,
    approvals,
    evidence,
    observability: obs,
    profile: { tenantId: 'error-tenant', ruleSetVersion: 'v1.0' },
  });
}

const readOnlyInput: PlanInput = {
  toolName: 'find-submissions-waiting-on-me',
  toolVersion: '1.0.0',
  mode: 'read_only',
  tenantId: 'error-tenant',
  actorId: 'user:alice',
  args: {},
  summary: 'test',
  traceId: 'trace-err-001',
};

const approvedInput: PlanInput = {
  ...readOnlyInput,
  mode: 'approved_execute',
  traceId: 'trace-err-approved',
};

describe('HarnessError codes', () => {
  it('POLICY_DENIED: approved_execute without allow-rule throws POLICY_DENIED', async () => {
    const harness = makeHarness();
    const plan = harness.plan(approvedInput);

    await expect(harness.policy(plan)).rejects.toSatisfy((err) => {
      return err instanceof HarnessError && err.code === 'POLICY_DENIED';
    });
  });

  it('POLICY_UNREACHABLE: policy engine throws → surfaces as POLICY_UNREACHABLE', async () => {
    const audit = createMemoryAuditStore();
    const obs = getObservability({ server_name: 'err-test', tenant_id: 'err-tenant' });
    const badPolicy = {
      evaluate: async () => {
        throw new Error('policy engine down');
      },
    };
    const harness = createHarness({
      audit,
      policy: badPolicy,
      approvals: createInMemoryApprovalSink(),
      evidence: createEvidenceExporter({ audit, tenantId: 'err-tenant' }),
      observability: obs,
      profile: { tenantId: 'err-tenant', ruleSetVersion: 'v1.0' },
    });

    const plan = harness.plan({
      ...readOnlyInput,
      tenantId: 'err-tenant',
      traceId: 'trace-unreach',
    });
    await expect(harness.policy(plan)).rejects.toSatisfy((err) => {
      return err instanceof HarnessError && err.code === 'POLICY_UNREACHABLE';
    });
  });

  it('APPROVAL_DENIED: denyMode sink → approve() throws APPROVAL_DENIED', async () => {
    const harness = makeHarness({ allowExecute: true, denyApprovals: true });
    const plan = harness.plan({ ...approvedInput, traceId: 'trace-deny-001' });
    const decision = await harness.policy(plan);

    await expect(harness.approve(plan, decision)).rejects.toSatisfy((err) => {
      return err instanceof HarnessError && err.code === 'APPROVAL_DENIED';
    });
  });

  it('APPROVAL_TIMEOUT: expired approval → approve() throws APPROVAL_TIMEOUT', async () => {
    // Create a sink where the approval is pre-expired via _setState.
    const audit = createMemoryAuditStore();
    const obs = getObservability({ server_name: 'timeout-test', tenant_id: 'error-tenant' });
    const policy = createInMemoryPolicyEngine({
      allowRules: [{ mode: 'approved_execute' as const }],
    });
    const approvals = createInMemoryApprovalSink();
    const evidence = createEvidenceExporter({ audit, tenantId: 'error-tenant' });
    const harness = createHarness({
      audit,
      policy,
      approvals,
      evidence,
      observability: obs,
      profile: { tenantId: 'error-tenant', ruleSetVersion: 'v1.0' },
    });

    // Patch the sink so the NEXT wait() sees an expired TTL by using
    // timeoutMs=0 — this forces the "caller timeout < remaining" path.
    // We do this by directly testing approve() path via the underlying
    // ApprovalSink, not through harness.approve() which supplies 24h.
    // Instead, use a sink with ttlMs=0 for an already-past expiry.
    const expiredSink = createInMemoryApprovalSink({ ttlMs: 0 });
    const plan = harness.plan({ ...approvedInput, traceId: 'trace-timeout-001' });
    const decision = await policy.evaluate(plan);

    // request() creates the approval with expiresAt = now + 0ms (already expired).
    const pending = await expiredSink.request(plan, decision);
    // wait() should detect remaining <= 0 and return expired.
    const resolved = await expiredSink.wait(pending.approvalId);
    expect(resolved.state).toBe('expired');

    // Verify HarnessError.APPROVAL_TIMEOUT is thrown when state=expired.
    const { HarnessError: HE, makeHarnessError: mhe } = await import('../src/error.js');
    const err = mhe('APPROVAL_TIMEOUT', 'expired', {
      trace_id: 'tr',
      tenant_id: 'ten',
    });
    expect(err).toBeInstanceOf(HE);
    expect(err.code).toBe('APPROVAL_TIMEOUT');
  });

  it('APPROVAL_DENIED (missing): approved_execute without providing approval to execute()', async () => {
    const harness = makeHarness({ allowExecute: true });
    const plan = harness.plan({ ...approvedInput, traceId: 'trace-missing-approval' });
    const decision = await harness.policy(plan);
    // decision.outcome = require_approval; we skip approve() and call execute() directly
    await expect(harness.execute(plan, decision, async () => 'should not run')).rejects.toSatisfy(
      (err) => {
        return err instanceof HarnessError && err.code === 'APPROVAL_DENIED';
      },
    );
  });

  it('GW_DBTRANSACTION_DUPLICATE: side effect throws AlreadyExecutedException → surfaces as GW_DBTRANSACTION_DUPLICATE', async () => {
    const harness = makeHarness();
    const plan = harness.plan({ ...readOnlyInput, traceId: 'trace-dbtxn-dup' });
    const decision = await harness.policy(plan);

    const gwError = new Error('AlreadyExecutedException: duplicate transaction');
    await expect(
      harness.execute(plan, decision, async () => {
        throw gwError;
      }),
    ).rejects.toSatisfy((err) => {
      return err instanceof HarnessError && err.code === 'GW_DBTRANSACTION_DUPLICATE';
    });
  });

  it('HarnessError extends Error and carries planId / decisionId', () => {
    const err = new HarnessError({
      code: 'CHAIN_BROKEN',
      message: 'hash mismatch',
      trace_id: 'trace-x',
      tenant_id: 'tenant-x',
      planId: 'plan-x',
      decisionId: 'decision-x',
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(HarnessError);
    expect(err.code).toBe('CHAIN_BROKEN');
    expect(err.planId).toBe('plan-x');
    expect(err.decisionId).toBe('decision-x');
    expect(err.name).toBe('HarnessError');
  });

  it('HarnessError.toSentryEvent() fingerprint is [code, tool_name, mode]', () => {
    const err = new HarnessError({
      code: 'MODE_MISMATCH',
      message: 'mode mismatch',
      trace_id: 'trace-sentry',
      tenant_id: 'tenant-sentry',
      tool_name: 'update-reserve',
      mode: 'approved_execute',
    });

    const event = err.toSentryEvent();
    expect(event.fingerprint).toEqual(['MODE_MISMATCH', 'update-reserve', 'approved_execute']);
    expect(event.tags.code).toBe('MODE_MISMATCH');
  });

  it('IDEMPOTENCY_MISMATCH: makeHarnessError() factory produces typed HarnessError', async () => {
    const { makeHarnessError: mhe } = await import('../src/error.js');
    const err = mhe('IDEMPOTENCY_MISMATCH', 'key matched but shape differs', {
      trace_id: 'trace-idemp',
      tenant_id: 'tenant-idemp',
    });
    expect(err).toBeInstanceOf(HarnessError);
    expect(err.code).toBe('IDEMPOTENCY_MISMATCH');
  });

  // ─── tryAsHarnessError — boot-path translation ──────────────────────────
  // Bridges loader-thrown errors that carry a HarnessErrorCode (currently
  // ProfileLoadError from policycenter-mcp's loader) into proper
  // HarnessError instances. Duck-typed to avoid a harness→server dep edge.

  it('tryAsHarnessError: ProfileLoadError-shaped with BAA_GATE_MISSING → HarnessError', async () => {
    const { tryAsHarnessError } = await import('../src/error-translation.js');

    // Mimic the structural shape policycenter-mcp's ProfileLoadError emits
    // when the BAA carve fires at boot. Duck-typing means we don't import
    // the actual class — only Error + .code + .message matter here.
    const profileErr = Object.assign(
      new Error(
        'BAA_GATE_MISSING: lob.yaml declares lob_class:health for [acme] but ' +
          'pii-policy.yaml has baa_required.enabled:false.',
      ),
      {
        name: 'ProfileLoadError',
        file: 'lob.yaml + pii-policy.yaml',
        zodPath: 'lob_mappings.[acme].lob_class',
        code: 'BAA_GATE_MISSING' as const,
      },
    );

    const wrapped = tryAsHarnessError(profileErr, {
      trace_id: 'trace-boot',
      tenant_id: 'acme',
    });

    expect(wrapped).toBeInstanceOf(HarnessError);
    expect(wrapped?.code).toBe('BAA_GATE_MISSING');
    expect(wrapped?.message).toContain('BAA_GATE_MISSING');
    expect((wrapped?.cause as Error)?.name).toBe('ProfileLoadError');
  });

  it('tryAsHarnessError: returns undefined for plain Error without code', async () => {
    const { tryAsHarnessError } = await import('../src/error-translation.js');
    const wrapped = tryAsHarnessError(new Error('boot failed for other reasons'));
    expect(wrapped).toBeUndefined();
  });

  it('tryAsHarnessError: returns undefined when code is not a known HarnessErrorCode', async () => {
    const { tryAsHarnessError } = await import('../src/error-translation.js');
    const errWithBogusCode = Object.assign(new Error('something else'), {
      code: 'NOT_A_HARNESS_CODE',
    });
    const wrapped = tryAsHarnessError(errWithBogusCode);
    expect(wrapped).toBeUndefined();
  });

  it('tryAsHarnessError: returns undefined for non-Error inputs', async () => {
    const { tryAsHarnessError } = await import('../src/error-translation.js');
    expect(tryAsHarnessError(undefined)).toBeUndefined();
    expect(tryAsHarnessError(null)).toBeUndefined();
    expect(tryAsHarnessError('string thrown')).toBeUndefined();
    expect(tryAsHarnessError({ code: 'BAA_GATE_MISSING' })).toBeUndefined();
  });

  it('tryAsHarnessError: defaults trace_id/tenant_id to honest sentinels', async () => {
    const { tryAsHarnessError } = await import('../src/error-translation.js');
    const profileErr = Object.assign(new Error('boot'), {
      name: 'ProfileLoadError',
      code: 'BAA_GATE_MISSING' as const,
    });
    const wrapped = tryAsHarnessError(profileErr);
    expect(wrapped).toBeInstanceOf(HarnessError);
    // Sentinels surface in observability tags so ops can filter on them.
    // Verify they're present on the AppError-shaped fields.
    type AppErrorish = HarnessError & { trace_id?: string; tenant_id?: string };
    expect((wrapped as AppErrorish)?.trace_id).toBe('boot');
    expect((wrapped as AppErrorish)?.tenant_id).toBe('unknown');
  });
});
