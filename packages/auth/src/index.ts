/**
 * @intentsolutions/guidewire-auth
 *
 * Guidewire Hub OAuth + JWT propagation. Per-tenant `auth.yaml` declares
 * the OIDC discovery URL; this package pulls the JWKS, rotates tokens at
 * 80% of lifetime (proactive refresh per 008 § 10), and propagates the
 * actor JWT through to the Cloud API as `Authorization: Bearer <jwt>`.
 *
 * Per 05-TECHNICAL-SPEC § 8.1.
 */

export * from './client.js';
export * from './jwt.js';
export type * from './types.js';
