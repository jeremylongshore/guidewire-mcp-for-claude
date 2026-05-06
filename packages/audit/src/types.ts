import type {
  AuditEntry,
  AuditEventType,
  AuditQuery,
  ChainVerification,
  OAuthScope,
  ToolMode,
} from '@intentsolutions/guidewire-schemas';

/**
 * The shape callers pass to `append()` — the chain bookkeeping fields
 * (`chainSeq`, `prevHash`, `entryHash`) are derived inside the store under
 * a serializable transaction with `FOR UPDATE` on the heads row (per
 * 05-TECHNICAL-SPEC § 8.2).
 */
export interface AuditAppendInput {
  readonly entryId: string;
  readonly tenantId: string;
  readonly eventType: AuditEventType;
  readonly planId: string;
  readonly traceId: string;
  readonly actorId: string;
  readonly toolName: string;
  readonly toolVersion: string;
  readonly mode: ToolMode;
  readonly idempotencyKey: string;
  readonly recordedAt: string;
  readonly blobRef?: string;
  readonly oauthScope?: OAuthScope;
}

export interface AuditStore {
  append(input: AuditAppendInput): Promise<AuditEntry>;
  verifyChain(tenantId: string, fromSeq?: number): Promise<ChainVerification>;
  query(filter: AuditQuery): AsyncIterable<AuditEntry>;
}
