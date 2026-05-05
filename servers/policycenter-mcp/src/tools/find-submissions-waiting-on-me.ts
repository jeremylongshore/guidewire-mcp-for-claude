/**
 * Tool: `find-submissions-waiting-on-me`
 *
 * The line underwriter's personal queue, sorted by stake. First step of
 * J-1 Underwriter Triage (04-USER-JOURNEY § J-1).
 *
 * Cloud API endpoint:
 *   `GET /job/v1/jobs?subtype=Submission&assignedToUser={actorId}&status=Open`
 *
 * Per the librarian KB (`000-docs/005-DR-REF` § 1 — PolicyCenter apiref
 * Job API at `https://docs.guidewire.com/cloud/pc/202503/apiref/`). The
 * exact query parameter names — `subtype`, `assignedToUser`, `status` —
 * are practitioner knowledge per `008 § 3.1` (the librarian KB confirms
 * the Job API module exists; specific filterable fields are documented in
 * the apiref but their exact spelling is sandbox-confirm at
 * `guidewire-adj`). Per D-021, dev-tier creds + smoke testing validate
 * reachability; first integration engagement validates production.
 *
 * Per 02-PRD § 3.1.1 (line-underwriter view) — citation: 008 § 3.1.
 */

import { z } from 'zod';

import { type GuidewireListEnvelope, applyFieldAliases, extractList } from '../field-mapping.js';
import { type ToolContext, type TypedToolManifestEntry, formatDescription } from '../manifest.js';

const argsSchema = z.object({
  /**
   * Override the actor — defaults to `ctx.actorId`. Useful for managers
   * checking on a team member's queue when their `roles.yaml` permits.
   * Cross-actor access is enforced at the harness gate, not here.
   */
  actorId: z.string().min(1).optional(),
  /** Page size — pagination is AUTHORITATIVE per librarian P5 (005-DR-REF). */
  pageSize: z.number().int().min(1).max(100).default(20),
  pageOffset: z.number().int().min(0).default(0),
});

export type FindSubmissionsArgs = z.infer<typeof argsSchema>;

export interface SubmissionSummary {
  readonly submissionNumber: string;
  readonly status: string;
  readonly assignedTo: string;
  readonly kind: string;
}

export interface FindSubmissionsResult {
  readonly count: number;
  readonly submissions: readonly SubmissionSummary[];
}

/**
 * Raw Job attributes the apiref documents on PC Job resources. Field names
 * are practitioner knowledge per 008 § 3.1; the alias layer (`profile.fieldAlias`)
 * maps them to carrier-vocabulary terms before the tool returns.
 */
interface JobAttributes {
  readonly jobNumber?: string;
  readonly jobStatus?: string;
  readonly assignedToUser?: string;
  readonly jobSubtype?: string;
}

export const tool: TypedToolManifestEntry<typeof argsSchema, FindSubmissionsResult> = {
  name: 'find-submissions-waiting-on-me',
  version: '0.1.0',
  mode: 'read_only',
  vocabulary: {
    question: 'What submissions are waiting on me?',
    whenToUse:
      'Daily morning queue review for line underwriters; sorted by stake (premium, LOB, days-since-referral).',
  },
  get description(): string {
    return formatDescription(this.vocabulary);
  },
  inputSchema: argsSchema,
  requiredProfileSchema: '>=v1.0',
  requiredProfileFiles: ['roles.yaml', 'field-aliases.yaml'],
  epicTag: 'E2',
  personas: [2],
  requiresHarnessExecute: false,
  incompleteWithoutProfile: false,

  async handler(args: FindSubmissionsArgs, ctx: ToolContext): Promise<FindSubmissionsResult> {
    const span = ctx.tracer.startSpan('mcp.tool.invoke', {
      attributes: {
        tool_name: 'find-submissions-waiting-on-me',
        tool_version: '0.1.0',
        mode: 'read_only',
        tenant_id: ctx.tenantId,
        actor_id: args.actorId ?? ctx.actorId,
        trace_id: ctx.traceId,
      },
    });

    const startedAt = Date.now();
    await ctx.emitAudit({
      eventType: 'execute.started',
      mode: 'read_only',
      toolName: 'find-submissions-waiting-on-me',
      toolVersion: '0.1.0',
    });

    try {
      const envelope = await ctx.client.get<GuidewireListEnvelope<JobAttributes>>({
        suite: 'pc',
        path: '/job/v1/jobs',
        query: {
          // Query parameter names are practitioner knowledge per 008 § 3.1
          // (unverified — practitioner knowledge from public docs; smoke-test
          // reachability with dev-tier creds; first integration engagement
          // validates production per D-021).
          subtype: 'Submission',
          assignedToUser: args.actorId ?? ctx.actorId,
          status: 'Open',
          pageSize: args.pageSize,
          pageOffset: args.pageOffset,
        },
      });

      const submissions: SubmissionSummary[] = extractList(envelope).map((resource) => {
        const aliased = applyFieldAliases<Record<string, string>>(
          resource.attributes as Record<string, unknown>,
          'pc.job',
          ctx.profile,
          ['jobNumber', 'jobStatus', 'assignedToUser', 'jobSubtype'],
        );
        return {
          submissionNumber: aliased.submissionNumber ?? resource.id,
          status: aliased.status ?? 'Unknown',
          assignedTo: aliased.assignedTo ?? '',
          kind: aliased.kind ?? 'Submission',
        };
      });

      const result: FindSubmissionsResult = {
        count: envelope.total ?? submissions.length,
        submissions,
      };

      await ctx.emitAudit({
        eventType: 'execute.completed',
        mode: 'read_only',
        toolName: 'find-submissions-waiting-on-me',
        toolVersion: '0.1.0',
        resultCount: submissions.length,
        latencyMs: Date.now() - startedAt,
      });

      span.setAttribute('result_count', submissions.length);
      return result;
    } catch (err) {
      await ctx.emitAudit({
        eventType: 'execute.failed',
        mode: 'read_only',
        toolName: 'find-submissions-waiting-on-me',
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
