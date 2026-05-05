import type { LobYamlV1 } from './lob.js';
import type { PiiPolicyYaml } from './pii-policy.js';

/**
 * SA-6 + MS-6: cross-file invariant — any LOB declared `lob_class: health`
 * MUST be paired with `pii-policy.yaml.baa_required.enabled: true`. The
 * carve becomes a runtime check at boot time, not policy prose, per
 * 02-PRD § 6.3 + § 6.8 + 05-TECHNICAL-SPEC § 8.4.
 *
 * The schemas package cannot import from `packages/harness` (would create
 * a dependency cycle), so this returns a tagged result rather than
 * throwing. The loader site (`servers/policycenter-mcp/src/profile.ts`)
 * is responsible for translating an `{ ok: false }` into the boot failure
 * surface — currently a `ProfileLoadError` with `code: 'BAA_GATE_MISSING'`
 * for upstream pattern-matching.
 *
 * The check is intentionally permissive in two ways:
 *   1. LOBs without a `lob_class` field default to `non_health` via the
 *      Zod schema in `./lob.ts`, so legacy profiles do not need to add
 *      the field to keep passing.
 *   2. A health LOB paired with `baa_required.enabled: true` passes
 *      regardless of which PII handling classes the policy defines.
 */
export type BaaGateResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      /** Carrier codes (keys of `lob_mappings`) that violated the invariant. */
      readonly offendingLobs: readonly string[];
    };

export function checkBaaGate(lob: LobYamlV1, piiPolicy: PiiPolicyYaml): BaaGateResult {
  if (piiPolicy.baa_required.enabled) {
    return { ok: true };
  }
  const offendingLobs = Object.entries(lob.lob_mappings)
    .filter(([, mapping]) => mapping.lob_class === 'health')
    .map(([carrierCode]) => carrierCode);

  if (offendingLobs.length === 0) {
    return { ok: true };
  }
  return { ok: false, offendingLobs };
}
