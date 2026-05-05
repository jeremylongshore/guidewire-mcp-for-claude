import { z } from 'zod';

/**
 * `auth.yaml` — Guidewire Hub OAuth + JWT propagation per 02-PRD § 6.1.
 * Token endpoint + scopes catalog finalize against dev-tier creds via
 * smoke-reach (D-021).
 */
export const AuthYamlSchema = z.object({
  oauth: z.object({
    client_id_env: z.string().min(1),
    client_secret_env: z.string().min(1),
    token_endpoint: z.string().url(),
    scopes: z.array(z.string()),
    token_lifetime_seconds: z.number().int().positive().default(3600),
    refresh_strategy: z.literal('proactive'),
    jwt_propagation: z.object({
      enabled: z.boolean(),
      actor_claim: z.string().default('sub'),
    }),
  }),
  api: z.object({
    base_url_pc: z.string().url().optional(),
    base_url_cc: z.string().url().optional(),
    base_url_bc: z.string().url().optional(),
    cloud_release: z.enum(['Innsbruck', 'Las Leñas', 'Palisades']),
  }),
});
export type AuthYaml = z.infer<typeof AuthYamlSchema>;
