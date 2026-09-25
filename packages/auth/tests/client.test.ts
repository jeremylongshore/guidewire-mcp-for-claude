import type { AuthYaml } from '@intentsolutions/guidewire-schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuth } from '../src/client.js';

const TOKEN_ENDPOINT = 'https://login.example-tenant.test/oauth2/token';

const profile: AuthYaml = {
  oauth: {
    client_id_env: 'GW_CLIENT_ID',
    client_secret_env: 'GW_CLIENT_SECRET',
    token_endpoint: TOKEN_ENDPOINT,
    scopes: ['pc.read', 'pc.write'],
    token_lifetime_seconds: 3600,
    refresh_strategy: 'proactive',
    jwt_propagation: { enabled: false, actor_claim: 'sub' },
  },
  api: { cloud_release: 'Palisades' },
};

function stubTokenEndpoint(body: Record<string, unknown>) {
  const calls: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(new Request(input, init));
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

describe('createAuth (openid-client client_credentials grant)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts a client_credentials grant with basic auth and the profile scopes', async () => {
    const calls = stubTokenEndpoint({
      access_token: 'tok-1',
      token_type: 'Bearer',
      expires_in: 100,
    });
    const auth = await createAuth({ profile, clientId: 'cid', clientSecret: 'csecret' });

    const before = Date.now();
    const bundle = await auth.getToken();

    expect(calls).toHaveLength(1);
    const req = calls[0] as Request;
    expect(req.url).toBe(TOKEN_ENDPOINT);
    expect(req.method).toBe('POST');
    expect(req.headers.get('authorization')).toBe(
      `Basic ${Buffer.from('cid:csecret').toString('base64')}`,
    );
    const form = new URLSearchParams(await req.text());
    expect(form.get('grant_type')).toBe('client_credentials');
    expect(form.get('scope')).toBe('pc.read pc.write');

    expect(bundle.accessToken).toBe('tok-1');
    expect(bundle.tokenType).toBe('Bearer');
    // Refresh at 80% of the 100s lifetime.
    expect(bundle.expiresAt).toBeGreaterThanOrEqual(before + 80_000);
    expect(bundle.expiresAt).toBeLessThanOrEqual(Date.now() + 80_000);
  });

  it('caches the token until refreshToken forces a new grant', async () => {
    const calls = stubTokenEndpoint({
      access_token: 'tok-2',
      token_type: 'Bearer',
      expires_in: 100,
    });
    const auth = await createAuth({ profile, clientId: 'cid', clientSecret: 'csecret' });

    await auth.getToken();
    await auth.getToken();
    expect(calls).toHaveLength(1);

    await auth.refreshToken();
    expect(calls).toHaveLength(2);
  });
});
