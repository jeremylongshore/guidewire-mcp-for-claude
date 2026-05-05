import { z } from 'zod';
import { ApprovalSchema } from './approval.js';
import { AuditEntrySchema, ChainVerificationSchema } from './audit.js';
import { ExecuteResultSchema } from './execute.js';
import { PlanSchema } from './plan.js';
import { PolicyDecisionSchema } from './policy.js';

/**
 * The artifact a CISO or SOC 2 auditor receives (009 § 5). Reproducible from
 * the audit chain alone. PII redaction runs at bundle export per 02-PRD
 * § 5.7 — not on the hot path of `execute()`.
 */
export const OtelSpanSnapshotSchema = z
  .object({
    name: z.string(),
    spanId: z.string(),
    traceId: z.string(),
    parentSpanId: z.string().optional(),
    startTimeUnixNano: z.string(),
    endTimeUnixNano: z.string(),
    attributes: z.record(z.unknown()),
    statusCode: z.enum(['UNSET', 'OK', 'ERROR']),
  })
  .readonly();
export type OtelSpanSnapshot = z.infer<typeof OtelSpanSnapshotSchema>;

export const EvidenceBundleSchema = z
  .object({
    bundleVersion: z.literal('1.0'),
    traceId: z.string().min(1),
    tenantId: z.string().min(1),
    generatedAt: z.string().datetime(),
    plan: PlanSchema,
    decision: PolicyDecisionSchema,
    approval: ApprovalSchema.optional(),
    execution: ExecuteResultSchema.optional(),
    auditEntries: z.array(AuditEntrySchema).readonly(),
    chainVerification: ChainVerificationSchema,
    spans: z.array(OtelSpanSnapshotSchema).readonly(),
    piiRedactionApplied: z.boolean(),
  })
  .readonly();
export type EvidenceBundle = z.infer<typeof EvidenceBundleSchema>;
