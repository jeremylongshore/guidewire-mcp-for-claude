import { describe, expect, it } from 'vitest';

import { parseJwtUnverified } from '../src/jwt.js';

describe('parseJwtUnverified', () => {
  it('rejects a malformed JWT (missing segments)', () => {
    expect(() => parseJwtUnverified('not-a-jwt')).toThrow(/Malformed JWT/);
    expect(() => parseJwtUnverified('only.two')).toThrow(/Malformed JWT/);
  });

  it('rejects a JWT with non-JSON payload', () => {
    // Header + non-JSON payload + signature
    const header = Buffer.from('{"alg":"none"}').toString('base64url');
    const badPayload = Buffer.from('not-json').toString('base64url');
    const sig = 'sig';
    expect(() => parseJwtUnverified(`${header}.${badPayload}.${sig}`)).toThrow(
      /Malformed JWT: payload is not valid JSON/,
    );
  });

  it('rejects a JWT missing the required `sub` claim', () => {
    const header = Buffer.from('{"alg":"none"}').toString('base64url');
    const payload = Buffer.from('{"iss":"acme"}').toString('base64url');
    const sig = 'sig';
    expect(() => parseJwtUnverified(`${header}.${payload}.${sig}`)).toThrow(
      /missing required "sub" claim/,
    );
  });

  it('parses a structurally valid JWT and returns the sub claim', () => {
    const header = Buffer.from('{"alg":"none"}').toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'actor:underwriter@demo', iss: 'guidewire-hub' }),
    ).toString('base64url');
    const sig = 'sig';
    const claims = parseJwtUnverified(`${header}.${payload}.${sig}`);
    expect(claims.sub).toBe('actor:underwriter@demo');
    expect(claims.iss).toBe('guidewire-hub');
  });
});
