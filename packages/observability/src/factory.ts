import { type Tracer, trace } from '@opentelemetry/api';
import * as Sentry from '@sentry/node';
import pino from 'pino';

import type { AppError } from './error.js';
import type { ObservabilityHandle, ObservabilityOpts } from './types.js';

const TRACER_NAME = '@intentsolutions/guidewire-observability';

/**
 * Single import surface every package consumes (05-TECHNICAL-SPEC § 4.6).
 * Each MCP server's bootstrap calls this once at startup.
 *
 * Sentry init is conditional on `sentry_dsn` (commented-out by default in
 * `.env.sops`; activates when DSN is configured per environment). Tracing
 * uses the global OTel API — exporters are wired by SDK-node bootstrap in
 * the deployable image, not by this library factory.
 */
export function getObservability(opts: ObservabilityOpts): ObservabilityHandle {
  const logger = pino({
    level: opts.log_level ?? 'info',
    base: {
      server_name: opts.server_name,
      tenant_id: opts.tenant_id,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  const tracer: Tracer = trace.getTracer(TRACER_NAME);

  let sentryActive = false;
  if (opts.sentry_dsn !== undefined && opts.sentry_dsn.length > 0) {
    Sentry.init({
      dsn: opts.sentry_dsn,
      tracesSampleRate: 0,
      defaultIntegrations: false,
    });
    sentryActive = true;
  }

  const reportError = (err: AppError): void => {
    const event = err.toSentryEvent();
    logger.error(
      {
        code: err.code,
        trace_id: err.trace_id,
        tool_name: err.tool_name,
        mode: err.mode,
        retryable: err.retryable,
        err: { type: err.name, message: err.message },
      },
      err.message,
    );
    if (sentryActive) {
      Sentry.captureException(err, {
        tags: event.tags as Record<string, string | undefined>,
        fingerprint: [...event.fingerprint],
        extra: event.extra as Record<string, unknown>,
      });
    }
  };

  const shutdown = async (): Promise<void> => {
    if (sentryActive) {
      await Sentry.close(2000);
    }
    await new Promise<void>((resolve) => {
      logger.flush(() => resolve());
    });
  };

  return { tracer, logger, reportError, shutdown };
}
