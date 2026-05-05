import { describe, expect, it } from 'vitest';

import { tool } from '../src/tools/find-submissions-waiting-on-me.js';
import { TEST_ACTOR_ID, buildToolContext, jsonResponse } from './_helpers.js';

describe('find-submissions-waiting-on-me', () => {
  it('declares carrier-vocabulary metadata per E2 manifest contract', () => {
    expect(tool.name).toBe('find-submissions-waiting-on-me');
    expect(tool.mode).toBe('read_only');
    expect(tool.epicTag).toBe('E2');
    expect(tool.requiresHarnessExecute).toBe(false);
    expect(tool.incompleteWithoutProfile).toBe(false);
    expect(tool.requiredProfileFiles).toContain('roles.yaml');
    expect(tool.requiredProfileFiles).toContain('field-aliases.yaml');
    // CV-6 description-shape rule
    expect(tool.description).toMatch(/ · /);
  });

  it('queries PC Job API with subtype=Submission + assignedToUser + status=Open', async () => {
    // Response shape derived from the Guidewire PC apiref Job API:
    //   https://docs.guidewire.com/cloud/pc/202503/apiref/
    // Envelope shape `{ count, total, data: [{ id, attributes }] }` matches
    // every list-shaped PC endpoint per the librarian KB.
    const { ctx, fetchSpy } = buildToolContext(async () =>
      jsonResponse({
        count: 2,
        total: 2,
        data: [
          {
            id: 'pc:Job:0001',
            attributes: {
              jobNumber: 'SUB-100123',
              jobStatus: 'Open',
              jobSubtype: 'Submission',
              assignedToUser: TEST_ACTOR_ID,
            },
          },
          {
            id: 'pc:Job:0002',
            attributes: {
              jobNumber: 'SUB-100124',
              jobStatus: 'Open',
              jobSubtype: 'Submission',
              assignedToUser: TEST_ACTOR_ID,
            },
          },
        ],
      }),
    );

    const result = await tool.handler({ pageSize: 20, pageOffset: 0 }, ctx);

    expect(result.count).toBe(2);
    expect(result.submissions).toHaveLength(2);
    expect(result.submissions[0]?.submissionNumber).toBe('SUB-100123');
    expect(result.submissions[0]?.assignedTo).toBe(TEST_ACTOR_ID);
    expect(result.submissions[0]?.status).toBe('Open');

    const req = fetchSpy.mock.calls[0]?.[0];
    expect(req?.method).toBe('GET');
    expect(req?.url).toContain('/job/v1/jobs');
    expect(req?.url).toContain('subtype=Submission');
    expect(req?.url).toContain(`assignedToUser=${encodeURIComponent(TEST_ACTOR_ID)}`);
    expect(req?.url).toContain('status=Open');
    expect(req?.url).toContain('pageSize=20');
  });

  it('emits read-side audit events on success (Persona 5 exfil concern, 006 § 1.1)', async () => {
    const { ctx, auditEvents } = buildToolContext(async () =>
      jsonResponse({ count: 0, total: 0, data: [] }),
    );

    await tool.handler({ pageSize: 20, pageOffset: 0 }, ctx);

    expect(auditEvents).toHaveLength(2);
    expect(auditEvents[0]?.eventType).toBe('execute.started');
    expect(auditEvents[0]?.mode).toBe('read_only');
    expect(auditEvents[1]?.eventType).toBe('execute.completed');
    expect(auditEvents[1]?.resultCount).toBe(0);
    expect(typeof auditEvents[1]?.latencyMs).toBe('number');
  });

  it('emits execute.failed audit + rethrows when Cloud API returns 401 (NO MOCKS, real boundary failure)', async () => {
    const { ctx, auditEvents } = buildToolContext(async () =>
      jsonResponse({ error: 'Unauthorized' }, 401),
    );

    await expect(tool.handler({ pageSize: 20, pageOffset: 0 }, ctx)).rejects.toThrow(
      /Cloud API returned 401/,
    );

    expect(auditEvents).toHaveLength(2);
    expect(auditEvents[0]?.eventType).toBe('execute.started');
    expect(auditEvents[1]?.eventType).toBe('execute.failed');
    expect(auditEvents[1]?.decisionReason).toMatch(/401/);
  });
});
