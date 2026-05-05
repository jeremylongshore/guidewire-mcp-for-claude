import { createHash } from 'node:crypto';
import type {
  Plan,
  PolicyDecision,
  PolicyOutcome,
  PolicyTier,
} from '@intentsolutions/guidewire-schemas';
import type { PolicyEngine } from '../types.js';

/**
 * Allow-rule shape for `InMemoryPolicyEngine`.
 * A rule matches when all specified predicates match the plan.
 */
export interface AllowRule {
  readonly toolName?: string;
  readonly mode?: Plan['mode'];
  readonly tenantId?: string;
}

/**
 * In-memory `PolicyEngine` for development and unit tests.
 *
 * Default behaviour per 02-PRD § 5.2 + 05-TECHNICAL-SPEC § 3.2:
 *   - `read_only`        → allow, tier_0_safe, no approval required
 *   - `draft_only`       → allow, tier_1_draft, no approval required
 *   - `approved_execute` → deny (tier_4_blocked) UNLESS an allow-rule matches,
 *                          in which case → require_approval, tier_2_low
 *
 * The OSS demo profile applies tier_4_blocked to every `approved_execute` tool
 * by default (02-PRD § 4.3 / 05-TECHNICAL-SPEC § 3.2). An operator forking the
 * profile and adding allow-rules is the only path out.
 *
 * Real policy engine (profile-loaded rules + tier matrix) is a subsequent bead.
 */
export function createInMemoryPolicyEngine(opts?: {
  /** Explicit allow-rules for approved_execute tools. */
  readonly allowRules?: readonly AllowRule[];
  /** Fixed ruleSetVersion stamped onto every decision. */
  readonly ruleSetVersion?: string;
}): PolicyEngine {
  const allowRules = opts?.allowRules ?? [];
  const ruleSetVersion = opts?.ruleSetVersion ?? 'in-memory-v0.1';

  function matchesRule(plan: Plan, rule: AllowRule): boolean {
    if (rule.toolName !== undefined && rule.toolName !== plan.toolName) return false;
    if (rule.mode !== undefined && rule.mode !== plan.mode) return false;
    if (rule.tenantId !== undefined && rule.tenantId !== plan.tenantId) return false;
    return true;
  }

  const evaluate = async (plan: Plan): Promise<PolicyDecision> => {
    const evaluatedAt = new Date().toISOString();
    const decisionId = createHash('sha256')
      .update(`${plan.planId}:${ruleSetVersion}`)
      .digest('hex');

    // read_only → always allow, tier_0_safe
    if (plan.mode === 'read_only') {
      return {
        decisionId,
        planId: plan.planId,
        outcome: 'allow',
        tier: 'tier_0_safe',
        reason: 'read_only tools are always allowed (no side effects)',
        ruleSetVersion,
        evaluatedAt,
      };
    }

    // draft_only → allow, tier_1_draft, no approval
    if (plan.mode === 'draft_only') {
      return {
        decisionId,
        planId: plan.planId,
        outcome: 'allow',
        tier: 'tier_1_draft',
        reason: 'draft_only tools produce draft artifacts; no approval required',
        ruleSetVersion,
        evaluatedAt,
      };
    }

    // approved_execute → deny unless an allow-rule matches
    const matched = allowRules.some((rule) => matchesRule(plan, rule));
    if (!matched) {
      return {
        decisionId,
        planId: plan.planId,
        outcome: 'deny',
        tier: 'tier_4_blocked',
        reason:
          'approved_execute tools are blocked by default in the in-memory policy engine; ' +
          'add an allow-rule at construction time to enable (OSS demo mode, 02-PRD § 4.3)',
        ruleSetVersion,
        evaluatedAt,
      };
    }

    // Matched an allow-rule → require_approval, tier_2_low
    return {
      decisionId,
      planId: plan.planId,
      outcome: 'require_approval',
      tier: 'tier_2_low',
      reason: 'approved_execute tool matched an allow-rule; single-approver required',
      ruleSetVersion,
      evaluatedAt,
      requiredApprovers: {
        minCount: 1,
        rolesAllowed: ['underwriter', 'claims-manager', 'billing-supervisor', 'admin'],
      },
    };
  };

  return { evaluate };
}
