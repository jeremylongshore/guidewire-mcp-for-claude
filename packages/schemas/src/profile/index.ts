/**
 * Customer profile schemas per 02-PRD § 6 + D-020 (versioning).
 *
 * v1.0 — the 9 YAMLs (auth, roles, lob, typelists, custom-entities,
 *        field-aliases, approval-matrix, pii-policy, events).
 * v2.0 — v1.0 + `aggregations:` block inside `lob.yaml` (no 10th file).
 *        Required by E2.5 underwriting-manager aggregate-query tools.
 *
 * Full worked examples land in `profiles/_template/` when E4 ships. These
 * basic schemas are the boot-time validation contract; per-customer profile
 * loaders consume them.
 */

export * from './profile-version.js';
export * from './auth.js';
export * from './roles.js';
export * from './lob.js';
export * from './typelists.js';
export * from './custom-entities.js';
export * from './field-aliases.js';
export * from './approval-matrix.js';
export * from './pii-policy.js';
export * from './events.js';
