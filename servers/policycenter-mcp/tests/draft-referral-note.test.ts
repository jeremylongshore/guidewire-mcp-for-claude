import { describe, expect, it } from 'vitest';

import { tool } from '../src/tools/draft-referral-note.js';
import { TEST_ACTOR_ID, buildToolContext, jsonResponse } from './_helpers.js';

describe('draft-referral-note', () => {
  it('declares carrier-vocabulary metadata per E5 manifest contract', () => {
    expect(tool.name).toBe('draft-referral-note');
    expect(tool.mode).toBe('draft_only');
    expect(tool.epicTag).toBe('E5');
    expect(tool.requiresHarnessExecute).toBe(true);
    expect(tool.incompleteWithoutProfile).toBe(false);
    expect(tool.requiredProfileFiles).toContain('field-aliases.yaml');
    expect(tool.description).toMatch(/ · /);
  });

  it('composes a referral note draft and records it in the harness', async () => {
    const { ctx, fetchSpy, auditEvents } = buildToolContext(async () =>
      jsonResponse({
        data: {
          id: 'pc:Job:0001',
          attributes: {
            jobNumber: 'SUB-100123',
            productCode: 'CommercialProperty',
          },
        },
      }),
    );

    const result = await tool.handler(
      {
        submissionNumber: 'SUB-100123',
        referralReason: 'Large premium beyond local authority.',
        notes: 'Checking with senior UW.',
      },
      ctx,
    );

    // Verify draft artifact shape
    expect(result.format).toBe('referral-note');
    expect(result.body).toContain('REFERRAL NOTE: Submission SUB-100123');
    expect(result.body).toContain('Line of Business: CommercialProperty');
    expect(result.body).toContain('Escalation Reason: Large premium beyond local authority.');
    expect(result.body).toContain('Notes: Checking with senior UW.');
    expect(result.body).toContain(`Drafted by: ${TEST_ACTOR_ID}`);
    expect(result.hashSummary).toHaveLength(64); // sha256 hex
    expect(result.draftId).toHaveLength(64); // planId hex

    // Verify Cloud API call (read-only)
    const req = fetchSpy.mock.calls[0]?.[0];
    expect(req?.method).toBe('GET');
    expect(req?.url).toContain('/job/v1/jobs/SUB-100123');

    // Verify harness execution (no side effect on Guidewire API)
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Only the read call

    // Verify read-side audit (Persona 5)
    expect(auditEvents).toHaveLength(2);
    expect(auditEvents[0]?.eventType).toBe('execute.started');
    expect(auditEvents[1]?.eventType).toBe('execute.completed');
  });

  it('fails loudly + audits when submission is not found (NO MOCKS rule)', async () => {
    const { ctx, auditEvents } = buildToolContext(async () =>
      jsonResponse({ error: 'Not Found' }, 404),
    );

    await expect(
      tool.handler({ submissionNumber: 'SUB-MISSING', referralReason: 'Test' }, ctx),
    ).rejects.toThrow(/Cloud API returned 404/);

    expect(auditEvents).toHaveLength(2);
    expect(auditEvents[0]?.eventType).toBe('execute.started');
    expect(auditEvents[1]?.eventType).toBe('execute.failed');
  });
});
