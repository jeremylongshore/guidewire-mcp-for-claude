/**
 * Tool: `draft-referral-note`
 *
 * Drafting tool for underwriters to escalate a submission for referral.
 * Second step of J-1 Underwriter Triage (04-USER-JOURNEY § J-1).
 *
 * Mode: `draft_only`. Never performs a side effect in Guidewire Cloud. The
 * resulting draft must be manually applied by a human in the PolicyCenter UI.
 *
 * Per 02-PRD § 3.1.1 + 07-ROADMAP § E5.
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';

import { extractSingle } from '../field-mapping.js';
import { type ToolContext, type TypedToolManifestEntry, formatDescription } from '../manifest.js';

const argsSchema = z.object({
  /** Submission number (e.g. "6-2845-1"). */
  submissionNumber: z.string().min(1),
  /** Reason for the referral (manual escalation). */
  referralReason: z.string().min(1),
  /** Optional additional notes to include in the draft. */
  notes: z.string().optional(),
});

export type DraftReferralNoteArgs = z.infer<typeof argsSchema>;

export interface DraftArtifact {
  readonly draftId: string;
  readonly format: 'referral-note';
  readonly body: string;
  readonly hashSummary: string;
  readonly evidenceBundleRef: string;
}

/**
 * Raw Job attributes for drafting.
 */
interface JobAttributes {
  readonly jobNumber?: string;
  readonly jobStatus?: string;
  readonly productCode?: string;
}

export const tool: TypedToolManifestEntry<typeof argsSchema, DraftArtifact> = {
  name: 'draft-referral-note',
  version: '0.1.0',
  mode: 'draft_only',
  vocabulary: {
    question: 'Draft a referral note for this submission.',
    whenToUse:
      'When a submission needs underwriting-manager approval and you want to compose the escalation narrative.',
  },
  get description(): string {
    return formatDescription(this.vocabulary);
  },
  inputSchema: argsSchema,
  requiredProfileSchema: '>=v1.0',
  requiredProfileFiles: ['field-aliases.yaml'],
  epicTag: 'E5',
  personas: [2],
  requiresHarnessExecute: true,
  incompleteWithoutProfile: false,

  async handler(args: DraftReferralNoteArgs, ctx: ToolContext): Promise<DraftArtifact> {
    const startedAt = Date.now();
    const span = ctx.tracer.startSpan('mcp.tool.invoke', {
      attributes: {
        tool_name: 'draft-referral-note',
        tool_version: '0.1.0',
        mode: 'draft_only',
        tenant_id: ctx.tenantId,
        submission_number: args.submissionNumber,
      },
    });

    await ctx.emitAudit({
      eventType: 'execute.started',
      mode: 'draft_only',
      toolName: 'draft-referral-note',
      toolVersion: '0.1.0',
    });

    try {
      // 1. Read-side: fetch submission details to anchor the draft.
      // Practitioner knowledge: Job ID in URL is submissionNumber per PC Job API.
      const envelope = await ctx.client.get<Record<string, unknown>>({
        suite: 'pc',
        path: `/job/v1/jobs/${args.submissionNumber}`,
      });
      const job = extractSingle<JobAttributes>(envelope);

      // 2. Compose the draft narrative.
      // In a real implementation this might use an LLM utility; here we use
      // a structured template per E5 requirements.
      const body = [
        `REFERRAL NOTE: Submission ${job.attributes?.jobNumber ?? args.submissionNumber}`,
        `Line of Business: ${job.attributes?.productCode ?? 'Unknown'}`,
        '',
        `Escalation Reason: ${args.referralReason}`,
        args.notes ? `\nNotes: ${args.notes}` : '',
        '',
        `Drafted by: ${ctx.actorId}`,
        `Timestamp: ${new Date().toISOString()}`,
      ]
        .join('\n')
        .trim();

      const hashSummary = createHash('sha256').update(body).digest('hex');

      // 3. Harness execution (draft_only flow).
      // Governance gate (plan → policy → execute). No approval required for draft_only.
      const plan = ctx.harness.plan({
        toolName: 'draft-referral-note',
        toolVersion: '0.1.0',
        mode: 'draft_only',
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        args,
        summary: `Draft referral note for submission ${args.submissionNumber}`,
        traceId: ctx.traceId,
      });

      const decision = await ctx.harness.policy(plan);

      // execute() records the draft artifact in the audit chain.
      // The effect is pure in draft_only — no Guidewire side effect.
      const result = await ctx.harness.execute(plan, decision, async () => {
        return body;
      });

      const artifact: DraftArtifact = {
        draftId: plan.planId,
        format: 'referral-note',
        body: result.value,
        hashSummary,
        evidenceBundleRef: result.evidenceBundleRef,
      };

      await ctx.emitAudit({
        eventType: 'execute.completed',
        mode: 'draft_only',
        toolName: 'draft-referral-note',
        toolVersion: '0.1.0',
        latencyMs: Date.now() - startedAt,
      });

      return artifact;
    } catch (err) {
      await ctx.emitAudit({
        eventType: 'execute.failed',
        mode: 'draft_only',
        toolName: 'draft-referral-note',
        toolVersion: '0.1.0',
        latencyMs: Date.now() - startedAt,
        decisionReason: err instanceof Error ? err.message : 'unknown',
      });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  },
};
