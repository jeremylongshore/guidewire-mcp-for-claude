/**
 * @intentsolutions/policycenter-mcp
 *
 * PolicyCenter MCP server — 5 read-only carrier-vocabulary tools serving the
 * line-underwriter persona (Persona 2). Implements the J-1 Underwriter
 * Triage demo path end-to-end (04-USER-JOURNEY § J-1).
 *
 * The 2 ⚠ tools (`whats-our-appetite-on-this-risk`, `explain-why-this-got-referred`)
 * slip to E5 per 02-PRD § 3.1.1 — they ship the
 * `profile_incomplete_for_this_carrier` refusal until UWCenter rule entity
 * shapes resolve from a real sandbox tenant.
 *
 * Per 07-ROADMAP § E2 + 02-PRD § 3.1.
 */

import { tool as didWeLoseThisAccount } from './tools/did-we-lose-this-account.js';
import { tool as draftEndorsement } from './tools/draft-endorsement.js';
import { tool as draftReferralNote } from './tools/draft-referral-note.js';
import { tool as explainWhyThisGotReferred } from './tools/explain-why-this-got-referred.js';
import { tool as findSubmissionsWaitingOnMe } from './tools/find-submissions-waiting-on-me.js';
import { tool as pullThisSubmission } from './tools/pull-this-submission.js';
import { tool as showPoliciesForThisInsured } from './tools/show-policies-for-this-insured.js';
import { tool as summarizeThisSubmission } from './tools/summarize-this-submission.js';
import { tool as whatsOurAppetiteOnThisRisk } from './tools/whats-our-appetite-on-this-risk.js';

import { type ToolManifestEntry, widenManifestEntry } from './manifest.js';

export type {
  ToolManifestEntry,
  TypedToolManifestEntry,
  ToolContext,
  AuditEventBrief,
  ProfileFileName,
} from './manifest.js';
export { formatDescription, widenManifestEntry } from './manifest.js';
export type { ProfileHandle, AliasScope } from './profile.js';
export { createDefaultProfile } from './profile.js';
export {
  applyFieldAliases,
  extractList,
  extractSingle,
  isMoney,
  type Money,
  type GuidewireResource,
  type GuidewireListEnvelope,
  type GuidewireSingleEnvelope,
} from './field-mapping.js';

/**
 * The canonical PolicyCenter tool catalog. Order matches the roadmap.
 */
export const POLICYCENTER_TOOLS: ReadonlyArray<ToolManifestEntry> = [
  // E2: Read-only
  widenManifestEntry(findSubmissionsWaitingOnMe),
  widenManifestEntry(showPoliciesForThisInsured),
  widenManifestEntry(summarizeThisSubmission),
  widenManifestEntry(didWeLoseThisAccount),
  widenManifestEntry(pullThisSubmission),
  // E5: Drafting
  widenManifestEntry(draftReferralNote),
  widenManifestEntry(draftEndorsement),
  // E5: ⚠ Incomplete without profile
  widenManifestEntry(whatsOurAppetiteOnThisRisk),
  widenManifestEntry(explainWhyThisGotReferred),
];

export const SERVER_NAME = 'policycenter-mcp';
export const SERVER_VERSION = '0.1.0';

export {
  didWeLoseThisAccount,
  draftEndorsement,
  draftReferralNote,
  explainWhyThisGotReferred,
  findSubmissionsWaitingOnMe,
  pullThisSubmission,
  showPoliciesForThisInsured,
  summarizeThisSubmission,
  whatsOurAppetiteOnThisRisk,
};

/**
 * Server-creation factory. Wires the tool catalog into an MCP `Server`
 * instance from the SDK. Transport selection (stdio / streamable HTTP)
 * happens in `cli.ts` per CLAUDE.md hard rule "use SDK transports
 * directly, NOT Express/Fastify".
 */
export interface CreatePolicyCenterServerOptions {
  readonly tenantId: string;
  readonly serverName?: string;
  readonly serverVersion?: string;
}

export function listTools(): ReadonlyArray<{
  readonly name: string;
  readonly description: string;
  readonly mode: ToolManifestEntry['mode'];
  readonly version: string;
}> {
  return POLICYCENTER_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    mode: t.mode,
    version: t.version,
  }));
}
