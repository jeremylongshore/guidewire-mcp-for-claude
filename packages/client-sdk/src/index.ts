/**
 * @intentsolutions/guidewire-client
 *
 * Guidewire Cloud API client wrapper. The ONLY place
 * `GW-DBTransaction-ID` is injected on writes (per librarian P1 + AST
 * call-site rule). Servers cannot inject the header — depcruise REFUSEs
 * `servers/**` importing `clients/**` directly; writes flow through
 * `packages/harness`.
 *
 * Per 05-TECHNICAL-SPEC § 2.1 + § 4.7 architecture rule.
 */

export * from './client.js';
export * from './paginate.js';
export type * from './types.js';
