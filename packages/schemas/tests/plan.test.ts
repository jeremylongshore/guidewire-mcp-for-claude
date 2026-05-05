import { describe, expect, it } from 'vitest';
import { PlanInputSchema, PlanSchema, ToolModeSchema } from '../src/harness/plan.js';

describe('Plan schemas', () => {
  it('accepts a well-formed PlanInput', () => {
    const input = {
      toolName: 'find-submissions-waiting-on-me',
      toolVersion: '1.0.0',
      mode: 'read_only' as const,
      tenantId: 'sandbox-jeremy-dev',
      actorId: 'actor:underwriter@demo',
      args: { limit: 10 },
      summary: 'list open submissions assigned to me',
      traceId: '01J9X4HN5G8RXKX7P0VGAR3G7T',
    };
    expect(PlanInputSchema.parse(input)).toEqual(input);
  });

  it('round-trips a full Plan with both idempotency keys', () => {
    const idempotencyKey = `gwh1:${'a'.repeat(64)}`;
    const dbTransactionId = 'b'.repeat(64);
    const plan = {
      toolName: 'reconcile-this-payment',
      toolVersion: '1.0.0',
      mode: 'approved_execute' as const,
      tenantId: 'acme',
      actorId: 'actor:billing-op@acme',
      args: { paymentId: 'p-1', accountId: 'a-1', amount: '100.00' },
      summary: 'apply payment p-1 to account a-1',
      traceId: '01J9X4HN5G8RXKX7P0VGAR3G7U',
      planId: `${'c'.repeat(64)}`,
      createdAt: '2026-05-04T19:23:00.000Z',
      idempotencyKey,
      wire: { dbTransactionId },
    };
    const parsed = PlanSchema.parse(plan);
    expect(parsed.idempotencyKey).toBe(idempotencyKey);
    expect(parsed.wire.dbTransactionId).toBe(dbTransactionId);
  });

  it('rejects malformed idempotency key prefix', () => {
    const plan = {
      toolName: 't',
      toolVersion: '1.0.0',
      mode: 'read_only' as const,
      tenantId: 'a',
      actorId: 'b',
      args: {},
      summary: 's',
      traceId: 't',
      planId: 'p',
      createdAt: '2026-05-04T19:23:00.000Z',
      idempotencyKey: `gwh2:${'a'.repeat(64)}`, // wrong prefix
      wire: { dbTransactionId: 'b'.repeat(64) },
    };
    expect(() => PlanSchema.parse(plan)).toThrow();
  });

  it('rejects unknown ToolMode values', () => {
    expect(() => ToolModeSchema.parse('execute')).toThrow();
    expect(ToolModeSchema.parse('approved_execute')).toBe('approved_execute');
  });
});
