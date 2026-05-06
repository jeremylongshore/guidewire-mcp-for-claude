import { createMemoryAuditStore } from '@intentsolutions/guidewire-audit';
import { getObservability } from '@intentsolutions/guidewire-observability';
/**
 * Evidence exporter tests.
 * Asserts that evidence().build(traceId) produces an EvidenceBundle with the
 * expected shape per 02-PRD § 5.7 + 05-TECHNICAL-SPEC § 3.7.
 */
import { describe, expect, it } from 'vitest';
import {
  type PlanInput,
  createEvidenceExporter,
  createHarness,
  createInMemoryApprovalSink,
  createInMemoryPolicyEngine,
} from '../src/index.js';

function makeTestStack(traceId: string) {
  const audit = createMemoryAuditStore();
  const obs = getObservability({ server_name: 'evidence-test', tenant_id: 'acme' });
  const policy = createInMemoryPolicyEngine();
  const approvals = createInMemoryApprovalSink();
  const evidence = createEvidenceExporter({ audit, tenantId: 'acme' });
  const harness = createHarness({
    audit,
    policy,
    approvals,
    evidence,
    observability: obs,
    profile: { tenantId: 'acme', ruleSetVersion: 'v1.0' },
  });

  const input: PlanInput = {
    toolName: 'find-submissions-waiting-on-me',
    toolVersion: '1.0.0',
    mode: 'read_only',
    tenantId: 'acme',
    actorId: 'user:alice',
    args: { assignedTo: 'alice' },
    summary: 'evidence test',
    traceId,
  };

  return { harness, audit, evidence, input };
}

describe('EvidenceExporter', () => {
  it('build() for unknown traceId returns a valid minimal bundle (empty chain)', async () => {
    const { evidence } = makeTestStack('unknown-trace');
    const bundle = await evidence.build('unknown-trace');

    expect(bundle.bundleVersion).toBe('1.0');
    expect(bundle.traceId).toBe('unknown-trace');
    expect(bundle.tenantId).toBe('acme');
    expect(bundle.auditEntries).toHaveLength(0);
    expect(bundle.chainVerification.valid).toBe(true);
    expect(bundle.piiRedactionApplied).toBe(false);
  });

  it('build() after full pipeline contains all four event types for the traceId', async () => {
    const traceId = 'trace-ev-full';
    const { harness, evidence, input } = makeTestStack(traceId);

    const plan = harness.plan(input);
    const decision = await harness.policy(plan);
    await harness.execute(plan, decision, async () => ({ ok: true }));

    const bundle = await evidence.build(traceId);
    const events = bundle.auditEntries.map((e) => e.eventType);

    expect(events).toContain('plan.created');
    expect(events).toContain('policy.decided');
    expect(events).toContain('execute.started');
    expect(events).toContain('execute.completed');
  });

  it('build() filters to the requested traceId (other traces do not bleed in)', async () => {
    const { harness, evidence, input } = makeTestStack('trace-filter-a');

    // Run two traces against the same stack.
    const planA = harness.plan({ ...input, traceId: 'trace-filter-a' });
    const decA = await harness.policy(planA);
    await harness.execute(planA, decA, async () => 'A');

    const planB = harness.plan({ ...input, traceId: 'trace-filter-b' });
    const decB = await harness.policy(planB);
    await harness.execute(planB, decB, async () => 'B');

    const bundleA = await evidence.build('trace-filter-a');
    for (const entry of bundleA.auditEntries) {
      expect(entry.traceId).toBe('trace-filter-a');
    }

    const bundleB = await evidence.build('trace-filter-b');
    for (const entry of bundleB.auditEntries) {
      expect(entry.traceId).toBe('trace-filter-b');
    }
  });

  it('build() with includeSpans=true returns spans array (stub returns empty)', async () => {
    const { evidence } = makeTestStack('trace-spans');
    const bundle = await evidence.build('trace-spans', { includeSpans: true });

    expect(Array.isArray(bundle.spans)).toBe(true);
    // Skeleton: span collection is E3+ follow-up; stub returns empty.
    expect(bundle.spans).toHaveLength(0);
  });

  it('chainVerification is included and valid in the bundle', async () => {
    const traceId = 'trace-ev-chain';
    const { harness, evidence, input } = makeTestStack(traceId);

    const plan = harness.plan(input);
    const decision = await harness.policy(plan);
    await harness.execute(plan, decision, async () => null);

    const bundle = await evidence.build(traceId);
    expect(bundle.chainVerification).toBeDefined();
    expect(bundle.chainVerification.valid).toBe(true);
    expect(bundle.chainVerification.tenantId).toBe('acme');
  });
});
