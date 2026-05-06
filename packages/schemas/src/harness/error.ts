import { z } from 'zod';

/**
 * `HarnessError` codes per 02-PRD § 5.8 + 05-TECHNICAL-SPEC § 4.5.
 *
 * `GW_DBTRANSACTION_DUPLICATE` is the librarian P1 corollary: surfaces when
 * Guidewire returns `AlreadyExecutedException` because the harness cache
 * missed the duplicate. Forensic-only — the harness's own cache should
 * short-circuit first in normal operation.
 */
export const HarnessErrorCodeSchema = z.enum([
  'AUDIT_UNREACHABLE',
  'POLICY_UNREACHABLE',
  'POLICY_DENIED',
  'APPROVAL_TIMEOUT',
  'APPROVAL_DENIED',
  'IDEMPOTENCY_MISMATCH',
  'CHAIN_BROKEN',
  'MODE_MISMATCH',
  'TENANT_UNKNOWN',
  'GW_DBTRANSACTION_DUPLICATE',
  // SA-6 + MS-6: boot-time refusal when any LOB carries `lob_class:health`
  // while `pii-policy.yaml.baa_required.enabled` is false. Cross-file
  // invariant evaluated by `checkBaaGate()` in
  // `@intentsolutions/guidewire-schemas/profile`. Per 02-PRD § 6.3 + § 6.8.
  'BAA_GATE_MISSING',
]);
export type HarnessErrorCode = z.infer<typeof HarnessErrorCodeSchema>;
