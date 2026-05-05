import { AppError, type AppErrorOpts } from '@intentsolutions/guidewire-observability';
import type { HarnessErrorCode } from '@intentsolutions/guidewire-schemas';
import type { ToolMode } from '@intentsolutions/guidewire-schemas';

/**
 * Constructor options for HarnessError. Extends AppErrorOpts but narrows
 * `code` to the canonical HarnessErrorCode union (02-PRD § 5.8 +
 * 05-TECHNICAL-SPEC § 3.8).
 */
export interface HarnessErrorOpts extends Omit<AppErrorOpts, 'code'> {
  readonly code: HarnessErrorCode;
  readonly planId?: string;
  readonly decisionId?: string;
}

/**
 * The typed error class for every harness-level failure.
 *
 * Extends `AppError` from `@intentsolutions/guidewire-observability` so that
 * Sentry receives consistent tags and `reportError()` works unchanged.
 * Sentry grouping fingerprint: `[code, tool_name, mode]` (05-TECHNICAL-SPEC
 * § 4.5) — same refusal across multiple tenants groups into one Sentry issue.
 *
 * `GW_DBTRANSACTION_DUPLICATE` is the librarian P1 corollary — forensic-only.
 * Should never fire in normal operation because the `gwh1:` cache short-
 * circuits first (02-PRD § 5.4 / 05-TECHNICAL-SPEC § 3.4.2).
 */
export class HarnessError extends AppError {
  public override readonly code: HarnessErrorCode;
  public readonly planId?: string;
  public readonly decisionId?: string;

  constructor(opts: HarnessErrorOpts) {
    super({ ...opts });
    this.name = 'HarnessError';
    this.code = opts.code;
    if (opts.planId !== undefined) this.planId = opts.planId;
    if (opts.decisionId !== undefined) this.decisionId = opts.decisionId;
  }
}

/**
 * Convenience factory. All harness throw sites call this rather than `new`
 * so the call-site reads like structured error data.
 */
export function makeHarnessError(
  code: HarnessErrorCode,
  message: string,
  ctx: {
    readonly trace_id: string;
    readonly tenant_id: string;
    readonly tool_name?: string;
    readonly mode?: ToolMode;
    readonly planId?: string;
    readonly decisionId?: string;
    readonly cause?: unknown;
    readonly retryable?: boolean;
  },
): HarnessError {
  const opts: HarnessErrorOpts = {
    code,
    message,
    trace_id: ctx.trace_id,
    tenant_id: ctx.tenant_id,
    retryable: ctx.retryable ?? false,
    ...(ctx.tool_name !== undefined && { tool_name: ctx.tool_name }),
    ...(ctx.mode !== undefined && { mode: ctx.mode }),
    ...(ctx.planId !== undefined && { planId: ctx.planId }),
    ...(ctx.decisionId !== undefined && { decisionId: ctx.decisionId }),
    ...(ctx.cause !== undefined && { cause: ctx.cause }),
  };
  return new HarnessError(opts);
}
