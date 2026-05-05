import { z } from 'zod';

/**
 * `execute()` is the only function in the harness that performs an external
 * write. The depcruise CI rule fails any `servers/**` file that imports
 * `clients/**` directly, forcing all writes through the harness.
 *
 * Per 02-PRD § 5.4. On `idempotencyKey` match in the Postgres cache, the
 * harness short-circuits — returns the prior value, writes an
 * `execute.replayed` audit entry, never invokes the side effect.
 */
export const ExecuteOutcomeSchema = z.enum(['executed', 'replayed', 'short_circuited']);
export type ExecuteOutcome = z.infer<typeof ExecuteOutcomeSchema>;

export const ExecuteResultSchema = z
  .object({
    outcome: ExecuteOutcomeSchema,
    idempotencyKey: z.string().regex(/^gwh1:[0-9a-f]{64}$/),
    auditEntryId: z.string().min(1),
    value: z.unknown(),
    evidenceBundleRef: z.string().min(1),
  })
  .readonly();
export type ExecuteResult<T = unknown> = Omit<z.infer<typeof ExecuteResultSchema>, 'value'> & {
  readonly value: T;
};
