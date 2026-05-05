/**
 * Idempotency replay short-circuit tests.
 * Per E3 brief: same idempotency key returns cached result without re-running
 * the callback. Execute.replayed audit entry written on replay.
 */
import { describe, it, expect } from 'vitest';
import { createMemoryAuditStore } from '@intentsolutions/guidewire-audit';
import { getObservability } from '@intentsolutions/guidewire-observability';
import {
  createHarness,
  createInMemoryPolicyEngine,
  createInMemoryApprovalSink,
  createEvidenceExporter,
  type PlanInput,
} from '../src/index.js';

function makeStack() {
  const audit = createMemoryAuditStore();
  const obs = getObservability({ server_name: 'idemp-test', tenant_id: 'acme' });
  const policy = createInMemoryPolicyEngine();
  const approvals = createInMemoryApprovalSink();
  const evidence = createEvidenceExporter({ audit, tenantId: 'acme' });
  const harness = createHarness({
    audit, policy, approvals, evidence, observability: obs,
    profile: { tenantId: 'acme', ruleSetVersion: 'v1.0' },
  });
  return { harness, audit };
}

const baseInput: PlanInput = {
  toolName: 'find-submissions-waiting-on-me',
  toolVersion: '1.0.0',
  mode: 'read_only',
  tenantId: 'acme',
  actorId: 'user:alice',
  args: { assignedTo: 'alice' },
  summary: 'idempotency test',
  traceId: 'trace-idemp-001',
};

describe('Idempotency replay short-circuit', () => {
  it('same idempotencyKey returns cached result without re-running the callback', async () => {
    const { harness } = makeStack();

    let callCount = 0;
    const effect = async () => {
      callCount++;
      return { submissions: ['SUB-001'] };
    };

    const plan = harness.plan(baseInput);
    const decision = await harness.policy(plan);

    // First call — should execute.
    const result1 = await harness.execute(plan, decision, effect);
    expect(result1.outcome).toBe('executed');
    expect(callCount).toBe(1);

    // Second call with the SAME plan (same idempotencyKey) — should replay.
    const result2 = await harness.execute(plan, decision, effect);
    expect(result2.outcome).toBe('replayed');
    expect(callCount).toBe(1);  // effect must NOT have been called again
    expect(result2.value).toEqual({ submissions: ['SUB-001'] });
    expect(result2.idempotencyKey).toBe(result1.idempotencyKey);
  });

  it('replayed result has the same value as the original executed result', async () => {
    const { harness } = makeStack();
    const returnValue = { policies: [{ id: 'POL-999' }] };

    const plan = harness.plan({ ...baseInput, traceId: 'trace-idemp-002' });
    const decision = await harness.policy(plan);

    const r1 = await harness.execute(plan, decision, async () => returnValue);
    const r2 = await harness.execute(plan, decision, async () => ({ policies: [] }));

    expect(r2.value).toEqual(returnValue);  // original, not the replacement
    expect(r2.outcome).toBe('replayed');
  });

  it('execute.replayed audit entry is written on replay', async () => {
    const { harness, audit } = makeStack();

    const plan = harness.plan({ ...baseInput, traceId: 'trace-idemp-003' });
    const decision = await harness.policy(plan);

    await harness.execute(plan, decision, async () => 'first');
    await harness.execute(plan, decision, async () => 'second');

    const events: string[] = [];
    for await (const e of audit.query({ tenantId: 'acme' })) {
      events.push(e.eventType);
    }

    expect(events).toContain('execute.completed');
    expect(events).toContain('execute.replayed');
  });

  it('different actorId produces a different idempotencyKey (no cross-actor replay)', () => {
    const { harness } = makeStack();

    const p1 = harness.plan({ ...baseInput, actorId: 'user:alice' });
    const p2 = harness.plan({ ...baseInput, actorId: 'user:bob' });

    expect(p1.idempotencyKey).not.toBe(p2.idempotencyKey);
  });

  it('different toolVersion produces a different idempotencyKey (contract boundary)', () => {
    const { harness } = makeStack();

    const p1 = harness.plan({ ...baseInput, toolVersion: '1.0.0' });
    const p2 = harness.plan({ ...baseInput, toolVersion: '2.0.0' });

    expect(p1.idempotencyKey).not.toBe(p2.idempotencyKey);
  });

  it('args with different key order produce the same idempotencyKey (JCS canonical)', () => {
    const { harness } = makeStack();

    const p1 = harness.plan({ ...baseInput, args: { b: 2, a: 1 } });
    const p2 = harness.plan({ ...baseInput, args: { a: 1, b: 2 } });

    expect(p1.idempotencyKey).toBe(p2.idempotencyKey);
  });
});
