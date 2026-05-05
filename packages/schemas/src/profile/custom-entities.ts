import { z } from 'zod';

/**
 * `custom-entities.yaml` — custom entity → tool input mappings per 02-PRD
 * § 6.5. Custom entities are emitted per-tenant Swagger; the `api_path` is
 * what makes the tool work against this carrier.
 */
export const CustomEntityFieldSchema = z.record(z.string(), z.string());

export const CustomEntitySchema = z.object({
  parent_entity: z.string().min(1),
  relation: z.string().min(1),
  required_fields: z.array(CustomEntityFieldSchema),
  optional_fields: z.array(CustomEntityFieldSchema).optional(),
  api_path: z.string().regex(/^\/[a-z][a-z0-9/_{}-]*$/i),
});
export type CustomEntity = z.infer<typeof CustomEntitySchema>;

export const CustomEntitiesYamlSchema = z.object({
  custom_entities: z.record(CustomEntitySchema),
});
export type CustomEntitiesYaml = z.infer<typeof CustomEntitiesYamlSchema>;
