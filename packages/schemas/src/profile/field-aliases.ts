import { z } from 'zod';

/**
 * `field-aliases.yaml` per 02-PRD § 6.6.
 *
 * Money typing is non-negotiable per 008 § 11: `{ amount: string,
 * currency: string }` — `amount` is string for arbitrary precision (do NOT
 * use JS `number` for financial values); currency precision varies (USD =
 * 2dp, JPY = 0dp); stripping currency is a catastrophic error for
 * multi-currency carriers.
 *
 * Date / datetime distinction is per-field (date-only vs datetime with TZ).
 */
export const DateFormatSchema = z.enum(['ISO_8601_date', 'ISO_8601_datetime']);

export const FieldAliasesYamlSchema = z.object({
  aliases: z.record(z.record(z.string())),
  money_fields: z.array(z.string()),
  date_fields: z.array(
    z.object({
      field: z.string().min(1),
      format: DateFormatSchema,
    }),
  ),
});
export type FieldAliasesYaml = z.infer<typeof FieldAliasesYamlSchema>;
