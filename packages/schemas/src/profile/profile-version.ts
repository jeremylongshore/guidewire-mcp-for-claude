import { z } from 'zod';

/**
 * Profile schema version per D-020. Tools declare `requiredProfileSchema:
 * ">=v2.0"` in their metadata; boot-time validation refuses to load tools
 * whose required schema is not satisfied.
 */
export const ProfileSchemaVersionSchema = z.enum(['v1.0', 'v2.0']);
export type ProfileSchemaVersion = z.infer<typeof ProfileSchemaVersionSchema>;

export const ProfileRootSchema = z.object({
  schemaVersion: ProfileSchemaVersionSchema,
  tenantId: z.string().min(1),
});
export type ProfileRoot = z.infer<typeof ProfileRootSchema>;

/**
 * `manifest.yaml` — profile root metadata per 02-PRD § 6.0a and E4.
 * Extends ProfileRootSchema with the fields a full manifest carries:
 * display name, cloud release pin, declared LOBs, declared servers,
 * and the audit-harness checksum slot.
 *
 * Validation rule: tenantId + schemaVersion are load-time required;
 * all other fields are optional (passthrough) so carriers can add
 * tenant-specific metadata without breaking the loader.
 */
export const ManifestYamlSchema = ProfileRootSchema.extend({
  displayName: z.string().optional(),
  cloudRelease: z.enum(['Innsbruck', 'Las Leñas', 'Palisades']).optional(),
  declaredLobs: z.array(z.string()).optional(),
  declaredServers: z.array(z.string()).optional(),
  profileChecksum: z.string().optional(),
}).passthrough();
export type ManifestYaml = z.infer<typeof ManifestYamlSchema>;
