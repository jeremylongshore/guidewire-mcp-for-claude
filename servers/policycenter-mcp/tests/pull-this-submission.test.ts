import { describe, expect, it } from 'vitest';

import { tool } from '../src/tools/pull-this-submission.js';
import { buildToolContext, jsonResponse } from './_helpers.js';

describe('pull-this-submission', () => {
  it('declares carrier-vocabulary metadata per E2 manifest contract', () => {
    expect(tool.name).toBe('pull-this-submission');
    expect(tool.mode).toBe('read_only');
    expect(tool.epicTag).toBe('E2');
    expect(tool.requiredProfileFiles).toContain('field-aliases.yaml');
  });

  it('reads a single PC Job resource and surfaces full attributes', async () => {
    // PC Job single-resource read per
    //   https://docs.guidewire.com/cloud/pc/202503/apiref/
    const { ctx, fetchSpy } = buildToolContext(async () =>
      jsonResponse({
        data: {
          id: 'pc:Job:0001',
          attributes: {
            jobNumber: 'SUB-100123',
            jobStatus: 'Open',
            jobSubtype: 'Submission',
            assignedToUser: 'actor:underwriter@demo',
            premium: { amount: '15000.00', currency: 'USD' },
          },
        },
      }),
    );

    const pulled = await tool.handler({ jobId: 'pc:Job:0001' }, ctx);

    expect(pulled.submissionNumber).toBe('SUB-100123');
    expect(pulled.status).toBe('Open');
    expect(pulled.kind).toBe('Submission');
    // Full attributes round-trip — Money typing preserved (per 008 § 11).
    expect(pulled.attributes).toMatchObject({
      jobNumber: 'SUB-100123',
      premium: { amount: '15000.00', currency: 'USD' },
    });

    const req = fetchSpy.mock.calls[0]?.[0];
    expect(req?.url).toContain('/job/v1/jobs/pc%3AJob%3A0001');
  });

  it('emits execute.failed audit when sandbox 5xx occurs (NO MOCKS, real boundary failure)', async () => {
    const { ctx, auditEvents } = buildToolContext(async () =>
      jsonResponse({ error: 'ServiceUnavailable' }, 503),
    );

    await expect(tool.handler({ jobId: 'pc:Job:0002' }, ctx)).rejects.toThrow(
      /Cloud API returned 503/,
    );

    expect(auditEvents.find((e) => e.eventType === 'execute.failed')).toBeDefined();
  });
});
