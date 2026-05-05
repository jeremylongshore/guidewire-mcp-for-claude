import { z } from 'zod';

/**
 * Rollback is a *hint*, not an automated revert (009 § 1.6). Guidewire
 * writes are rarely idempotent in reverse — a reserve change can be
 * reversed; an issued denial letter cannot. The harness records that the
 * hint was issued (`rollback.hint.issued` audit event); the human operator
 * executes.
 */
export const RollbackHintSchema = z
  .object({
    hintId: z.string().min(1),
    planId: z.string().min(1),
    auditEntryId: z.string().min(1),
    humanInstruction: z.string().min(1),
    suggestedTool: z.string().optional(),
    suggestedArgs: z.record(z.unknown()).optional(),
    cautions: z.array(z.string()).readonly(),
    issuedAt: z.string().datetime(),
  })
  .readonly();
export type RollbackHint = z.infer<typeof RollbackHintSchema>;
