import { z } from 'zod';
import { ToolModeSchema } from '../harness/plan.js';

/**
 * `roles.yaml` — role × tool × mode permission matrix per 02-PRD § 6.2.
 * Validation rule: every referenced tool must exist in the corresponding
 * server's manifest (boot-time fail-fast).
 */
export const RolesYamlSchema = z.object({
  roles: z.record(z.record(z.record(ToolModeSchema))),
});
export type RolesYaml = z.infer<typeof RolesYamlSchema>;
