import { z } from 'zod';

/**
 * `events.yaml` — App Events subscription configuration per 02-PRD § 6.9.
 * `shard_by` MUST equal `primaryObject.id` (any other value is a CI
 * failure — the safe-ordering refinement of D-004 is not negotiable).
 */
export const EventSubscriptionSchema = z.object({
  event_type: z.string().min(1),
  subscription_id: z.string().min(1),
  consumer_target: z.string().min(1),
  filter: z.string().optional(),
});
export type EventSubscription = z.infer<typeof EventSubscriptionSchema>;

export const EventsYamlSchema = z.object({
  subscriptions: z.array(EventSubscriptionSchema),
  delivery: z.object({
    retry_policy: z.string().min(1),
    shard_by: z.literal('primaryObject.id'),
  }),
  replay: z.object({
    retention_days: z.number().int().positive(),
  }),
});
export type EventsYaml = z.infer<typeof EventsYamlSchema>;
