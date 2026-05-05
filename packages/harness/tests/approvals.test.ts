/**
 * InMemoryApprovalSink unit tests.
 * Per E3 brief: auto-approve, timeout/expired, deny paths.
 */
import { describe, it, expect } from 'vitest';
import { createInMemoryApprovalSink } from '../src/approvals/in-memory.js';
import type { Plan, PolicyDecision } from '../src/index.js';

function makePlan(traceId = 'trace-approval-test'): Plan {
  const zero = '0'.repeat(64);
  return {
    toolName: 'update-reserve',
    toolVersion: '1.0.0',
    mode: 'approved_execute',
    tenantId: 'carrier-acme',
    actorId: 'user:claims-manager',
    args: { claimId: 'CLM-001', amount: 5000 },
    summary: 'Update reserve for CLM-001',
    traceId,
    planId: zero,
    createdAt: new Date().toISOString(),
    idempotencyKey: `gwh1:${zero}`,
    wire: { dbTransactionId: zero },
  };
}

function makeDecision(): PolicyDecision {
  return {
    decisionId: '1'.repeat(64),
    planId: '0'.repeat(64),
    outcome: 'require_approval',
    tier: 'tier_2_low',
    reason: 'single approver required',
    ruleSetVersion: 'v1.0',
    evaluatedAt: new Date().toISOString(),
    requiredApprovers: { minCount: 1, rolesAllowed: ['claims-manager'] },
  };
}

describe('InMemoryApprovalSink', () => {
  it('request() creates a pending approval with correct planId and decisionId', async () => {
    const sink = createInMemoryApprovalSink();
    const plan = makePlan();
    const decision = makeDecision();

    const approval = await sink.request(plan, decision);

    expect(approval.state).toBe('pending');
    expect(approval.planId).toBe(plan.planId);
    expect(approval.decisionId).toBe(decision.decisionId);
    expect(approval.approvalId).toMatch(/^[0-9a-f]{64}$/);
    expect(approval.approvers).toHaveLength(0);
  });

  it('wait() auto-approves in default mode', async () => {
    const sink = createInMemoryApprovalSink();
    const plan = makePlan();
    const decision = makeDecision();

    const pending = await sink.request(plan, decision);
    const resolved = await sink.wait(pending.approvalId);

    expect(resolved.state).toBe('approved');
    expect(resolved.approvers).toHaveLength(1);
    expect(resolved.approvers[0]?.outcome).toBe('approved');
    expect(resolved.approvers[0]?.actorId).toBe('system:in-memory-auto');
  });

  it('wait() auto-denies in denyMode=true', async () => {
    const sink = createInMemoryApprovalSink({ denyMode: true });
    const plan = makePlan();
    const decision = makeDecision();

    const pending = await sink.request(plan, decision);
    const resolved = await sink.wait(pending.approvalId);

    expect(resolved.state).toBe('denied');
    expect(resolved.approvers[0]?.outcome).toBe('denied');
  });

  it('wait() returns expired when caller timeoutMs < remaining TTL', async () => {
    // TTL is 24 h — caller passes timeoutMs=0 to force timeout path.
    const sink = createInMemoryApprovalSink();
    const plan = makePlan();
    const decision = makeDecision();

    const pending = await sink.request(plan, decision);
    const resolved = await sink.wait(pending.approvalId, { timeoutMs: 0 });

    expect(resolved.state).toBe('expired');
  });

  it('decide() records a manual vote and updates state', async () => {
    const sink = createInMemoryApprovalSink();
    const plan = makePlan();
    const decision = makeDecision();

    const pending = await sink.request(plan, decision);
    const voted = await sink.decide(pending.approvalId, {
      actorId: 'user:supervisor-bob',
      role: 'claims-manager',
      outcome: 'approved',
      reason: 'reserve increase justified by adjuster notes',
    });

    expect(voted.state).toBe('approved');
    expect(voted.approvers).toHaveLength(1);
    expect(voted.approvers[0]?.actorId).toBe('user:supervisor-bob');
    expect(voted.approvers[0]?.reason).toBe('reserve increase justified by adjuster notes');
  });

  it('_setState test helper sets state directly', async () => {
    const sink = createInMemoryApprovalSink();
    const plan = makePlan();
    const decision = makeDecision();

    const pending = await sink.request(plan, decision);
    sink._setState(pending.approvalId, 'cancelled');

    // wait() should return immediately for an already-decided state.
    const resolved = await sink.wait(pending.approvalId);
    expect(resolved.state).toBe('cancelled');
  });

  it('wait() returns immediately if approval was previously decided', async () => {
    const sink = createInMemoryApprovalSink();
    const plan = makePlan();
    const decision = makeDecision();

    const pending = await sink.request(plan, decision);
    await sink.decide(pending.approvalId, {
      actorId: 'user:alice',
      role: 'admin',
      outcome: 'approved',
    });

    // Second wait() should return the already-decided state immediately.
    const resolved = await sink.wait(pending.approvalId);
    expect(resolved.state).toBe('approved');
    // The vote from decide() is preserved; wait() should not add another.
    expect(resolved.approvers).toHaveLength(1);
    expect(resolved.approvers[0]?.actorId).toBe('user:alice');
  });
});
