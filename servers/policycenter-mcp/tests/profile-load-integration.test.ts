/**
 * Integration tests for the E4 profile loader (`loadProfile`).
 *
 * These tests load profile directories from disk (real YAML files) rather
 * than mocking the filesystem. That is the point: the loader is tested
 * end-to-end including js-yaml parsing, Zod validation, and ProfileHandle
 * method behaviour against real profile data.
 *
 * **NO MOCKS** — no hand-written fixture JSON; every assertion runs against
 * actual YAML from `profiles/_template/` and `profiles/oss-demo/`.
 *
 * Three tests (per E4 task spec):
 *   1. Load `profiles/_template/` → valid empty-but-valid ProfileHandle.
 *   2. Load `profiles/oss-demo/`  → valid ProfileHandle, worked alias present.
 *   3. Load a deliberately-broken fixture → ProfileLoadError naming file + path.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ProfileLoadError, loadProfile } from '../src/profile.js';

// Repo root is 3 levels up from servers/policycenter-mcp/tests/
// (tests → policycenter-mcp → servers → guidewire repo root)
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const PROFILES_DIR = join(REPO_ROOT, 'profiles');
const FIXTURES_DIR = join(__dirname, 'fixtures', 'profiles');

describe('loadProfile — E4 integration', () => {
  it('Test 1: loads profiles/_template/ as a valid empty-but-valid profile', async () => {
    const handle = await loadProfile(join(PROFILES_DIR, '_template'));

    // Manifest-level assertions
    expect(handle.tenantId).toBe('your-tenant-id');
    expect(handle.schemaVersion).toBe('v1.0');

    // An empty-but-valid profile has no aliases: unknown field returns as-is
    expect(handle.fieldAlias('pc.account', 'namedInsured')).toBe('namedInsured');
    expect(handle.fieldAlias('pc.policy', 'effectiveDate')).toBe('effectiveDate');

    // An empty-but-valid profile has no typelist extensions: code returns as-is
    expect(handle.typelistLabel('PolicyTermStatus', 'Draft')).toBe('Draft');

    // hasRequiredFiles returns true when all 9 files are present
    expect(handle.hasRequiredFiles(['field-aliases.yaml', 'auth.yaml'])).toBe(true);
    expect(handle.hasRequiredFiles(['manifest.yaml'])).toBe(true);
  });

  it('Test 2: loads profiles/oss-demo/ and resolves worked aliases from 02-PRD § 6.6', async () => {
    const handle = await loadProfile(join(PROFILES_DIR, 'oss-demo'));

    // Manifest-level assertions
    expect(handle.tenantId).toBe('oss-demo');
    expect(handle.schemaVersion).toBe('v1.0');

    // Core alias from 02-PRD § 6.6: Account.namedInsured → "insured" (carrier term).
    // The loader inverts the aliases map: given the GW field name, return the carrier term.
    expect(handle.fieldAlias('pc.account', 'namedInsured')).toBe('insured');

    // Second Account alias — "policyholder" is also mapped to "namedInsured"
    // in the oss-demo profile (synonyms to the same GW field return the first hit).
    // The inverse lookup finds "insured" first (YAML key order preserved by js-yaml).
    // What we can assert cleanly is that the raw field with NO alias returns as-is.
    expect(handle.fieldAlias('pc.policy', 'unknownField')).toBe('unknownField');

    // Typelist label — BOPCoverageType has a carrier_extension entry
    expect(handle.typelistLabel('BOPCoverageType', 'acme_equipment_breakdown')).toBe(
      'Equipment Breakdown (Carrier Extension)',
    );

    // Base typelist code with no label extension returns the code
    expect(handle.typelistLabel('PolicyTermStatus', 'Draft')).toBe('Draft');

    // All 9 files are loaded
    expect(handle.hasRequiredFiles(['field-aliases.yaml', 'approval-matrix.yaml'])).toBe(true);
  });

  it('Test 3: throws ProfileLoadError naming manifest.yaml and tenantId when tenantId is missing', async () => {
    const brokenPath = join(FIXTURES_DIR, 'broken-missing-tenant-id');

    await expect(loadProfile(brokenPath)).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ProfileLoadError)) return false;
      // Error must name the file
      expect(err.file).toBe('manifest.yaml');
      // Error must name the failing path (Zod path for tenantId)
      expect(err.zodPath).toBe('tenantId');
      // The human-readable message must carry both
      expect(err.message).toContain('manifest.yaml');
      expect(err.message).toContain('tenantId');
      return true;
    });
  });

  it('Test 4: refuses health LOB without BAA at boot with code BAA_GATE_MISSING (SA-6 + MS-6)', async () => {
    // Cross-file invariant: any LOB carrying lob_class:health requires
    // pii-policy.yaml.baa_required.enabled === true. Per 02-PRD § 6.3 + § 6.8.
    const brokenPath = join(FIXTURES_DIR, 'baa-gate-missing');

    await expect(loadProfile(brokenPath)).rejects.toSatisfy((err: unknown) => {
      if (!(err instanceof ProfileLoadError)) return false;
      // The canonical HarnessErrorCode is the discriminator upstream wrappers
      // pattern-match on — string-matching the human-readable message is brittle.
      expect(err.code).toBe('BAA_GATE_MISSING');
      // Error names both YAMLs (cross-file invariant)
      expect(err.file).toContain('lob.yaml');
      expect(err.file).toContain('pii-policy.yaml');
      // Error names the offending carrier code(s) so the operator knows which
      // LOB entry is wrong; the non-health sibling MUST NOT appear.
      expect(err.message).toContain('ACME_GROUPHEALTH');
      expect(err.message).not.toContain('ACME_COMMERCIALPROP');
      return true;
    });
  });
});
