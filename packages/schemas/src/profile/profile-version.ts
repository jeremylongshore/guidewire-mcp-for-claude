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
