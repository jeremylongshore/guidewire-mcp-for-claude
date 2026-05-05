import { z } from 'zod';

/**
 * Policy gate decision per 02-PRD § 5.2. The harness refuses to call
 * `execute()` without a `PolicyDecision` whose outcome is `allow` (or
 * `require_approval` paired with an attached `Approval`) — D-006.
 */
export const PolicyOutcomeSchema = z.enum(['allow', 'deny', 'require_approval']);
export type PolicyOutcome = z.infer<typeof PolicyOutcomeSchema>;

/**
 * Tier ladder: tier_4 is the structural refusal (e.g. payments in OSS demo).
 * tier_3 is dual control (payments). The OSS demo profile applies tier_4 to
 * every approved_execute tool by default per 02-PRD § 4.3.
 */
export const PolicyTierSchema = z.enum([
  'tier_0_safe',
  'tier_1_draft',
  'tier_2_low',
  'tier_3_high',
  'tier_4_blocked',
]);
export type PolicyTier = z.infer<typeof PolicyTierSchema>;

export const PolicyDecisionSchema = z
  .object({
    decisionId: z.string().min(1),
    planId: z.string().min(1),
    outcome: PolicyOutcomeSchema,
    tier: PolicyTierSchema,
    reason: z.string(),
    ruleSetVersion: z.string().min(1),
    evaluatedAt: z.string().datetime(),
    requiredApprovers: z
      .object({
        minCount: z.number().int().positive(),
        rolesAllowed: z.array(z.string()).readonly(),
      })
      .optional(),
  })
  .readonly();
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
