import { describe, expect, it } from 'vitest';

import { AppError } from '../src/error.js';
import { getObservability } from '../src/factory.js';
import { refuseDbTxnDuplicate } from '../src/refusals.js';

describe('getObservability', () => {
  it('returns a handle with tracer + logger + reportError + shutdown', () => {
    const handle = getObservability({
      server_name: 'test-server',
      tenant_id: 'sandbox-jeremy-dev',
      log_level: 'silent',
    });
    expect(handle).toBeDefined();
    expect(typeof handle.reportError).toBe('function');
    expect(typeof handle.shutdown).toBe('function');
    expect(handle.tracer).toBeDefined();
    expect(handle.logger).toBeDefined();
  });

  it('opens a span via the tracer without throwing', () => {
    const handle = getObservability({
      server_name: 'test-server',
      tenant_id: 'sandbox-jeremy-dev',
      log_level: 'silent',
    });
    const span = handle.tracer.startSpan('test.span');
    span.setAttribute('tenant_id', 'sandbox-jeremy-dev');
    span.end();
    expect(span).toBeDefined();
  });

  it('reportError accepts AppError-derived instances without throwing', () => {
    const handle = getObservability({
      server_name: 'test-server',
      tenant_id: 'sandbox-jeremy-dev',
      log_level: 'silent',
    });
    const err = refuseDbTxnDuplicate({
      trace_id: '01J9X4HN5G8RXKX7P0VGAR3G7T',
      tenant_id: 'sandbox-jeremy-dev',
      tool_name: 'reconcile-this-payment',
      mode: 'approved_execute',
    });
    expect(err.code).toBe('GW_DBTRANSACTION_DUPLICATE');
    expect(() => handle.reportError(err)).not.toThrow();
  });
});

describe('AppError', () => {
  it('toSentryEvent fingerprints by [code, tool_name, mode]', () => {
    const err = new AppError({
      code: 'POLICY_DENIED',
      message: 'tier_4_blocked',
      trace_id: 't',
      tenant_id: 'a',
      tool_name: 'reconcile-this-payment',
      mode: 'approved_execute',
    });
    const ev = err.toSentryEvent();
    expect(ev.fingerprint).toEqual(['POLICY_DENIED', 'reconcile-this-payment', 'approved_execute']);
    expect(ev.tags.code).toBe('POLICY_DENIED');
  });
});
