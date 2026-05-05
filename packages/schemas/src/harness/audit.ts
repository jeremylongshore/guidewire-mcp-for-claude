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
]);
export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;

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
