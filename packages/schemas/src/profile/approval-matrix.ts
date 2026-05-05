import { z } from 'zod';

/**
 * `approval-matrix.yaml` — write actions → required approver tier per
 * 02-PRD § 6.7. Money typing is preserved here too; conditions reference
 * both `amount` and `currency`.
 */
export const ApprovalConditionSchema = z
  .object({
    amount_lt: z.number().optional(),
    amount_lte: z.number().optional(),
    amount_gt: z.number().optional(),
    amount_gte: z.number().optional(),
    premium_change_lt: z.number().optional(),
    premium_change_gt: z.number().optional(),
    premium_change_gte: z.number().optional(),
    currency: z.string().length(3).optional(),
  })
  .passthrough();
export type ApprovalCondition = z.infer<typeof ApprovalConditionSchema>;

export const ApprovalMatrixEntrySchema = z.object({
  condition: ApprovalConditionSchema,
  approver_tier: z.string().min(1),
});
export type ApprovalMatrixEntry = z.infer<typeof ApprovalMatrixEntrySchema>;

export const ApprovalMatrixYamlSchema = z.object({
  matrix: z.record(z.array(ApprovalMatrixEntrySchema)),
});
export type ApprovalMatrixYaml = z.infer<typeof ApprovalMatrixYamlSchema>;
