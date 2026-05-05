/**
 * @intentsolutions/guidewire-audit
 *
 * Postgres hash-chain audit store. Linear per-tenant chain (NOT Merkle, see
 * 009 § 2.1).
 *
 * Tamper-resistant against an outsider; tamper-evident against an
 * unprivileged operator; defence-in-depth via Postgres role separation
 * against a privileged DBA — NOT cryptographic tamper-evidence against the
 * schema-owner role (D-019). KMS-signed external commitment is E3+ work.
 *
 * Per 02-PRD § 5.5 + 05-TECHNICAL-SPEC § 8.2.
 */

export * from './hash.js';
export * from './memory-store.js';
export * from './pg-store.js';
export type * from './types.js';
