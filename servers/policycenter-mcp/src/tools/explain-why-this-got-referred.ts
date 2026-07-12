/**
 * Tool: `explain-why-this-got-referred`
 *
 * Referral reason lookup for line underwriters.
 * Part of E5 Buildout (07-ROADMAP § E5).
 *
 * Mode: `read_only`.
 *
 * ⚠ INCOMPLETE WITHOUT PROFILE: This tool hits UWCenter rule traces
 * which are entirely carrier-defined. It ships with a refusal banner until
 * the active profile defines the rule-trace mapping.
 *
 * Per 02-PRD § 3.1.1 + 07-ROADMAP § E5.
 */

import { z } from 'zod';

import { type ToolContext, type TypedToolManifestEntry, formatDescription } from '../manifest.js';

const argsSchema = z.object({
  /** Submission number to check referral reasons for. */
  submissionNumber: z.string().min(1),
});

export type ExplainReferralArgs = z.infer<typeof argsSchema>;

export interface ExplainReferralResult {
  readonly referralReasons: readonly string[];
}

export const tool: TypedToolManifestEntry<typeof argsSchema, ExplainReferralResult> = {
  name: 'explain-why-this-got-referred',
  version: '0.1.0',
  mode: 'read_only',
  vocabulary: {
    question: 'Why did this get referred?',
    whenToUse:
      'To understand which underwriting rules triggered a referral for a specific submission.',
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

  async handler(_args: ExplainReferralArgs, _ctx: ToolContext): Promise<ExplainReferralResult> {
    throw new Error('Not implemented: UWCenter rule trace mapping required in profile.');
  },
};
