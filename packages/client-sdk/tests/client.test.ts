import { describe, expect, it, vi } from 'vitest';

import type { AuthHandle } from '@intentsolutions/guidewire-auth';
import { createClient } from '../src/client.js';
import { withPagination } from '../src/paginate.js';
import type { GuidewireFetch, GuidewireRequest } from '../src/types.js';

const fakeAuth = (): AuthHandle => ({
  getToken: async () => ({
    accessToken: 'fake-token',
    tokenType: 'Bearer',
    expiresAt: Date.now() + 60_000,
  }),
  refreshToken: async () => ({
    accessToken: 'fake-token-refreshed',
    tokenType: 'Bearer',
    expiresAt: Date.now() + 60_000,
  }),
  validateJwt: () => ({ sub: 'actor:test@demo' }),
});

describe('createClient', () => {
  it('GET parses JSON response and propagates Authorization header', async () => {
    const seenRequest = vi.fn<(req: GuidewireRequest) => void>();
    const fetch: GuidewireFetch = async (req) => {
      seenRequest(req);
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: [{ id: 'sub-1' }] }),
      };
    };

    const client = createClient({
      auth: fakeAuth(),
      baseUrls: { pc: 'https://pc.acme.guidewire.cloud' },
      fetch,
    });

    type Response = { items: ReadonlyArray<{ id: string }> };
    const result = await client.get<Response>({
      suite: 'pc',
      path: '/job/v1/jobs',
      query: { subtype: 'Submission' },
    });

    expect(result.items[0]?.id).toBe('sub-1');
    expect(seenRequest).toHaveBeenCalledOnce();
    const req = seenRequest.mock.calls[0]?.[0];
    expect(req?.url).toBe('https://pc.acme.guidewire.cloud/job/v1/jobs?subtype=Submission');
    expect(req?.headers.Authorization).toBe('Bearer fake-token');
  });

  it('POST injects GW-DBTransaction-ID header on writes', async () => {
    const seenRequest = vi.fn<(req: GuidewireRequest) => void>();
    const fetch: GuidewireFetch = async (req) => {
      seenRequest(req);
      return {
        status: 200,
        headers: {},
        body: JSON.stringify({ ok: true }),
      };
    };

    const client = createClient({
      auth: fakeAuth(),
      baseUrls: { bc: 'https://bc.acme.guidewire.cloud' },
      fetch,
    });

    const dbTxnId = 'a'.repeat(64);
    await client.post({
      suite: 'bc',
      path: '/billing/v1/payments/p-1/applications',
      dbTransactionId: dbTxnId,
      body: { accountId: 'a-1', amount: { amount: '100.00', currency: 'USD' } },
    });

    const req = seenRequest.mock.calls[0]?.[0];
    expect(req?.method).toBe('POST');
    expect(req?.headers['GW-DBTransaction-ID']).toBe(dbTxnId);
    expect(req?.headers['Content-Type']).toBe('application/json');
  });

  it('POST rejects malformed dbTransactionId', async () => {
    const fetch: GuidewireFetch = async () => ({ status: 200, headers: {}, body: '{}' });
    const client = createClient({
      auth: fakeAuth(),
      baseUrls: { bc: 'https://bc.acme.guidewire.cloud' },
      fetch,
    });
    await expect(
      client.post({
        suite: 'bc',
        path: '/billing/v1/payments/p-1/applications',
        dbTransactionId: 'too-short',
      }),
    ).rejects.toThrow(/dbTransactionId must be 64 hex chars/);
  });

  it('throws on 4xx responses', async () => {
    const fetch: GuidewireFetch = async () => ({
      status: 401,
      headers: {},
      body: JSON.stringify({ error: 'Unauthorized' }),
    });
    const client = createClient({
      auth: fakeAuth(),
      baseUrls: { pc: 'https://pc.acme.guidewire.cloud' },
      fetch,
    });
    await expect(client.get({ suite: 'pc', path: '/policy/v1/policies' })).rejects.toThrow(
      /Cloud API returned 401/,
    );
  });
});

describe('withPagination', () => {
  it('appends authoritative pageSize and pageOffset query parameters', () => {
    const params = withPagination({ status: 'Open' });
    expect(params.pageSize).toBe(20);
    expect(params.pageOffset).toBe(0);
    expect(params.status).toBe('Open');
  });

  it('preserves caller-provided overrides', () => {
    const params = withPagination({ status: 'Open' }, { pageSize: 50, pageOffset: 100 });
    expect(params.pageSize).toBe(50);
    expect(params.pageOffset).toBe(100);
  });
});
