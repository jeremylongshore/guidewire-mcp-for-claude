/**
 * @intentsolutions/guidewire-observability
 *
 * Three-signal factory: OpenTelemetry traces + pino structured logs +
 * Sentry error capture. Wired in from day 1 per Hard Rule #6 + D-013;
 * never bolted on later.
 *
 * Per 05-TECHNICAL-SPEC § 4.
 */

export * from './error.js';
export * from './factory.js';
export * from './refusals.js';
export type * from './types.js';
