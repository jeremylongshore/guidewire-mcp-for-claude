import { z } from 'zod';

/**
 * Approval state machine per 02-PRD § 5.3 + 009 § 3. Approvals persist in
 * the `approvals` Postgres table so a restart, network partition, or CLI
 * session ending mid-wait does not lose the request. No auto-approval bypass
 * — a missing approval is indistinguishable from a missing audit (D-006).
 */
export const ApprovalStateSchema = z.enum([
  'pending',
  'approved',
  'denied',
  'expired',
  'cancelled',
]);
export type ApprovalState = z.infer<typeof ApprovalStateSchema>;

export const ApproverVerdictSchema = z.enum(['approved', 'denied']);
export type ApproverVerdict = z.infer<typeof ApproverVerdictSchema>;

export const ApprovalVoteSchema = z.object({
  actorId: z.string().min(1),
  role: z.string().min(1),
  outcome: ApproverVerdictSchema,
  reason: z.string().optional(),
});
export type ApprovalVote = z.infer<typeof ApprovalVoteSchema>;

export const ApprovalSchema = z
  .object({
    approvalId: z.string().min(1),
    planId: z.string().min(1),
    decisionId: z.string().min(1),
    state: ApprovalStateSchema,
    requestedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    approvers: z
      .array(
        z.object({
          actorId: z.string().min(1),
          role: z.string().min(1),
          decidedAt: z.string().datetime(),
          outcome: ApproverVerdictSchema,
          reason: z.string().optional(),
        }),
      )
      .readonly(),
  })
  .readonly();
export type Approval = z.infer<typeof ApprovalSchema>;
