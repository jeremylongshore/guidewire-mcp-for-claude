/**
 * Tool: `show-policies-for-this-insured`
 *
 * Cross-LOB rollup of what an insured account has with the carrier. Step 3
 * of J-1 Underwriter Triage (04-USER-JOURNEY § J-1).
 *
 * Cloud API endpoints (composite read — two calls):
 *   1. `GET /account/v1/accounts/{accountId}/policies` (PC Account API)
 *   2. `GET /policy/v1/policies?accountId={accountId}` (PC Policy API)
 *
 * Per the librarian KB (`000-docs/005-DR-REF` § 1 — PolicyCenter apiref at
 * `https://docs.guidewire.com/cloud/pc/202503/apiref/`). The two-call
 * pattern is recommended in 008 § 3.1 because the `accountId` filter on
 * `/policy/v1/policies` is the more durable query path; the Account API
 * sub-resource is faster but less complete on cross-tenant deployments.
 *
 * Per 02-PRD § 3.1.1 (line-underwriter view) — citation: 008 § 3.1.
 */

import { z } from 'zod';

import { type GuidewireListEnvelope, applyFieldAliases, extractList } from '../field-mapping.js';
import { type ToolContext, type TypedToolManifestEntry, formatDescription } from '../manifest.js';

const argsSchema = z.object({
  /** Guidewire `Account.id` for the insured. */
  accountId: z.string().min(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  pageOffset: z.number().int().min(0).default(0),
});

export type ShowPoliciesArgs = z.infer<typeof argsSchema>;

export interface PolicySummary {
  readonly policyNumber: string;
  readonly status: string;
  readonly lineOfBusiness: string;
  readonly effectiveDate: string;
  readonly expirationDate: string;
}

export interface ShowPoliciesResult {
  readonly accountId: string;
  readonly count: number;
  readonly policies: readonly PolicySummary[];
}

interface PolicyAttributes {
  readonly policyNumber?: string;
  readonly policyStatus?: string;
  readonly productCode?: string;
  readonly effectiveDate?: string;
  readonly expirationDate?: string;
}

export const tool: TypedToolManifestEntry<typeof argsSchema, ShowPoliciesResult> = {
  name: 'show-policies-for-this-insured',
  version: '0.1.0',
  mode: 'read_only',
  vocabulary: {
    question: 'What policies does this insured have with us?',
    whenToUse:
      'Cross-LOB rollup before underwriting a new submission — drive renewal-aware decisions and spot concentration risk.',
  },
  get description(): string {
    return formatDescription(this.vocabulary);
  },
  inputSchema: argsSchema,
  requiredProfileSchema: '>=v1.0',
  requiredProfileFiles: ['lob.yaml', 'field-aliases.yaml', 'typelists.yaml'],
  epicTag: 'E2',
  personas: [2],
  requiresHarnessExecute: false,
  incompleteWithoutProfile: false,

  async handler(args: ShowPoliciesArgs, ctx: ToolContext): Promise<ShowPoliciesResult> {
    const span = ctx.tracer.startSpan('mcp.tool.invoke', {
      attributes: {
        tool_name: 'show-policies-for-this-insured',
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
      toolName: 'show-policies-for-this-insured',
      toolVersion: '0.1.0',
    });

    try {
      // Per 008 § 3.1, the durable cross-tenant path is the Policy API filter
      // on accountId. We use that as the primary read; future revisions may
      // composite the Account API sub-resource for completeness.
      const envelope = await ctx.client.get<GuidewireListEnvelope<PolicyAttributes>>({
        suite: 'pc',
        path: '/policy/v1/policies',
        query: {
          // accountId filter is practitioner knowledge per 008 § 3.1
          // (unverified — practitioner knowledge from public docs; smoke-test
          // reachability with dev-tier creds; first integration engagement
          // validates production per D-021).
          accountId: args.accountId,
          pageSize: args.pageSize,
          pageOffset: args.pageOffset,
        },
      });

      const policies: PolicySummary[] = extractList(envelope).map((resource) => {
        const aliased = applyFieldAliases<Record<string, string>>(
          resource.attributes as Record<string, unknown>,
          'pc.policy',
          ctx.profile,
          ['policyNumber', 'policyStatus', 'productCode', 'effectiveDate', 'expirationDate'],
        );
        return {
          policyNumber: aliased.policyNumber ?? resource.id,
          // Apply typelist label resolution per profile (handles
          // CancellationReason / PolicyStatus carrier extensions per 02-PRD § 6.4).
          status: ctx.profile.typelistLabel('PolicyStatus', aliased.status ?? 'Unknown'),
          lineOfBusiness: ctx.profile.typelistLabel('ProductCode', aliased.lineOfBusiness ?? ''),
          effectiveDate: aliased.effectiveDate ?? '',
          expirationDate: aliased.expirationDate ?? '',
        };
      });

      const result: ShowPoliciesResult = {
        accountId: args.accountId,
        count: envelope.total ?? policies.length,
        policies,
      };

      await ctx.emitAudit({
        eventType: 'execute.completed',
        mode: 'read_only',
        toolName: 'show-policies-for-this-insured',
        toolVersion: '0.1.0',
        resultCount: policies.length,
        latencyMs: Date.now() - startedAt,
      });

      span.setAttribute('result_count', policies.length);
      return result;
    } catch (err) {
      await ctx.emitAudit({
        eventType: 'execute.failed',
        mode: 'read_only',
        toolName: 'show-policies-for-this-insured',
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
