/**
 * Tool: `summarize-this-submission`
 *
 * The elevator-pitch read on a submission before the underwriter digs in —
 * insured, LOB, premium, exposures, contact roles. Step 4 of J-1
 * Underwriter Triage (04-USER-JOURNEY § J-1).
 *
 * Cloud API endpoints:
 *   1. `GET /job/v1/jobs/{jobId}` (PC Job API single-resource read)
 *   2. PolicyCenter Composite API for fan-out reads (contacts, locations,
 *      coverages) in a single round trip — PC has Composite API per the
 *      librarian KB (`000-docs/005-DR-REF` § 1).
 *
 * Per the librarian KB: PolicyCenter has BOTH Composite API and Graph API
 * (CC has Composite only — no Graph). For E2's read-only catalog the
 * primary read pattern is the single-resource Job read; Composite API
 * fan-out for full submission summary lands as the recording-driven
 * implementation when `guidewire-adj` smoke-tests confirm the request shape.
 *
 * Per 02-PRD § 3.1.1 (line-underwriter view) — citation: 008 § 3.1.
 */

import { z } from 'zod';

import {
  type GuidewireSingleEnvelope,
  applyFieldAliases,
  extractSingle,
} from '../field-mapping.js';
import { type ToolContext, type TypedToolManifestEntry, formatDescription } from '../manifest.js';

const argsSchema = z.object({
  /** Guidewire `Job.id` (submission jobs are a subtype of Job per PC apiref). */
  jobId: z.string().min(1),
});

export type SummarizeSubmissionArgs = z.infer<typeof argsSchema>;

export interface SubmissionDetail {
  readonly submissionNumber: string;
  readonly status: string;
  readonly assignedTo: string;
  readonly kind: string;
  /**
   * Composite-fanned-out fields land here when the Composite read is
   * wired post-`guidewire-adj` smoke. For the E2 base read we surface
   * what `/job/v1/jobs/{jobId}` returns and leave these as `undefined`
   * placeholders that the Composite revision fills in.
   */
  readonly insuredAccountId?: string;
  readonly contactRoles?: readonly string[];
}

interface JobAttributes {
  readonly jobNumber?: string;
  readonly jobStatus?: string;
  readonly assignedToUser?: string;
  readonly jobSubtype?: string;
  readonly accountId?: string;
}

export const tool: TypedToolManifestEntry<typeof argsSchema, SubmissionDetail> = {
  name: 'summarize-this-submission',
  version: '0.1.0',
  mode: 'read_only',
  vocabulary: {
    question: 'Give me the elevator-pitch read on this submission.',
    whenToUse:
      'Before opening a submission for underwriting — get insured, LOB, premium, exposures, and contact roles in one screen.',
  },
  get description(): string {
    return formatDescription(this.vocabulary);
  },
  inputSchema: argsSchema,
  requiredProfileSchema: '>=v1.0',
  requiredProfileFiles: ['field-aliases.yaml', 'typelists.yaml'],
  epicTag: 'E2',
  personas: [2],
  requiresHarnessExecute: false,
  incompleteWithoutProfile: false,

  async handler(args: SummarizeSubmissionArgs, ctx: ToolContext): Promise<SubmissionDetail> {
    const span = ctx.tracer.startSpan('mcp.tool.invoke', {
      attributes: {
        tool_name: 'summarize-this-submission',
        tool_version: '0.1.0',
        mode: 'read_only',
        tenant_id: ctx.tenantId,
        actor_id: ctx.actorId,
        trace_id: ctx.traceId,
      },
    });

    const startedAt = Date.now();
    await ctx.emitAudit({
      eventType: 'execute.started',
      mode: 'read_only',
      toolName: 'summarize-this-submission',
      toolVersion: '0.1.0',
    });

    try {
      const envelope = await ctx.client.get<GuidewireSingleEnvelope<JobAttributes>>({
        suite: 'pc',
        path: `/job/v1/jobs/${encodeURIComponent(args.jobId)}`,
      });

      const resource = extractSingle(envelope);
      const aliased = applyFieldAliases<Record<string, string>>(
        resource.attributes as Record<string, unknown>,
        'pc.job',
        ctx.profile,
        ['jobNumber', 'jobStatus', 'assignedToUser', 'jobSubtype'],
      );

      const detail: SubmissionDetail = {
        submissionNumber: aliased.submissionNumber ?? resource.id,
        status: ctx.profile.typelistLabel('JobStatus', aliased.status ?? 'Unknown'),
        assignedTo: aliased.assignedTo ?? '',
        kind: ctx.profile.typelistLabel('JobSubtype', aliased.kind ?? 'Submission'),
        ...(typeof resource.attributes.accountId === 'string' && {
          insuredAccountId: resource.attributes.accountId,
        }),
      };

      await ctx.emitAudit({
        eventType: 'execute.completed',
        mode: 'read_only',
        toolName: 'summarize-this-submission',
        toolVersion: '0.1.0',
        resultCount: 1,
        latencyMs: Date.now() - startedAt,
      });

      span.setAttribute('result_count', 1);
      return detail;
    } catch (err) {
      await ctx.emitAudit({
        eventType: 'execute.failed',
        mode: 'read_only',
        toolName: 'summarize-this-submission',
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
