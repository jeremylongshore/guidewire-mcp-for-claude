import type { AuditEntry, AuditQuery, ChainVerification } from '@intentsolutions/guidewire-schemas';
import type { Pool } from 'pg';

import { GENESIS_PREV_HASH, computeEntryHash } from './hash.js';
import type { AuditAppendInput, AuditStore } from './types.js';

/**
 * Postgres-backed AuditStore. Per 02-PRD § 5.5 + 05-TECHNICAL-SPEC § 8.2:
 * serializable transaction; `SELECT ... FOR UPDATE` on `audit_chain_heads`;
 * compute `entry_hash`; insert row; update head.
 *
 * The harness binds via the `audit_writer` role (INSERT-only on
 * `audit_entries`); `verifyChain` binds via `audit_reader` (SELECT-only).
 * The schema-owner identity is held outside the harness process per D-019.
 */
export function createPgAuditStore(pool: Pool): AuditStore {
  const append = async (input: AuditAppendInput): Promise<AuditEntry> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const headRes = await client.query<{
        current_seq: string;
        current_hash: string;
      }>(
        `SELECT current_seq::text, current_hash
         FROM audit_chain_heads
         WHERE tenant_id = $1
         FOR UPDATE`,
        [input.tenantId],
      );
      const currentSeq = headRes.rows[0] !== undefined ? Number(headRes.rows[0].current_seq) : 0;
      const currentHash = headRes.rows[0]?.current_hash ?? GENESIS_PREV_HASH;
      const chainSeq = currentSeq + 1;
      const prevHash = currentHash === '' ? GENESIS_PREV_HASH : currentHash;

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

      await client.query(
        `INSERT INTO audit_entries
           (entry_id, tenant_id, chain_seq, event_type, plan_id, trace_id,
            actor_id, tool_name, tool_version, mode, idempotency_key,
            recorded_at, prev_hash, entry_hash, blob_ref, oauth_scope)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          input.entryId,
          input.tenantId,
          chainSeq,
          input.eventType,
          input.planId,
          input.traceId,
          input.actorId,
          input.toolName,
          input.toolVersion,
          input.mode,
          input.idempotencyKey,
          input.recordedAt,
          prevHash,
          entryHash,
          input.blobRef ?? null,
          input.oauthScope ?? null,
        ],
      );

      if (headRes.rows[0] === undefined) {
        await client.query(
          `INSERT INTO audit_chain_heads (tenant_id, current_seq, current_hash)
           VALUES ($1, $2, $3)`,
          [input.tenantId, chainSeq, entryHash],
        );
      } else {
        await client.query(
          `UPDATE audit_chain_heads
           SET current_seq = $2, current_hash = $3
           WHERE tenant_id = $1`,
          [input.tenantId, chainSeq, entryHash],
        );
      }

      await client.query('COMMIT');
      return { ...partial, entryHash };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  const verifyChain = async (tenantId: string, fromSeq = 1): Promise<ChainVerification> => {
    const res = await pool.query<{
      entry_id: string;
      tenant_id: string;
      chain_seq: string;
      event_type: string;
      plan_id: string;
      trace_id: string;
      actor_id: string;
      tool_name: string;
      tool_version: string;
      mode: string;
      idempotency_key: string;
      recorded_at: string;
      prev_hash: string;
      entry_hash: string;
      blob_ref: string | null;
      oauth_scope: string | null;
    }>(
      `SELECT * FROM audit_entries
       WHERE tenant_id = $1 AND chain_seq >= $2
       ORDER BY chain_seq ASC`,
      [tenantId, fromSeq],
    );
    if (res.rows.length === 0) {
      return { tenantId, fromSeq, toSeq: 0, valid: true };
    }
    let prev = fromSeq === 1 ? GENESIS_PREV_HASH : await fetchPrevHashFor(pool, tenantId, fromSeq);

    for (const row of res.rows) {
      if (row.prev_hash !== prev) {
        return {
          tenantId,
          fromSeq,
          toSeq: Number(row.chain_seq),
          valid: false,
          brokenAtSeq: Number(row.chain_seq),
          reason: `prevHash mismatch at chainSeq=${row.chain_seq}`,
        };
      }
      const partial: Omit<AuditEntry, 'entryHash'> = {
        entryId: row.entry_id,
        tenantId: row.tenant_id,
        chainSeq: Number(row.chain_seq),
        eventType: row.event_type as AuditEntry['eventType'],
        planId: row.plan_id,
        traceId: row.trace_id,
        actorId: row.actor_id,
        toolName: row.tool_name,
        toolVersion: row.tool_version,
        mode: row.mode as AuditEntry['mode'],
        idempotencyKey: row.idempotency_key,
        recordedAt: row.recorded_at,
        prevHash: row.prev_hash,
        ...(row.blob_ref !== null && { blobRef: row.blob_ref }),
        ...(row.oauth_scope !== null && {
          oauthScope: row.oauth_scope as AuditEntry['oauthScope'],
        }),
      };
      const recomputed = computeEntryHash(partial);
      if (recomputed !== row.entry_hash) {
        return {
          tenantId,
          fromSeq,
          toSeq: Number(row.chain_seq),
          valid: false,
          brokenAtSeq: Number(row.chain_seq),
          reason: `entryHash mismatch at chainSeq=${row.chain_seq}`,
        };
      }
      prev = row.entry_hash;
    }
    const lastRow = res.rows[res.rows.length - 1];
    return {
      tenantId,
      fromSeq,
      toSeq: lastRow !== undefined ? Number(lastRow.chain_seq) : 0,
      valid: true,
    };
  };

  async function* query(filter: AuditQuery): AsyncIterable<AuditEntry> {
    const conds: string[] = ['tenant_id = $1'];
    const params: unknown[] = [filter.tenantId];
    if (filter.fromSeq !== undefined) {
      params.push(filter.fromSeq);
      conds.push(`chain_seq >= $${params.length}`);
    }
    if (filter.toSeq !== undefined) {
      params.push(filter.toSeq);
      conds.push(`chain_seq <= $${params.length}`);
    }
    if (filter.eventType !== undefined) {
      params.push(filter.eventType);
      conds.push(`event_type = $${params.length}`);
    }
    if (filter.planId !== undefined) {
      params.push(filter.planId);
      conds.push(`plan_id = $${params.length}`);
    }
    if (filter.actorId !== undefined) {
      params.push(filter.actorId);
      conds.push(`actor_id = $${params.length}`);
    }
    if (filter.toolName !== undefined) {
      params.push(filter.toolName);
      conds.push(`tool_name = $${params.length}`);
    }
    const sql = `SELECT * FROM audit_entries WHERE ${conds.join(' AND ')} ORDER BY chain_seq ASC`;
    const res = await pool.query(sql, params);
    for (const row of res.rows) {
      yield {
        entryId: row.entry_id,
        tenantId: row.tenant_id,
        chainSeq: Number(row.chain_seq),
        eventType: row.event_type,
        planId: row.plan_id,
        traceId: row.trace_id,
        actorId: row.actor_id,
        toolName: row.tool_name,
        toolVersion: row.tool_version,
        mode: row.mode,
        idempotencyKey: row.idempotency_key,
        recordedAt: row.recorded_at,
        prevHash: row.prev_hash,
        entryHash: row.entry_hash,
        ...(row.blob_ref !== null && { blobRef: row.blob_ref }),
        ...(row.oauth_scope !== null && { oauthScope: row.oauth_scope }),
      };
    }
  }

  return { append, verifyChain, query };
}

async function fetchPrevHashFor(pool: Pool, tenantId: string, fromSeq: number): Promise<string> {
  const res = await pool.query<{ entry_hash: string }>(
    `SELECT entry_hash FROM audit_entries
     WHERE tenant_id = $1 AND chain_seq = $2`,
    [tenantId, fromSeq - 1],
  );
  return res.rows[0]?.entry_hash ?? GENESIS_PREV_HASH;
}
