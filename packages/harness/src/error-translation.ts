import { HarnessErrorCodeSchema } from '@intentsolutions/guidewire-schemas';

import { type HarnessError, makeHarnessError } from './error.js';

/**
 * Boot-path error translation.
 *
 * Upstream loaders (currently the profile loader in
 * `servers/policycenter-mcp/src/profile.ts`, future loaders in any
 * other server) cannot throw `HarnessError` directly because the
 * harness package sits below the server packages in the dep graph
 * (see CLAUDE.md TECH-SPEC § stack — `harness` cannot import from
 * `servers/**`). They throw their own typed errors with a `code`
 * property carrying a canonical `HarnessErrorCode` from
 * `@intentsolutions/guidewire-schemas`.
 *
 * This function lets a boot path translate that signal into a
 * proper `HarnessError` so callers up the stack get a uniform error
 * type. It is intentionally **duck-typed**: we structurally check
 * `Error` + `'code' in err` + `HarnessErrorCodeSchema.safeParse(...)`
 * rather than `instanceof ProfileLoadError`. This keeps the harness
 * layer free of dependencies on the loader-specific error classes
 * while still letting the `code` field flow through end-to-end.
 *
 * Usage at a boot site:
 *
 * ```ts
 * try {
 *   profile = await loadProfile(profilePath);
 * } catch (err) {
 *   const wrapped = tryAsHarnessError(err, { trace_id: bootTraceId });
 *   if (wrapped !== undefined) throw wrapped;
 *   throw err;  // not a code-carrying loader error — surface as-is
 * }
 * ```
 *
 * Returns `undefined` (not throws) when the error is unrecognized so
 * the caller can keep their own fallback path.
 *
 * @param err Anything thrown — typically the catch-clause `err`.
 * @param ctx Boot-time context. `trace_id` and `tenant_id` are passed
 *   into the synthesized `HarnessError`. Both default to honest
 *   sentinels (`'boot'` / `'unknown'`) when the caller doesn't yet
 *   have them — boot-path errors often fire BEFORE the profile/trace
 *   are established, and observability tags surface those sentinels
 *   so ops can filter on them.
 */
export function tryAsHarnessError(
  err: unknown,
  ctx: {
    readonly trace_id?: string;
    readonly tenant_id?: string;
  } = {},
): HarnessError | undefined {
  if (!(err instanceof Error)) return undefined;
  if (!('code' in err)) return undefined;
  const codeRaw = (err as { readonly code: unknown }).code;
  const codeParse = HarnessErrorCodeSchema.safeParse(codeRaw);
  if (!codeParse.success) return undefined;
  return makeHarnessError(codeParse.data, err.message, {
    trace_id: ctx.trace_id ?? 'boot',
    tenant_id: ctx.tenant_id ?? 'unknown',
    cause: err,
  });
}
