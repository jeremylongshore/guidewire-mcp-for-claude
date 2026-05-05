import { describe, expect, it } from 'vitest';

import { tool } from '../src/tools/summarize-this-submission.js';
import { buildToolContext, jsonResponse } from './_helpers.js';

describe('summarize-this-submission', () => {
  it('declares carrier-vocabulary metadata per E2 manifest contract', () => {
    expect(tool.name).toBe('summarize-this-submission');
    expect(tool.mode).toBe('read_only');
    expect(tool.epicTag).toBe('E2');
    expect(tool.description).toMatch(/ · /);
  });

  it('reads a single PC Job resource and surfaces alias-mapped fields', async () => {
    // PC Job single-resource read shape per
    //   https://docs.guidewire.com/cloud/pc/202503/apiref/
    // returns `{ data: { id, attributes, links? } }` (no array).
    const { ctx, fetchSpy } = buildToolContext(async () =>
      jsonResponse({
        data: {
          id: 'pc:Job:0001',
          attributes: {
            jobNumber: 'SUB-100123',
            jobStatus: 'Quoted',
            jobSubtype: 'Submission',
            assignedToUser: 'actor:underwriter@demo',
            accountId: 'pc:Account:7',
          },
        },
      }),
    );

    const detail = await tool.handler({ jobId: 'pc:Job:0001' }, ctx);

    expect(detail.submissionNumber).toBe('SUB-100123');
    expect(detail.kind).toBe('Submission');
    expect(detail.insuredAccountId).toBe('pc:Account:7');

    const req = fetchSpy.mock.calls[0]?.[0];
    expect(req?.method).toBe('GET');
    expect(req?.url).toContain('/job/v1/jobs/pc%3AJob%3A0001');
  });

  it('surfaces a tool_error refusal when Cloud API returns 404 (D-008 NO MOCKS — real boundary failure)', async () => {
    const { ctx, auditEvents } = buildToolContext(async () =>
      jsonResponse({ error: 'NotFound' }, 404),
    );

    await expect(tool.handler({ jobId: 'pc:Job:does-not-exist' }, ctx)).rejects.toThrow(
      /Cloud API returned 404/,
    );

    expect(auditEvents.find((e) => e.eventType === 'execute.failed')).toBeDefined();
  });
});
