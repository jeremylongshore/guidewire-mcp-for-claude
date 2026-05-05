import type { ToolMode } from '@intentsolutions/guidewire-schemas';

import { AppError } from './error.js';

/**
 * Refusal-helper signatures per 05-TECHNICAL-SPEC § 4.5. Every named
 * refusal scenario from 006-DR-MEMO has a typed constructor; this is the
 * minimum E1 set, expanded as harness/server code lands.
 *
 * `refuseDbTxnDuplicate` is the librarian P1 specific helper — surfaces
 * when Guidewire returns `AlreadyExecutedException` because the harness's
 * own cache missed the duplicate (forensic-only path; the harness should
 * absorb the duplicate via its `gwh1:` cache before this fires).
 */
export interface ErrorCtx {
  readonly trace_id: string;
  readonly tenant_id: string;
  readonly tool_name?: string;
  readonly mode?: ToolMode;
  readonly cause?: unknown;
}

export const refuseAuthExpired = (ctx: ErrorCtx): AppError =>
  new AppError({
    code: 'AUTH_EXPIRED',
    message: 'OAuth token expired before write completed',
    retryable: true,
    ...ctx,
  });

export const refuseSandboxDown = (ctx: ErrorCtx): AppError =>
  new AppError({
    code: 'GW_CLOUD_UNREACHABLE',
    message: 'Guidewire Cloud sandbox host is unreachable',
    retryable: true,
    ...ctx,
  });

export const refuseIdempMismatch = (ctx: ErrorCtx): AppError =>
  new AppError({
    code: 'IDEMPOTENCY_MISMATCH',
    message: 'Idempotency key matched but cached response is structurally different',
    retryable: false,
    ...ctx,
  });

export const refuseDbTxnDuplicate = (ctx: ErrorCtx): AppError =>
  new AppError({
    code: 'GW_DBTRANSACTION_DUPLICATE',
    message:
      'Guidewire rejected GW-DBTransaction-ID as duplicate (AlreadyExecutedException) — ' +
      'harness cache missed the replay; forensic-only path',
    retryable: false,
    ...ctx,
  });

export const refuseModeMismatch = (ctx: ErrorCtx): AppError =>
  new AppError({
    code: 'MODE_MISMATCH',
    message: 'Tool invoked in a mode that does not match its declared metadata',
    retryable: false,
    ...ctx,
  });

export const refuseChainBroken = (ctx: ErrorCtx): AppError =>
  new AppError({
    code: 'CHAIN_BROKEN',
    message: 'verifyChain detected a hash mismatch; refusing all writes for this tenant',
    retryable: false,
    ...ctx,
  });
