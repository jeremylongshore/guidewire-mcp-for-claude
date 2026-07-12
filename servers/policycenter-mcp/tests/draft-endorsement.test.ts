import { describe, expect, it } from 'vitest';

import { tool } from '../src/tools/draft-endorsement.js';
import { TEST_ACTOR_ID, buildToolContext, jsonResponse } from './_helpers.js';

describe('draft-endorsement', () => {
  it('declares carrier-vocabulary metadata per E5 manifest contract', () => {
    expect(tool.name).toBe('draft-endorsement');
    expect(tool.mode).toBe('draft_only');
    expect(tool.epicTag).toBe('E5');
    expect(tool.requiresHarnessExecute).toBe(true);
    expect(tool.incompleteWithoutProfile).toBe(false);
    expect(tool.requiredProfileFiles).toContain('field-aliases.yaml');
    expect(tool.description).toMatch(/ · /);
  });

  it('composes an endorsement draft and records it in the harness', async () => {
    const { ctx, fetchSpy, auditEvents } = buildToolContext(async () =>
      jsonResponse({
        data: {
          id: 'pc:Policy:0001',
          attributes: {
            policyNumber: '42-100123',
            productCode: 'BusinessOwners',
            effectiveDate: '2026-01-01',
            expirationDate: '2027-01-01',
          },
        },
      }),
    );

    const result = await tool.handler(
      {
        policyNumber: '42-100123',
        endorsementDescription: 'Add new location at 123 Main St.',
        effectiveDate: '2026-06-01',
      },
      ctx,
    );

    // Verify draft artifact shape
    expect(result.format).toBe('endorsement');
    expect(result.body).toContain('ENDORSEMENT PROPOSAL: Policy 42-100123');
    expect(result.body).toContain('Line of Business: BusinessOwners');
    expect(result.body).toContain('Proposed Change: Add new location at 123 Main St.');
    expect(result.body).toContain('Requested Effective Date: 2026-06-01');
    expect(result.body).toContain(`Drafted by: ${TEST_ACTOR_ID}`);
    expect(result.hashSummary).toHaveLength(64); // sha256 hex
    expect(result.draftId).toHaveLength(64); // planId hex

    // Verify Cloud API call (read-only)
    const req = fetchSpy.mock.calls[0]?.[0];
    expect(req?.method).toBe('GET');
    expect(req?.url).toContain('/policy/v1/policies/42-100123');

    // Verify harness execution (no side effect on Guidewire API)
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Only the read call

    // Verify read-side audit (Persona 5)
    expect(auditEvents).toHaveLength(2);
    expect(auditEvents[0]?.eventType).toBe('execute.started');
    expect(auditEvents[1]?.eventType).toBe('execute.completed');
  });

  it('fails loudly + audits when policy is not found (NO MOCKS rule)', async () => {
    const { ctx, auditEvents } = buildToolContext(async () =>
      jsonResponse({ error: 'Not Found' }, 404),
    );

    await expect(
      tool.handler({ policyNumber: '42-MISSING', endorsementDescription: 'Test' }, ctx),
    ).rejects.toThrow(/Cloud API returned 404/);

    expect(auditEvents).toHaveLength(2);
    expect(auditEvents[0]?.eventType).toBe('execute.started');
    expect(auditEvents[1]?.eventType).toBe('execute.failed');
  });
});
