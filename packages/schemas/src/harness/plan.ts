import { z } from 'zod';

/**
 * Three-mode contract per D-005 + 02-PRD § 4. Tools declare their mode in
 * metadata; the harness binds it at MCP-handshake time. Mode is not
 * negotiable mid-call (006 § 7.2).
 */
export const ToolModeSchema = z.enum(['read_only', 'draft_only', 'approved_execute']);
export type ToolMode = z.infer<typeof ToolModeSchema>;

/**
 * PlanInput — what the agent intends.
 *
 * `args` is `unknown` here because each tool's local Zod schema validates at
 * the server boundary; the harness treats args as opaque after server-side
 * validation.
 */
export const PlanInputSchema = z.object({
  toolName: z.string().min(1),
  toolVersion: z.string().min(1),
  mode: ToolModeSchema,
  tenantId: z.string().min(1),
  actorId: z.string().min(1),
  args: z.record(z.unknown()),
  summary: z.string(),
  traceId: z.string().min(1),
});
export type PlanInput = z.infer<typeof PlanInputSchema>;

/**
 * Plan — the immutable, content-addressed record of intent.
 *
 * Two-key idempotency model (librarian P1, see 02-PRD § 5.4):
 *   - `idempotencyKey` is the harness's `gwh1:`-prefixed cache key for
 *     client-side replay short-circuit.
 *   - `wire.dbTransactionId` is the value injected as the
 *     `GW-DBTransaction-ID` header on Cloud API write requests; Guidewire
 *     fails duplicates with `AlreadyExecutedException` (it does NOT replay).
 *
 * Plans pass by value; mutation throws. Hashing input → planId is the only
 * side work in `plan()` (pure, no I/O).
 */
export const PlanSchema = PlanInputSchema.extend({
  planId: z.string().min(1),
  createdAt: z.string().datetime(),
  idempotencyKey: z.string().regex(/^gwh1:[0-9a-f]{64}$/),
  wire: z.object({
    dbTransactionId: z.string().regex(/^[0-9a-f]{64}$/),
  }),
}).readonly();
export type Plan = z.infer<typeof PlanSchema>;
