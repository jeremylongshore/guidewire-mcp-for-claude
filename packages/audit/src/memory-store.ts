import type { AuditEntry, AuditQuery, ChainVerification } from '@intentsolutions/guidewire-schemas';

import { GENESIS_PREV_HASH, computeEntryHash } from './hash.js';
import type { AuditAppendInput, AuditStore } from './types.js';

/**
 * In-memory `AuditStore` for unit tests. Implements the same chain protocol
 * as the Postgres store (single-writer per tenant, head pointer + linear
 * sequence, hash forward chain) so verifyChain semantics can be unit-tested
 * without a database.
 *
 * Postgres-backed parity is in `pg-store.ts`. The memory store is NOT for
 * production — there is no durability, no role separation, no concurrency
 * coordination beyond JS event-loop atomicity.
 */
export function createMemoryAuditStore(): AuditStore & {
  /** Test-only: tamper with a stored entry to exercise verifyChain failure paths. */
  readonly _tamper: (
    tenantId: string,
    chainSeq: number,
    mutation: (e: AuditEntry) => AuditEntry,
  ) => void;
} {
  const entries = new Map<string, AuditEntry[]>();
  const heads = new Map<string, { current_seq: number; current_hash: string }>();

  const append = async (input: AuditAppendInput): Promise<AuditEntry> => {
    const head = heads.get(input.tenantId) ?? {
      current_seq: 0,
      current_hash: GENESIS_PREV_HASH,
    };
    const chainSeq = head.current_seq + 1;
    const prevHash = head.current_hash === '' ? GENESIS_PREV_HASH : head.current_hash;
    const partial: Omit<AuditEntry, 'entryHash'> = {
      entryId: input.entryId,
      tenantId: input.tenantId,
      chainSeq,
      eventType: input.eventType,
      planId: input.planId,
      traceId: input.traceId,
      actorId: input.actorId,
      toolName: input.toolName,
      toolVersion: input.toolVersion,
      mode: input.mode,
      idempotencyKey: input.idempotencyKey,
      recordedAt: input.recordedAt,
      prevHash,
      ...(input.blobRef !== undefined && { blobRef: input.blobRef }),
      ...(input.oauthScope !== undefined && { oauthScope: input.oauthScope }),
    };
    const entryHash = computeEntryHash(partial);
    const entry: AuditEntry = { ...partial, entryHash };

    const tenantEntries = entries.get(input.tenantId) ?? [];
    tenantEntries.push(entry);
    entries.set(input.tenantId, tenantEntries);
    heads.set(input.tenantId, { current_seq: chainSeq, current_hash: entryHash });

    return entry;
  };

  const verifyChain = async (tenantId: string, fromSeq = 1): Promise<ChainVerification> => {
    const tenantEntries = entries.get(tenantId) ?? [];
    if (tenantEntries.length === 0) {
      return {
        tenantId,
        fromSeq,
        toSeq: 0,
        valid: true,
      };
    }
    let prev =
      fromSeq === 1
        ? GENESIS_PREV_HASH
        : (tenantEntries[fromSeq - 2]?.entryHash ?? GENESIS_PREV_HASH);

    for (let i = fromSeq - 1; i < tenantEntries.length; i++) {
      const entry = tenantEntries[i];
      if (entry === undefined) continue;
      if (entry.prevHash !== prev) {
        return {
          tenantId,
          fromSeq,
          toSeq: entry.chainSeq,
          valid: false,
          brokenAtSeq: entry.chainSeq,
          reason: `prevHash mismatch at chainSeq=${entry.chainSeq}`,
        };
      }
      const recomputed = computeEntryHash({
        entryId: entry.entryId,
        tenantId: entry.tenantId,
        chainSeq: entry.chainSeq,
        eventType: entry.eventType,
        planId: entry.planId,
        traceId: entry.traceId,
        actorId: entry.actorId,
        toolName: entry.toolName,
        toolVersion: entry.toolVersion,
        mode: entry.mode,
        idempotencyKey: entry.idempotencyKey,
        recordedAt: entry.recordedAt,
        prevHash: entry.prevHash,
        ...(entry.blobRef !== undefined && { blobRef: entry.blobRef }),
        ...(entry.oauthScope !== undefined && { oauthScope: entry.oauthScope }),
      });
      if (recomputed !== entry.entryHash) {
        return {
          tenantId,
          fromSeq,
          toSeq: entry.chainSeq,
          valid: false,
          brokenAtSeq: entry.chainSeq,
          reason: `entryHash mismatch at chainSeq=${entry.chainSeq}`,
        };
      }
      prev = entry.entryHash;
    }
    const last = tenantEntries[tenantEntries.length - 1];
    return {
      tenantId,
      fromSeq,
      toSeq: last?.chainSeq ?? 0,
      valid: true,
    };
  };

  async function* query(filter: AuditQuery): AsyncIterable<AuditEntry> {
    const tenantEntries = entries.get(filter.tenantId) ?? [];
    for (const entry of tenantEntries) {
      if (filter.fromSeq !== undefined && entry.chainSeq < filter.fromSeq) continue;
      if (filter.toSeq !== undefined && entry.chainSeq > filter.toSeq) continue;
      if (filter.eventType !== undefined && entry.eventType !== filter.eventType) continue;
      if (filter.planId !== undefined && entry.planId !== filter.planId) continue;
      if (filter.actorId !== undefined && entry.actorId !== filter.actorId) continue;
      if (filter.toolName !== undefined && entry.toolName !== filter.toolName) continue;
      yield entry;
    }
  }

  const _tamper = (
    tenantId: string,
    chainSeq: number,
    mutation: (e: AuditEntry) => AuditEntry,
  ): void => {
    const tenantEntries = entries.get(tenantId);
    if (tenantEntries === undefined) return;
    const idx = tenantEntries.findIndex((e) => e.chainSeq === chainSeq);
    if (idx < 0) return;
    const original = tenantEntries[idx];
    if (original === undefined) return;
    tenantEntries[idx] = mutation(original);
  };

  return { append, verifyChain, query, _tamper };
}
