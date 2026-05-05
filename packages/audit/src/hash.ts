import { createHash } from 'node:crypto';

import type { AuditEntry } from '@intentsolutions/guidewire-schemas';

/**
 * The 64-zero-byte sentinel that opens every per-tenant chain. The first
 * entry's `prevHash` is this value.
 */
export const GENESIS_PREV_HASH = '0'.repeat(64);

/**
 * Canonical serialization of the entry payload that goes into `entryHash`.
 * Field order is fixed to make the hash reproducible across processes and
 * implementations (009 § 2.3).
 */
export function canonicalSerialization(entry: Omit<AuditEntry, 'entryHash'>): string {
  const fields: ReadonlyArray<readonly [string, string | number | undefined]> = [
    ['entryId', entry.entryId],
    ['tenantId', entry.tenantId],
    ['chainSeq', entry.chainSeq],
    ['eventType', entry.eventType],
    ['planId', entry.planId],
    ['traceId', entry.traceId],
    ['actorId', entry.actorId],
    ['toolName', entry.toolName],
    ['toolVersion', entry.toolVersion],
    ['mode', entry.mode],
    ['idempotencyKey', entry.idempotencyKey],
    ['recordedAt', entry.recordedAt],
    ['prevHash', entry.prevHash],
    ['blobRef', entry.blobRef],
  ];
  return fields
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n');
}

export function computeEntryHash(entry: Omit<AuditEntry, 'entryHash'>): string {
  return createHash('sha256').update(canonicalSerialization(entry)).digest('hex');
}
