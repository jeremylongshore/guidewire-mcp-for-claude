import { describe, expect, it } from 'vitest';

import { GENESIS_PREV_HASH } from '../src/hash.js';
import { createMemoryAuditStore } from '../src/memory-store.js';
import type { AuditAppendInput } from '../src/types.js';

const baseInput = (overrides: Partial<AuditAppendInput> = {}): AuditAppendInput => ({
  entryId: `e-${Math.random().toString(36).slice(2)}`,
  tenantId: 'sandbox-jeremy-dev',
  eventType: 'plan.created',
  planId: 'p-1',
  traceId: 't-1',
  actorId: 'actor:underwriter@demo',
  toolName: 'find-submissions-waiting-on-me',
  toolVersion: '1.0.0',
  mode: 'read_only',
  idempotencyKey: `gwh1:${'a'.repeat(64)}`,
  recordedAt: '2026-05-04T19:23:00.000Z',
  ...overrides,
});

describe('AuditStore (memory) — hash chain', () => {
  it('first entry uses genesis prevHash', async () => {
    const store = createMemoryAuditStore();
    const entry = await store.append(baseInput());
    expect(entry.chainSeq).toBe(1);
    expect(entry.prevHash).toBe(GENESIS_PREV_HASH);
    expect(entry.entryHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifyChain returns valid:true for an untampered chain', async () => {
    const store = createMemoryAuditStore();
    await store.append(baseInput({ entryId: 'e1' }));
    await store.append(baseInput({ entryId: 'e2', eventType: 'policy.decided' }));
    await store.append(baseInput({ entryId: 'e3', eventType: 'execute.completed' }));
    const result = await store.verifyChain('sandbox-jeremy-dev');
    expect(result.valid).toBe(true);
    expect(result.toSeq).toBe(3);
  });

  it('verifyChain returns valid:false when an entryHash byte is flipped', async () => {
    const store = createMemoryAuditStore();
    await store.append(baseInput({ entryId: 'e1' }));
    await store.append(baseInput({ entryId: 'e2', eventType: 'policy.decided' }));
    await store.append(baseInput({ entryId: 'e3', eventType: 'execute.completed' }));

    // Tamper with entry 2's entryHash — flip first character.
    store._tamper('sandbox-jeremy-dev', 2, (entry) => ({
      ...entry,
      entryHash: (entry.entryHash[0] === '0' ? '1' : '0') + entry.entryHash.slice(1),
    }));

    const result = await store.verifyChain('sandbox-jeremy-dev');
    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(2);
    expect(result.reason).toMatch(/entryHash mismatch/);
  });

  it('verifyChain detects prevHash mismatch when an earlier entry is replaced', async () => {
    const store = createMemoryAuditStore();
    await store.append(baseInput({ entryId: 'e1' }));
    await store.append(baseInput({ entryId: 'e2', eventType: 'policy.decided' }));
    await store.append(baseInput({ entryId: 'e3', eventType: 'execute.completed' }));

    // Tamper with entry 1's actorId — entry 1's hash recomputes wrong, breaks
    // entry 2's prevHash chain.
    store._tamper('sandbox-jeremy-dev', 1, (entry) => ({
      ...entry,
      actorId: 'actor:attacker@demo',
    }));

    const result = await store.verifyChain('sandbox-jeremy-dev');
    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBeGreaterThanOrEqual(1);
  });

  it('query streams matching entries', async () => {
    const store = createMemoryAuditStore();
    await store.append(baseInput({ entryId: 'e1' }));
    await store.append(baseInput({ entryId: 'e2', eventType: 'policy.decided' }));
    await store.append(baseInput({ entryId: 'e3', eventType: 'execute.completed' }));

    const collected: string[] = [];
    for await (const e of store.query({
      tenantId: 'sandbox-jeremy-dev',
      eventType: 'policy.decided',
    })) {
      collected.push(e.entryId);
    }
    expect(collected).toEqual(['e2']);
  });
});
