import { z } from 'zod';

/**
 * `pii-policy.yaml` per 02-PRD § 6.8. Health-LOB carrier profiles MUST set
 * `baa_required.enabled: true` — the harness refuses to load a profile
 * carrying health LOBs without it (006 § 6.2 + 05-TECHNICAL-SPEC § 8.4).
 */
export const PiiHandlingSchema = z.enum([
  'redact_in_summaries',
  'redact_unless_role_in',
  'pass_through',
]);
export type PiiHandling = z.infer<typeof PiiHandlingSchema>;

export const PiiClassSchema = z.object({
  fields: z.array(z.string()),
  handling: PiiHandlingSchema,
  allowed_roles: z.array(z.string()).optional(),
});
export type PiiClass = z.infer<typeof PiiClassSchema>;

export const PiiPolicyYamlSchema = z.object({
  classes: z.record(PiiClassSchema),
  baa_required: z.object({
    enabled: z.boolean(),
  }),
});
export type PiiPolicyYaml = z.infer<typeof PiiPolicyYamlSchema>;
