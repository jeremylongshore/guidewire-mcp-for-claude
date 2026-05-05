/**
 * Tool: `did-we-lose-this-account`
 *
 * Cancellation / non-renewal history for an account, with reason codes.
 * Step 5 of J-1 Underwriter Triage (04-USER-JOURNEY § J-1).
 *
 * Cloud API endpoint:
 *   `GET /policy/v1/policies?accountId={accountId}&status=Cancelled,Lapsed,Lost`
 *
 * Per the librarian KB (`000-docs/005-DR-REF` § 1 — PolicyCenter apiref
 * Policy API at `https://docs.guidewire.com/cloud/pc/202503/apiref/`).
 *
 * **`CancellationReason` is the typelist-drift poster child** per librarian
 * audit F-PRD-004: it's heavily extended per carrier (the base list is
 * portable but each carrier adds their own values), making this the most
 * profile-dependent of the 5 in-scope tools. The `typelists.yaml` mapping
 * surfaces the carrier-friendly label rather than the raw typelist code.
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

export type DidWeLoseThisAccountArgs = z.infer<typeof argsSchema>;

export interface LostPolicyEntry {
  readonly policyNumber: string;
  readonly status: string;
  readonly lineOfBusiness: string;
  readonly cancellationReason: string;
  readonly effectiveDate: string;
  readonly expirationDate: string;
}

export interface DidWeLoseThisAccountResult {
  readonly accountId: string;
  readonly count: number;
  readonly lostPolicies: readonly LostPolicyEntry[];
}

interface PolicyAttributes {
  readonly policyNumber?: string;
  readonly policyStatus?: string;
  readonly productCode?: string;
  readonly cancellationReason?: string;
  readonly effectiveDate?: string;
  readonly expirationDate?: string;
}

export const tool: TypedToolManifestEntry<typeof argsSchema, DidWeLoseThisAccountResult> = {
  name: 'did-we-lose-this-account',
  version: '0.1.0',
  mode: 'read_only',
  vocabulary: {
    question: 'Did we lose this account, and if so, why?',
    whenToUse:
      'Before quoting a returning prospect — surface cancellation / non-renewal / lapse history with carrier-extended reason codes.',
  },
  get description(): string {
    return formatDescription(this.vocabulary);
  },
  inputSchema: argsSchema,
  requiredProfileSchema: '>=v1.0',
  requiredProfileFiles: ['lob.yaml', 'typelists.yaml', 'field-aliases.yaml'],
  epicTag: 'E2',
  personas: [2],
  requiresHarnessExecute: false,
  incompleteWithoutProfile: false,

  async handler(
    args: DidWeLoseThisAccountArgs,
    ctx: ToolContext,
  ): Promise<DidWeLoseThisAccountResult> {
    const span = ctx.tracer.startSpan('mcp.tool.invoke', {
      attributes: {
        tool_name: 'did-we-lose-this-account',
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
      toolName: 'did-we-lose-this-account',
      toolVersion: '0.1.0',
    });

    try {
      const envelope = await ctx.client.get<GuidewireListEnvelope<PolicyAttributes>>({
        suite: 'pc',
        path: '/policy/v1/policies',
        query: {
          // Filter shape (status CSV + accountId) is practitioner knowledge per
          // 008 § 3.1 (unverified — practitioner knowledge from public docs;
          // smoke-test reachability with dev-tier creds; first integration
          // engagement validates production per D-021).
          accountId: args.accountId,
          status: 'Cancelled,Lapsed,Lost',
          pageSize: args.pageSize,
          pageOffset: args.pageOffset,
        },
      });

      const lostPolicies: LostPolicyEntry[] = extractList(envelope).map((resource) => {
        const aliased = applyFieldAliases<Record<string, string>>(
          resource.attributes as Record<string, unknown>,
          'pc.policy',
          ctx.profile,
          [
            'policyNumber',
            'policyStatus',
            'productCode',
            'cancellationReason',
            'effectiveDate',
            'expirationDate',
          ],
        );
        const rawCancellationReason =
          aliased.cancellationReason ??
          (typeof resource.attributes.cancellationReason === 'string'
            ? resource.attributes.cancellationReason
            : 'Unknown');
        return {
          policyNumber: aliased.policyNumber ?? resource.id,
          status: ctx.profile.typelistLabel('PolicyStatus', aliased.status ?? 'Unknown'),
          lineOfBusiness: ctx.profile.typelistLabel('ProductCode', aliased.lineOfBusiness ?? ''),
          // CancellationReason is the typelist-drift case per librarian
          // F-PRD-004; per-carrier `typelists.yaml` resolves the label.
          cancellationReason: ctx.profile.typelistLabel(
            'CancellationReason',
            rawCancellationReason,
          ),
          effectiveDate: aliased.effectiveDate ?? '',
          expirationDate: aliased.expirationDate ?? '',
        };
      });

      const result: DidWeLoseThisAccountResult = {
        accountId: args.accountId,
        count: envelope.total ?? lostPolicies.length,
        lostPolicies,
      };

      await ctx.emitAudit({
        eventType: 'execute.completed',
        mode: 'read_only',
        toolName: 'did-we-lose-this-account',
        toolVersion: '0.1.0',
        resultCount: lostPolicies.length,
        latencyMs: Date.now() - startedAt,
      });

      span.setAttribute('result_count', lostPolicies.length);
      return result;
    } catch (err) {
      await ctx.emitAudit({
        eventType: 'execute.failed',
        mode: 'read_only',
        toolName: 'did-we-lose-this-account',
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
