import type { Tracer } from '@opentelemetry/api';
import type pino from 'pino';

import type { AppError } from './error.js';

/**
 * Configuration shape for `getObservability()`. Loaded from SOPS-encrypted
 * `secrets.<env>.sops.yaml` at runtime (per 05-TECHNICAL-SPEC § 4.9). Never
 * logs raw values.
 */
export interface ObservabilityOpts {
  readonly server_name: string;
  readonly tenant_id: string;
  readonly otlp_endpoint?: string | undefined;
  readonly sentry_dsn?: string | undefined;
  readonly log_level?: pino.LevelWithSilent;
}

/**
 * The handle every package consumes. `tracer` is OpenTelemetry-scoped to
 * this server/tool; `logger` is pino with the mandatory fields pre-bound;
 * `reportError` Sentry-tags + sends.
 */
export interface ObservabilityHandle {
  readonly tracer: Tracer;
  readonly logger: pino.Logger;
  readonly reportError: (err: AppError) => void;
  readonly shutdown: () => Promise<void>;
}
