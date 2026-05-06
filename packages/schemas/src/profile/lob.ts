import { z } from 'zod';

/**
 * `lob.yaml` — LOB code mappings per 02-PRD § 6.3. The only place LOB code
 * mapping lives. Hard-coded LOB or typelist values in tool source = CI
 * failure (008 § 4.3 + § 12 "avoid" item 1).
 *
 * v2.0 (D-020) — adds `aggregations:` map inside this file (NOT a 10th
 * YAML file). Models the dimensions Persona 9's E2.5 tools query: class,
 * segment, region, declination-pattern, cycle-time. Each dimension declares
 * its source field, grouping rule, and rollup unit.
 */
export const LobClassSchema = z.enum(['health', 'non_health']);
export type LobClass = z.infer<typeof LobClassSchema>;

export const LobMappingSchema = z.object({
  canonical: z.string().min(1),
  uwcenter_rule_set: z.string().min(1),
  coverage_typelist: z.string().min(1),
  /**
   * SA-6 + MS-6: defaults to `non_health`. LOBs declared `health` MUST be
   * paired with `pii-policy.yaml.baa_required.enabled: true`. Cross-file
   * enforcement lives in `checkBaaGate()` in `./baa-gate.ts` — the loader
   * raises a `BAA_GATE_MISSING` failure at boot if the invariant is broken.
   */
  lob_class: LobClassSchema.default('non_health'),
});
export type LobMapping = z.infer<typeof LobMappingSchema>;

export const AggregationDimensionSchema = z.object({
  source_field: z.string().min(1),
  grouping_rule: z.string().min(1),
  rollup_unit: z.enum(['count', 'sum', 'avg', 'p50', 'p90', 'p99']),
});
export type AggregationDimension = z.infer<typeof AggregationDimensionSchema>;

export const LobYamlV1Schema = z.object({
  lob_mappings: z.record(LobMappingSchema),
});
export type LobYamlV1 = z.infer<typeof LobYamlV1Schema>;

export const LobYamlV2Schema = LobYamlV1Schema.extend({
  aggregations: z.record(AggregationDimensionSchema).optional(),
});
export type LobYamlV2 = z.infer<typeof LobYamlV2Schema>;
