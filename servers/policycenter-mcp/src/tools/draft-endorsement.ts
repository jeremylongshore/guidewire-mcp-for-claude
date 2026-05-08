/**
 * Tool: `draft-endorsement`
 *
 * Drafting tool for underwriters to propose a policy endorsement.
 * Part of E5 Buildout (07-ROADMAP § E5).
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
  /** Policy number (e.g. "42-123456"). */
  policyNumber: z.string().min(1),
  /** Description of the proposed change (endorsement). */
  endorsementDescription: z.string().min(1),
  /** Effective date of the endorsement (optional, ISO 8601). */
  effectiveDate: z.string().optional(),
});

export type DraftEndorsementArgs = z.infer<typeof argsSchema>;

export interface DraftArtifact {
  readonly draftId: string;
  readonly format: 'endorsement';
  readonly body: string;
  readonly hashSummary: string;
  readonly evidenceBundleRef: string;
}

/**
 * Raw Policy attributes for drafting.
 */
interface PolicyAttributes {
  readonly policyNumber?: string;
  readonly productCode?: string;
  readonly effectiveDate?: string;
  readonly expirationDate?: string;
}

export const tool: TypedToolManifestEntry<typeof argsSchema, DraftArtifact> = {
  name: 'draft-endorsement',
  version: '0.1.0',
  mode: 'draft_only',
  vocabulary: {
    question: 'Draft an endorsement for this policy.',
    whenToUse:
      'When you want to propose a mid-term change to an active policy and need to document the requested modification.',
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

  async handler(args: DraftEndorsementArgs, ctx: ToolContext): Promise<DraftArtifact> {
    const startedAt = Date.now();
    const span = ctx.tracer.startSpan('mcp.tool.invoke', {
      attributes: {
        tool_name: 'draft-endorsement',
        tool_version: '0.1.0',
        mode: 'draft_only',
        tenant_id: ctx.tenantId,
        policy_number: args.policyNumber,
      },
    });

    await ctx.emitAudit({
      eventType: 'execute.started',
      mode: 'draft_only',
      toolName: 'draft-endorsement',
      toolVersion: '0.1.0',
    });

    try {
      // 1. Read-side: fetch policy details to anchor the draft.
      const envelope = await ctx.client.get<Record<string, unknown>>({
        suite: 'pc',
        path: `/policy/v1/policies/${args.policyNumber}`,
      });
      const policy = extractSingle<PolicyAttributes>(envelope);

      // 2. Compose the draft narrative.
      const body = [
        `ENDORSEMENT PROPOSAL: Policy ${policy.attributes?.policyNumber ?? args.policyNumber}`,
        `Line of Business: ${policy.attributes?.productCode ?? 'Unknown'}`,
        `Current Term: ${policy.attributes?.effectiveDate ?? ''} to ${policy.attributes?.expirationDate ?? ''}`,
        '',
        `Proposed Change: ${args.endorsementDescription}`,
        args.effectiveDate ? `Requested Effective Date: ${args.effectiveDate}` : '',
        '',
        `Drafted by: ${ctx.actorId}`,
        `Timestamp: ${new Date().toISOString()}`,
      ]
        .join('\n')
        .trim();

      const hashSummary = createHash('sha256').update(body).digest('hex');

      // 3. Harness execution (draft_only flow).
      const plan = ctx.harness.plan({
        toolName: 'draft-endorsement',
        toolVersion: '0.1.0',
        mode: 'draft_only',
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        args,
        summary: `Draft endorsement for policy ${args.policyNumber}`,
        traceId: ctx.traceId,
      });

      const decision = await ctx.harness.policy(plan);

      const result = await ctx.harness.execute(plan, decision, async () => {
        return body;
      });

      const artifact: DraftArtifact = {
        draftId: plan.planId,
        format: 'endorsement',
        body: result.value,
        hashSummary,
        evidenceBundleRef: result.evidenceBundleRef,
      };

      await ctx.emitAudit({
        eventType: 'execute.completed',
        mode: 'draft_only',
        toolName: 'draft-endorsement',
        toolVersion: '0.1.0',
        latencyMs: Date.now() - startedAt,
      });

      return artifact;
    } catch (err) {
      await ctx.emitAudit({
        eventType: 'execute.failed',
        mode: 'draft_only',
        toolName: 'draft-endorsement',
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
