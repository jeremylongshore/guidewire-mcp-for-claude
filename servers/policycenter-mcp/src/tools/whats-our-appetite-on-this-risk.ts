/**
 * Tool: `whats-our-appetite-on-this-risk`
 *
 * Risk appetite lookup for line underwriters.
 * Part of E5 Buildout (07-ROADMAP § E5).
 *
 * Mode: `read_only`.
 *
 * ⚠ INCOMPLETE WITHOUT PROFILE: This tool hits UWCenter rule entities
 * which are entirely carrier-defined. It ships with a refusal banner until
 * the active profile defines the rule-entity mapping.
 *
 * Per 02-PRD § 3.1.1 + 07-ROADMAP § E5.
 */

import { z } from 'zod';

import { type ToolContext, type TypedToolManifestEntry, formatDescription } from '../manifest.js';

const argsSchema = z.object({
  /** Submission number to check appetite against. */
  submissionNumber: z.string().min(1),
});

export type WhatsOurAppetiteArgs = z.infer<typeof argsSchema>;

export interface WhatsOurAppetiteResult {
  readonly appetite: 'Accept' | 'Refer' | 'Decline' | 'Unknown';
  readonly reasons: readonly string[];
}

export const tool: TypedToolManifestEntry<typeof argsSchema, WhatsOurAppetiteResult> = {
  name: 'whats-our-appetite-on-this-risk',
  version: '0.1.0',
  mode: 'read_only',
  vocabulary: {
    question: 'What is our appetite on this risk?',
    whenToUse:
      'To check if a submission aligns with the carrier’s current underwriting guidelines and risk appetite.',
  },
  get description(): string {
    return formatDescription(this.vocabulary);
  },
  inputSchema: argsSchema,
  requiredProfileSchema: '>=v1.0',
  requiredProfileFiles: ['field-aliases.yaml', 'custom-entities.yaml'],
  epicTag: 'E5',
  personas: [2],
  requiresHarnessExecute: false,
  incompleteWithoutProfile: true, // Surfaces refusal until profile is ready

  async handler(_args: WhatsOurAppetiteArgs, _ctx: ToolContext): Promise<WhatsOurAppetiteResult> {
    // This tool is gated by incompleteWithoutProfile: true in the runtime.
    // If the runtime invokes this handler, it means the profile is present.
    throw new Error('Not implemented: UWCenter rule entity mapping required in profile.');
  },
};
