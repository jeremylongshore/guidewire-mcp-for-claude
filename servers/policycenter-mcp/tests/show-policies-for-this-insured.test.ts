import { describe, expect, it } from 'vitest';

import { tool } from '../src/tools/show-policies-for-this-insured.js';
import { buildToolContext, jsonResponse } from './_helpers.js';

describe('show-policies-for-this-insured', () => {
  it('declares carrier-vocabulary metadata per E2 manifest contract', () => {
    expect(tool.name).toBe('show-policies-for-this-insured');
    expect(tool.mode).toBe('read_only');
    expect(tool.epicTag).toBe('E2');
    expect(tool.requiredProfileFiles).toContain('lob.yaml');
    expect(tool.requiredProfileFiles).toContain('typelists.yaml');
    expect(tool.description).toMatch(/ · /);
  });

  it('queries PC Policy API with accountId filter + alias-maps the response', async () => {
    // Response shape from the PC apiref Policy API
    // (https://docs.guidewire.com/cloud/pc/202503/apiref/) — envelope
    // pattern matches every list-shaped PC endpoint per the librarian KB.
    const { ctx, fetchSpy } = buildToolContext(async () =>
      jsonResponse({
        count: 1,
        total: 1,
        data: [
          {
            id: 'pc:Policy:42',
            attributes: {
              policyNumber: 'POL-998877',
              policyStatus: 'InForce',
              productCode: 'CommercialProperty',
              effectiveDate: '2026-01-01',
              expirationDate: '2027-01-01',
            },
          },
        ],
      }),
    );

    const result = await tool.handler(
      { accountId: 'pc:Account:7', pageSize: 20, pageOffset: 0 },
      ctx,
    );

    expect(result.accountId).toBe('pc:Account:7');
    expect(result.count).toBe(1);
    expect(result.policies[0]?.policyNumber).toBe('POL-998877');
    // The default profile alias map turns `productCode` → `lineOfBusiness`.
    expect(result.policies[0]?.lineOfBusiness).toBe('CommercialProperty');
    expect(result.policies[0]?.effectiveDate).toBe('2026-01-01');

    const req = fetchSpy.mock.calls[0]?.[0];
    expect(req?.url).toContain('/policy/v1/policies');
    expect(req?.url).toContain(`accountId=${encodeURIComponent('pc:Account:7')}`);
  });

  it('handles empty result sets (no submissions / no policies — common for new insureds)', async () => {
    const { ctx, auditEvents } = buildToolContext(async () =>
      jsonResponse({ count: 0, total: 0, data: [] }),
    );

    const result = await tool.handler(
      { accountId: 'pc:Account:new', pageSize: 20, pageOffset: 0 },
      ctx,
    );

    expect(result.policies).toHaveLength(0);
    expect(result.count).toBe(0);
    expect(auditEvents[1]?.eventType).toBe('execute.completed');
    expect(auditEvents[1]?.resultCount).toBe(0);
  });
});
