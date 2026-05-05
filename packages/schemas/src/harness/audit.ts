import { z } from 'zod';
import { ToolModeSchema } from './plan.js';

/**
 * Hash-chained audit per 02-PRD § 5.5 + 05-TECHNICAL-SPEC § 8.2. Linear
 * per-tenant chain (NOT Merkle, see 009 § 2.1).
 *
 * Tamper-resistant against an outsider; tamper-evident against an
 * unprivileged operator; defence-in-depth via Postgres role separation
 * against a privileged DBA — NOT cryptographic tamper-evidence against the
 * schema-owner role (D-019).
 */
export const AuditEventTypeSchema = z.enum([
  'plan.created',
  'policy.decided',
  'approval.requested',
  'approval.decided',
  'execute.started',
  'execute.completed',
  'execute.failed',
  'execute.replayed',
  'rollback.hint.issued',
  // HR-3: maintenance event recorded when the harness-side idempotency
  // cache prunes expired keys (02-PRD § 5.5, 05-TECHNICAL-SPEC § 3.5).
  'idempotency.pruned',
]);
export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;

/**
 * GA-3: admin-scope OAuth carve. The actual scope used on the wire,
 * recorded per-call so a compromised harness cannot quietly broaden
 * access without a chain-visible trail (05-TECHNICAL-SPEC § 3.5,
 * audit panel finding GA-3 in 10-GA-guidewire-api-review).
 */
export const OAuthScopeSchema = z.enum(['read', 'write', 'admin', 'producer']);
export type OAuthScope = z.infer<typeof OAuthScopeSchema>;

/**
 * Sha-256 hex (64 chars) — covers both `prevHash` and `entryHash`.
 * Genesis row uses 64 zeros for `prevHash`.
 */
const Sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const AuditEntrySchema = z
  .object({
    entryId: z.string().min(1),
    tenantId: z.string().min(1),
    chainSeq: z.number().int().nonnegative(),
    eventType: AuditEventTypeSchema,
    planId: z.string().min(1),
    traceId: z.string().min(1),
    actorId: z.string().min(1),
    toolName: z.string().min(1),
    toolVersion: z.string().min(1),
    mode: ToolModeSchema,
    idempotencyKey: z.string().min(1),
    recordedAt: z.string().datetime(),
    prevHash: Sha256HexSchema,
    entryHash: Sha256HexSchema,
    blobRef: z.string().optional(),
    /**
     * GA-3: which OAuth scope authorized this call. `admin` flags
     * commission reads + similar privileged reads for forensic review.
     * Optional for backward compat with chains written before HR-3 landed;
     * canonical serialization in `@intentsolutions/guidewire-audit` filters
     * undefined values so absence does not change the entry hash.
     */
    oauthScope: OAuthScopeSchema.optional(),
  })
  .readonly();
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/**
 * Result of a `verifyChain` walk. Used by L4-integration tests + the
 * `rollback.hint.issued` flow to detect tampering.
 */
export const ChainVerificationSchema = z
  .object({
    tenantId: z.string().min(1),
    fromSeq: z.number().int().nonnegative(),
    toSeq: z.number().int().nonnegative(),
    valid: z.boolean(),
    brokenAtSeq: z.number().int().nonnegative().optional(),
    reason: z.string().optional(),
  })
  .readonly();
export type ChainVerification = z.infer<typeof ChainVerificationSchema>;

/**
 * Filter shape for `AuditStore.query()`. Implementation streams matching
 * rows as an `AsyncIterable<AuditEntry>`.
 */
export const AuditQuerySchema = z
  .object({
    tenantId: z.string().min(1),
    fromSeq: z.number().int().nonnegative().optional(),
    toSeq: z.number().int().nonnegative().optional(),
    eventType: AuditEventTypeSchema.optional(),
    planId: z.string().optional(),
    actorId: z.string().optional(),
    toolName: z.string().optional(),
  })
  .readonly();
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
