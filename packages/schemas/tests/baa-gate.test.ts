import { describe, expect, it } from 'vitest';

import { LobYamlV1Schema, PiiPolicyYamlSchema, checkBaaGate } from '../src/index.js';

const lob = (overrides: Record<string, unknown> = {}) =>
  LobYamlV1Schema.parse({
    lob_mappings: {
      acme_grouphealth: {
        canonical: 'GroupHealth',
        uwcenter_rule_set: 'AcmeHealthRuleSet',
        coverage_typelist: 'HealthCoverage',
        ...overrides,
      },
    },
  });

const pii = (baaEnabled: boolean) =>
  PiiPolicyYamlSchema.parse({
    classes: {},
    baa_required: { enabled: baaEnabled },
  });

describe('checkBaaGate (SA-6 + MS-6 cross-file invariant)', () => {
  it('passes when no LOB carries lob_class:health, regardless of baa_required', () => {
    const result = checkBaaGate(lob({ lob_class: 'non_health' }), pii(false));
    expect(result.ok).toBe(true);
  });

  it('passes when lob_class is omitted (Zod default makes it non_health)', () => {
    // Backward compat: legacy profiles without `lob_class` keep working.
    const result = checkBaaGate(lob(), pii(false));
    expect(result.ok).toBe(true);
  });

  it('passes when lob_class:health and baa_required.enabled:true', () => {
    const result = checkBaaGate(lob({ lob_class: 'health' }), pii(true));
    expect(result.ok).toBe(true);
  });

  it('fails when lob_class:health and baa_required.enabled:false, naming the offending carrier code', () => {
    const result = checkBaaGate(lob({ lob_class: 'health' }), pii(false));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.offendingLobs).toEqual(['acme_grouphealth']);
    }
  });

  it('fails listing every offending LOB when multiple are misconfigured', () => {
    const multi = LobYamlV1Schema.parse({
      lob_mappings: {
        acme_grouphealth: {
          canonical: 'GroupHealth',
          uwcenter_rule_set: 'AcmeHealthRuleSet',
          coverage_typelist: 'HealthCoverage',
          lob_class: 'health',
        },
        beta_individualhealth: {
          canonical: 'IndividualHealth',
          uwcenter_rule_set: 'BetaHealthRuleSet',
          coverage_typelist: 'HealthCoverage',
          lob_class: 'health',
        },
        acme_commercialprop: {
          canonical: 'CommercialProperty',
          uwcenter_rule_set: 'AcmeCommPropRuleSet',
          coverage_typelist: 'PropertyCoverage',
          // lob_class omitted — defaults to non_health, must NOT appear in offendingLobs
        },
      },
    });
    const result = checkBaaGate(multi, pii(false));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect([...result.offendingLobs].sort()).toEqual([
        'acme_grouphealth',
        'beta_individualhealth',
      ]);
    }
  });
});
