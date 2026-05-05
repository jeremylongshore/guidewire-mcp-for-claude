import type { JwtClaims } from './types.js';

/**
 * Lightweight JWT parser — base64url decodes the payload. Full signature +
 * JWKS verification lands when `auth.yaml.oauth.jwt_propagation.enabled =
 * true` paths exercise against a real Hub OIDC discovery URL (per
 * 02-PRD § 6.1, sandbox-blocked at integration time per librarian P6).
 *
 * Unit tests can verify rejection of malformed tokens without a live
 * Guidewire call.
 */
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function parseJwtUnverified(token: string): JwtClaims {
  if (!JWT_SHAPE.test(token)) {
    throw new Error('Malformed JWT: must be three base64url-encoded segments separated by dots');
  }
  const parts = token.split('.');
  const payloadSegment = parts[1];
  if (payloadSegment === undefined) {
    throw new Error('Malformed JWT: missing payload segment');
  }
  const payload = decodeBase64Url(payloadSegment);
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('Malformed JWT: payload is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Malformed JWT: payload is not an object');
  }
  const claims = parsed as Record<string, unknown>;
  if (typeof claims.sub !== 'string') {
    throw new Error('Malformed JWT: missing required "sub" claim');
  }
  return claims as unknown as JwtClaims;
}

function decodeBase64Url(input: string): string {
  // Pad to multiple of 4
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const padString = padded + '='.repeat(padLength);
  return Buffer.from(padString, 'base64').toString('utf8');
}
