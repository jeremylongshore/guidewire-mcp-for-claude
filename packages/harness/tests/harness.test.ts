import { createMemoryAuditStore } from '@intentsolutions/guidewire-audit';
import { getObservability } from '@intentsolutions/guidewire-observability';
/**
 * Happy-path integration test: plan → policy(allow) → execute → audit → evidence.
 * Asserts that the audit chain has all expected entry types for a read_only tool,
 * and that the evidence bundle reconstructs correctly.
 *
 * Per skeleton scope in E3 brief.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  type PlanInput,
  createEvidenceExporter,
  createHarness,
  createInMemoryApprovalSink,
  createInMemoryPolicyEngine,
} from '../src/index.js';

function makeTestObservability() {
  return getObservability({
    server_name: 'harness-test',
    tenant_id: 'test-tenant',
  });
}

function makeTestHarness() {
  const audit = createMemoryAuditStore();
  const obs = makeTestObservability();
  const policy = createInMemoryPolicyEngine();
  const approvals = createInMemoryApprovalSink();
  const evidence = createEvidenceExporter({ audit, tenantId: 'test-tenant' });

  const harness = createHarness({
    audit,
    policy,
    approvals,
    evidence,
    observability: obs,
    profile: { tenantId: 'test-tenant', ruleSetVersion: 'v1.0' },
  });

  return { harness, audit };
}

const baseInput: PlanInput = {
  toolName: 'find-submissions-waiting-on-me',
  toolVersion: '1.0.0',
  mode: 'read_only',
  tenantId: 'test-tenant',
  actorId: 'user:underwriter-alice',
  args: { assignedTo: 'alice' },
  summary: 'List open submissions assigned to Alice',
  traceId: 'trace-001',
};

describe('createHarness() — happy path (read_only)', () => {
  it('plan() derives stable planId and idempotencyKey', () => {
    const { harness } = makeTestHarness();
    const plan = harness.plan(baseInput);

    expect(plan.planId).toMatch(/^[0-9a-f]{64}$/);
    expect(plan.idempotencyKey).toMatch(/^gwh1:[0-9a-f]{64}$/);
    expect(plan.wire.dbTransactionId).toMatch(/^[0-9a-f]{64}$/);
    expect(plan.wire.dbTransactionId).not.toBe(plan.idempotencyKey);
    expect(plan.toolName).toBe('find-submissions-waiting-on-me');
    expect(plan.mode).toBe('read_only');
  });

  it('plan() is deterministic — same input produces same planId', () => {
    const { harness } = makeTestHarness();
    const p1 = harness.plan(baseInput);
    const p2 = harness.plan(baseInput);
    expect(p1.planId).toBe(p2.planId);
    expect(p1.idempotencyKey).toBe(p2.idempotencyKey);
  });

  it('policy() writes plan.created + policy.decided audit entries and returns allow', async () => {
    const { harness, audit } = makeTestHarness();
    const plan = harness.plan(baseInput);
    const decision = await harness.policy(plan);

    expect(decision.outcome).toBe('allow');
    expect(decision.tier).toBe('tier_0_safe');
    expect(decision.planId).toBe(plan.planId);

    // Verify audit chain has both entries.
    const entries: string[] = [];
    for await (const e of audit.query({ tenantId: 'test-tenant' })) {
      entries.push(e.eventType);
    }
    expect(entries).toContain('plan.created');
    expect(entries).toContain('policy.decided');
  });

  it('execute() runs the side effect and writes execute.started + execute.completed', async () => {
    const { harness, audit } = makeTestHarness();
    const plan = harness.plan(baseInput);
    const decision = await harness.policy(plan);

    let effectCalled = false;
    const result = await harness.execute(plan, decision, async (_ctx) => {
      effectCalled = true;
      return { submissions: [] };
    });

    expect(effectCalled).toBe(true);
    expect(result.outcome).toBe('executed');
    expect(result.value).toEqual({ submissions: [] });

    const events: string[] = [];
    for await (const e of audit.query({ tenantId: 'test-tenant' })) {
      events.push(e.eventType);
    }
    expect(events).toContain('execute.started');
    expect(events).toContain('execute.completed');
  });

  it('evidence() returns a bundle containing all expected event types', async () => {
    const { harness } = makeTestHarness();
    const plan = harness.plan({ ...baseInput, traceId: 'trace-evidence-001' });
    const decision = await harness.policy(plan);
    await harness.execute(plan, decision, async () => ({ ok: true }));

    const bundle = await harness.evidence('trace-evidence-001');

    expect(bundle.bundleVersion).toBe('1.0');
    expect(bundle.traceId).toBe('trace-evidence-001');
    expect(bundle.tenantId).toBe('test-tenant');
    expect(bundle.piiRedactionApplied).toBe(false);
    expect(bundle.chainVerification.valid).toBe(true);

    const events = bundle.auditEntries.map((e) => e.eventType);
    expect(events).toContain('plan.created');
    expect(events).toContain('policy.decided');
    expect(events).toContain('execute.started');
    expect(events).toContain('execute.completed');
  });

  it('full pipeline produces a valid chain (verifyChain returns valid=true)', async () => {
    const { harness, audit } = makeTestHarness();
    const plan = harness.plan({ ...baseInput, traceId: 'trace-chain-001' });
    const decision = await harness.policy(plan);
    await harness.execute(plan, decision, async () => 42);

    const chain = await audit.verifyChain('test-tenant');
    expect(chain.valid).toBe(true);
    expect(chain.toSeq).toBeGreaterThan(0);
  });
});
