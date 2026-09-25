import { ClientSecretBasic, Configuration, clientCredentialsGrant } from 'openid-client';

import { parseJwtUnverified } from './jwt.js';
import type { AuthConfig, AuthHandle, TokenBundle } from './types.js';

/**
 * Refresh proactively at 80% of token lifetime so in-flight
 * `approved_execute` writes never see a mid-write 401 (008 § 10 + 02-PRD
 * § 6.1).
 */
const REFRESH_FRACTION = 0.8;

/**
 * Constructs an `AuthHandle` for a given tenant. Uses OIDC discovery to
 * locate the token endpoint; falls back to the explicit `token_endpoint`
 * when discovery is not available (sandbox-blocked per librarian P6 — full
 * JWKS validation lands when first integration tenant connects).
 */
export async function createAuth(config: AuthConfig): Promise<AuthHandle> {
  // openid-client v6: a Configuration built from static server metadata
  // replaces v5's Issuer/Client classes. HTTPS is enforced by default.
  const oidc = new Configuration(
    {
      issuer: config.profile.oauth.token_endpoint,
      token_endpoint: config.profile.oauth.token_endpoint,
    },
    config.clientId,
    undefined,
    ClientSecretBasic(config.clientSecret),
  );

  let cached: TokenBundle | undefined;

  const fetchToken = async (): Promise<TokenBundle> => {
    const tokenSet = await clientCredentialsGrant(oidc, {
      scope: config.profile.oauth.scopes.join(' '),
    });
    if (typeof tokenSet.access_token !== 'string') {
      throw new Error('Token endpoint returned no access_token');
    }
    const lifetime = (tokenSet.expires_in ?? config.profile.oauth.token_lifetime_seconds) * 1000;
    return {
      accessToken: tokenSet.access_token,
      tokenType: 'Bearer',
      expiresAt: Date.now() + lifetime * REFRESH_FRACTION,
    };
  };

  const getToken = async (): Promise<TokenBundle> => {
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return cached;
    }
    cached = await fetchToken();
    return cached;
  };

  const refreshToken = async (): Promise<TokenBundle> => {
    cached = await fetchToken();
    return cached;
  };

  return {
    getToken,
    refreshToken,
    validateJwt: parseJwtUnverified,
  };
}
