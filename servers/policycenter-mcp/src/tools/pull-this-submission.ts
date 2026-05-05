/**
 * Tool: `pull-this-submission`
 *
 * Single-submission deep read used as a leaf in conversational flows
 * (mirrors the `pull-this-claim` pattern in the planned ClaimCenter MCP
 * per 02-PRD § 3.2). Returns the full attributes payload after alias-
 * mapping — no fan-out / no Composite read.
 *
 * Cloud API endpoint:
 *   `GET /job/v1/jobs/{jobId}` (PC Job API single-resource read)
 *
 * Per the librarian KB (`000-docs/005-DR-REF` § 1 — PolicyCenter apiref
 * Job API at `https://docs.guidewire.com/cloud/pc/202503/apiref/`).
 *
 * Per 02-PRD § 3.1 (line-underwriter view, leaf-read companion to
 * `pull-this-claim`).
 */

import { z } from 'zod';

import {
  type GuidewireSingleEnvelope,
  applyFieldAliases,
  extractSingle,
} from '../field-mapping.js';
import { type ToolContext, type TypedToolManifestEntry, formatDescription } from '../manifest.js';

const argsSchema = z.object({
  /** Guidewire `Job.id` (submissions are a Job subtype). */
  jobId: z.string().min(1),
});

export type PullThisSubmissionArgs = z.infer<typeof argsSchema>;

export interface PulledSubmission {
  readonly submissionNumber: string;
  readonly status: string;
  readonly assignedTo: string;
  readonly kind: string;
  /**
   * The full alias-mapped attributes object. Tool callers consume this for
   * deep inspection; surface-level reads (`summarize-this-submission`)
   * project out only the elevator-pitch fields.
   */
  readonly attributes: Readonly<Record<string, unknown>>;
}

interface JobAttributes extends Record<string, unknown> {
  readonly jobNumber?: string;
  readonly jobStatus?: string;
  readonly assignedToUser?: string;
  readonly jobSubtype?: string;
}

export const tool: TypedToolManifestEntry<typeof argsSchema, PulledSubmission> = {
  name: 'pull-this-submission',
  version: '0.1.0',
  mode: 'read_only',
  vocabulary: {
    question: 'Pull this submission for me.',
    whenToUse:
      'Conversational drill-down — used as a leaf step after the queue / cross-LOB tools surface a specific submission.',
  },
  get description(): string {
    return formatDescription(this.vocabulary);
  },
  inputSchema: argsSchema,
  requiredProfileSchema: '>=v1.0',
  requiredProfileFiles: ['field-aliases.yaml'],
  epicTag: 'E2',
  personas: [2],
  requiresHarnessExecute: false,
  incompleteWithoutProfile: false,

  async handler(args: PullThisSubmissionArgs, ctx: ToolContext): Promise<PulledSubmission> {
    const span = ctx.tracer.startSpan('mcp.tool.invoke', {
      attributes: {
        tool_name: 'pull-this-submission',
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
      toolName: 'pull-this-submission',
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

      const pulled: PulledSubmission = {
        submissionNumber: aliased.submissionNumber ?? resource.id,
        status: aliased.status ?? 'Unknown',
        assignedTo: aliased.assignedTo ?? '',
        kind: aliased.kind ?? 'Submission',
        attributes: resource.attributes as Readonly<Record<string, unknown>>,
      };

      await ctx.emitAudit({
        eventType: 'execute.completed',
        mode: 'read_only',
        toolName: 'pull-this-submission',
        toolVersion: '0.1.0',
        resultCount: 1,
        latencyMs: Date.now() - startedAt,
      });

      span.setAttribute('result_count', 1);
      return pulled;
    } catch (err) {
      await ctx.emitAudit({
        eventType: 'execute.failed',
        mode: 'read_only',
        toolName: 'pull-this-submission',
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
