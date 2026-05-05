import { z } from 'zod';

/**
 * `typelists.yaml` — typelist value mappings per 02-PRD § 6.4. Typelists are
 * extensible per carrier; treat enum-shaped Cloud API fields as
 * `string` + profile-validated, NOT as closed enums (008 § 4.4 + § 12
 * "avoid" item 8).
 */
export const TypelistEntrySchema = z.object({
  source: z.enum(['base', 'customer_extended']),
  base_uri: z.string().url(),
  values: z
    .array(
      z.object({
        code: z.string().min(1),
        label: z.string(),
        carrier_extension: z.boolean().optional(),
      }),
    )
    .optional(),
});
export type TypelistEntry = z.infer<typeof TypelistEntrySchema>;

export const TypelistsYamlSchema = z.object({
  typelists: z.record(TypelistEntrySchema),
});
export type TypelistsYaml = z.infer<typeof TypelistsYamlSchema>;
