/**
 * InMemoryPolicyEngine unit tests.
 * Per E3 brief: read_only allowed, approved_execute denied without allow-rule,
 * allow-rule honored.
 */
import { describe, expect, it } from 'vitest';
import type { Plan } from '../src/index.js';
import { createInMemoryPolicyEngine } from '../src/policy/in-memory.js';

function makePlan(overrides: Partial<Plan> = {}): Plan {
  const zero = '0'.repeat(64);
  return {
    toolName: 'find-submissions-waiting-on-me',
    toolVersion: '1.0.0',
    mode: 'read_only',
    tenantId: 'carrier-acme',
    actorId: 'user:alice',
    args: {},
    summary: 'test plan',
    traceId: 'trace-policy-test',
    planId: zero,
    createdAt: new Date().toISOString(),
    idempotencyKey: `gwh1:${zero}`,
    wire: { dbTransactionId: zero },
    ...overrides,
  };
}

describe('InMemoryPolicyEngine', () => {
  it('read_only → outcome=allow, tier=tier_0_safe', async () => {
    const engine = createInMemoryPolicyEngine();
    const plan = makePlan({ mode: 'read_only' });
    const decision = await engine.evaluate(plan);

    expect(decision.outcome).toBe('allow');
    expect(decision.tier).toBe('tier_0_safe');
    expect(decision.planId).toBe(plan.planId);
    expect(decision.requiredApprovers).toBeUndefined();
  });

  it('draft_only → outcome=allow, tier=tier_1_draft, no approval required', async () => {
    const engine = createInMemoryPolicyEngine();
    const plan = makePlan({ mode: 'draft_only' });
    const decision = await engine.evaluate(plan);

    expect(decision.outcome).toBe('allow');
    expect(decision.tier).toBe('tier_1_draft');
    expect(decision.requiredApprovers).toBeUndefined();
  });

  it('approved_execute without allow-rule → outcome=deny, tier=tier_4_blocked', async () => {
    const engine = createInMemoryPolicyEngine();
    const plan = makePlan({ mode: 'approved_execute' });
    const decision = await engine.evaluate(plan);

    expect(decision.outcome).toBe('deny');
    expect(decision.tier).toBe('tier_4_blocked');
    expect(decision.reason).toMatch(/blocked by default/);
  });

  it('approved_execute with matching allow-rule → outcome=require_approval, tier=tier_2_low', async () => {
    const engine = createInMemoryPolicyEngine({
      allowRules: [{ toolName: 'find-submissions-waiting-on-me', mode: 'approved_execute' }],
    });
    const plan = makePlan({ mode: 'approved_execute' });
    const decision = await engine.evaluate(plan);

    expect(decision.outcome).toBe('require_approval');
    expect(decision.tier).toBe('tier_2_low');
    expect(decision.requiredApprovers?.minCount).toBe(1);
  });

  it('allow-rule with tenantId does not match a different tenant', async () => {
    const engine = createInMemoryPolicyEngine({
      allowRules: [{ tenantId: 'other-tenant' }],
    });
    const plan = makePlan({ mode: 'approved_execute', tenantId: 'carrier-acme' });
    const decision = await engine.evaluate(plan);

    expect(decision.outcome).toBe('deny');
  });

  it('allow-rule with matching tenantId grants require_approval', async () => {
    const engine = createInMemoryPolicyEngine({
      allowRules: [{ tenantId: 'carrier-acme' }],
    });
    const plan = makePlan({ mode: 'approved_execute', tenantId: 'carrier-acme' });
    const decision = await engine.evaluate(plan);

    expect(decision.outcome).toBe('require_approval');
  });

  it('decisionId is deterministic sha256(planId:ruleSetVersion)', async () => {
    const engine = createInMemoryPolicyEngine({ ruleSetVersion: 'test-v1' });
    const plan = makePlan({ mode: 'read_only' });
    const d1 = await engine.evaluate(plan);
    const d2 = await engine.evaluate(plan);

    expect(d1.decisionId).toBe(d2.decisionId);
    expect(d1.ruleSetVersion).toBe('test-v1');
  });
});
