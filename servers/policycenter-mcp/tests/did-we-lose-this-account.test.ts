import { describe, expect, it } from 'vitest';

import { tool } from '../src/tools/did-we-lose-this-account.js';
import { buildToolContext, jsonResponse } from './_helpers.js';

describe('did-we-lose-this-account', () => {
  it('declares carrier-vocabulary metadata per E2 manifest contract', () => {
    expect(tool.name).toBe('did-we-lose-this-account');
    expect(tool.mode).toBe('read_only');
    expect(tool.epicTag).toBe('E2');
    // CancellationReason is the typelist-drift case per librarian F-PRD-004 —
    // typelists.yaml is mandatory for label resolution.
    expect(tool.requiredProfileFiles).toContain('typelists.yaml');
    expect(tool.requiredProfileFiles).toContain('lob.yaml');
  });

  it('queries PC Policy API with status=Cancelled,Lapsed,Lost and resolves CancellationReason via typelists', async () => {
    // PC Policy API list shape per the librarian KB.
    const { ctx, fetchSpy } = buildToolContext(async () =>
      jsonResponse({
        count: 1,
        total: 1,
        data: [
          {
            id: 'pc:Policy:lost-1',
            attributes: {
              policyNumber: 'POL-LOST-001',
              policyStatus: 'Cancelled',
              productCode: 'CommercialAuto',
              cancellationReason: 'NonPayment',
              effectiveDate: '2025-01-01',
              expirationDate: '2026-01-01',
            },
          },
        ],
      }),
    );

    const result = await tool.handler(
      { accountId: 'pc:Account:7', pageSize: 20, pageOffset: 0 },
      ctx,
    );

    expect(result.lostPolicies).toHaveLength(1);
    expect(result.lostPolicies[0]?.policyNumber).toBe('POL-LOST-001');
    expect(result.lostPolicies[0]?.cancellationReason).toBe('NonPayment');
    expect(result.lostPolicies[0]?.lineOfBusiness).toBe('CommercialAuto');

    const req = fetchSpy.mock.calls[0]?.[0];
    expect(req?.url).toContain('/policy/v1/policies');
    expect(req?.url).toContain('status=Cancelled%2CLapsed%2CLost');
    expect(req?.url).toContain(`accountId=${encodeURIComponent('pc:Account:7')}`);
  });

  it('handles empty result (account never lost — should not be a refusal)', async () => {
    const { ctx, auditEvents } = buildToolContext(async () =>
      jsonResponse({ count: 0, total: 0, data: [] }),
    );

    const result = await tool.handler(
      { accountId: 'pc:Account:never-lost', pageSize: 20, pageOffset: 0 },
      ctx,
    );

    expect(result.lostPolicies).toHaveLength(0);
    expect(auditEvents[1]?.eventType).toBe('execute.completed');
  });
});
