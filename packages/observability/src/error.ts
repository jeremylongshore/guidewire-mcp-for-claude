import type { ToolMode } from '@intentsolutions/guidewire-schemas';

/**
 * Typed error class — every `throw` in `servers/*` and
 * `packages/harness/` MUST inherit from this so Sentry receives consistent
 * tags and the bead-pipeline can correlate (05-TECHNICAL-SPEC § 4.5 + § 4.7
 * arch rule).
 *
 * `HarnessError` (in `packages/harness/`) extends this; the
 * `GW_DBTRANSACTION_DUPLICATE` code is the librarian P1 corollary surfacing
 * when Guidewire returns `AlreadyExecutedException`.
 */
export interface AppErrorOpts {
  readonly code: string;
  readonly message: string;
  readonly trace_id: string;
  readonly tenant_id: string;
  readonly tool_name?: string;
  readonly mode?: ToolMode;
  readonly retryable?: boolean;
  readonly cause?: unknown;
}

export interface SentryEventLike {
  readonly tags: Readonly<Record<string, string | undefined>>;
  readonly fingerprint: readonly string[];
  readonly extra: Readonly<Record<string, unknown>>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly trace_id: string;
  public readonly tenant_id: string;
  public readonly tool_name?: string;
  public readonly mode?: ToolMode;
  public readonly retryable: boolean;
  public override readonly cause?: unknown;

  constructor(opts: AppErrorOpts) {
    super(opts.message);
    this.name = 'AppError';
    this.code = opts.code;
    this.trace_id = opts.trace_id;
    this.tenant_id = opts.tenant_id;
    if (opts.tool_name !== undefined) this.tool_name = opts.tool_name;
    if (opts.mode !== undefined) this.mode = opts.mode;
    this.retryable = opts.retryable ?? false;
    if (opts.cause !== undefined) this.cause = opts.cause;
  }

  /**
   * Sentry tagging produces a fingerprint of `[code, tool_name, mode]` so
   * the same refusal across multiple tenants groups into one Sentry issue
   * rather than fragmenting (05-TECHNICAL-SPEC § 4.5).
   */
  toSentryEvent(): SentryEventLike {
    return {
      tags: {
        code: this.code,
        tool_name: this.tool_name,
        mode: this.mode,
        tenant_id: this.tenant_id,
        retryable: String(this.retryable),
      },
      fingerprint: [this.code, this.tool_name ?? 'unknown', this.mode ?? 'unknown'],
      extra: {
        trace_id: this.trace_id,
        cause: this.cause,
      },
    };
  }
}
