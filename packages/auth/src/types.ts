import type { AuthYaml } from '@intentsolutions/guidewire-schemas';

/**
 * Resolved auth config — `auth.yaml` parsed via Zod, then dev-tier creds
 * loaded via env per D-021 (no Jeremy-controlled sandbox; first integration
 * engagement brings their own tenant).
 */
export interface AuthConfig {
  readonly profile: AuthYaml;
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface TokenBundle {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresAt: number; // epoch ms
}

export interface JwtClaims {
  readonly sub: string;
  readonly iss?: string;
  readonly aud?: string | readonly string[];
  readonly exp?: number;
  readonly iat?: number;
  readonly [claim: string]: unknown;
}

export interface AuthHandle {
  /** Current access token, refreshing proactively at 80% of lifetime. */
  getToken(): Promise<TokenBundle>;
  /** Lightweight structural validation; full JWKS verification at integration time. */
  validateJwt(token: string): JwtClaims;
  /** Force a refresh now (e.g. on 401 from Cloud API). */
  refreshToken(): Promise<TokenBundle>;
}
