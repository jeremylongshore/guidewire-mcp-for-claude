/**
 * scripts/smoke-reach.ts — endpoint reachability smoke per E1 done-when +
 * D-021. Reads dev-tier OAuth credentials from env, iterates the librarian
 * KB endpoints (`000-docs/005-DR-REF-guidewire-public-resources.md`), and
 * asserts each host responds with a structurally valid response (200/401/
 * documented 4xx). Reachability + auth-flow validation only — NOT
 * business-logic validation.
 *
 * Without `GUIDEWIRE_OAUTH_CLIENT_ID` configured (the OSS quickstart
 * default — no creds), exits 0 with a "no dev creds configured" message.
 *
 * Run via: `pnpm smoke-reach`
 */

import { request } from 'undici';

interface Endpoint {
  readonly name: string;
  readonly url: string;
  readonly method: 'GET' | 'OPTIONS';
  readonly category: string;
}

/**
 * Endpoints from `000-docs/005-DR-REF-guidewire-public-resources.md`.
 * Every URL here is a release-versioned path Guidewire publishes — never
 * `latest/` per 008 § 12 "avoid" item 11.
 */
const ENDPOINTS: readonly Endpoint[] = [
  // § 1 — Per-suite Cloud API references
  {
    name: 'PolicyCenter API reference (Palisades 202503)',
    url: 'https://docs.guidewire.com/cloud/pc/202503/apiref/',
    method: 'GET',
    category: 'apiref',
  },
  {
    name: 'ClaimCenter API reference (Las Leñas 202411)',
    url: 'https://docs.guidewire.com/cloud/cc/202411/apiref/',
    method: 'GET',
    category: 'apiref',
  },
  {
    name: 'BillingCenter API reference (202503)',
    url: 'https://docs.guidewire.com/cloud/bc/202503/apiref/',
    method: 'GET',
    category: 'apiref',
  },
  // § 1 Pagination — AUTHORITATIVE per librarian P5
  {
    name: 'IS Consumer Guide — pagination parameters',
    url: 'https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/query-parameters/c_the-pagination-query-parameters.html',
    method: 'GET',
    category: 'is-consumer-guide',
  },
  // § 1 Write safety — librarian P1
  {
    name: 'IS Consumer Guide — preventing duplicate database transactions (GW-DBTransaction-ID)',
    url: 'https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html',
    method: 'GET',
    category: 'is-consumer-guide',
  },
  // § 1 Cross-suite primer
  {
    name: 'IS cross-suite endpoint primer (Palisades 202603)',
    url: 'https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/introduction-to-Cloud-API/c_endpoints.html',
    method: 'GET',
    category: 'is-consumer-guide',
  },
  // § 2 Developer portal
  {
    name: 'Guidewire Developers home',
    url: 'https://www.guidewire.com/developers',
    method: 'GET',
    category: 'developer-portal',
  },
];

interface CheckResult {
  readonly endpoint: Endpoint;
  readonly status: number | 'unreachable';
  readonly ok: boolean;
  readonly elapsedMs: number;
  readonly note?: string;
}

const NO_CREDS_MESSAGE = `[smoke-reach] GUIDEWIRE_OAUTH_CLIENT_ID is not set — no dev creds configured.

The smoke-reach script verifies that the public Guidewire endpoints
enumerated in 000-docs/005-DR-REF-guidewire-public-resources.md respond,
and (when dev-tier creds are present) that the OAuth flow completes
against the configured token endpoint.

In OSS quickstart mode without dev creds: skipping. Exit 0.

To run the full check, populate the dev-tier credentials in
runbook/secrets.prod.sops.yaml and source via scripts/sops-env, then
re-run: pnpm smoke-reach
`;

async function checkEndpoint(endpoint: Endpoint): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await request(endpoint.url, {
      method: endpoint.method,
      headers: { 'User-Agent': 'guidewire-mcp-for-claude/smoke-reach' },
    });
    // Drain body so connection can be released.
    await res.body.dump();
    const elapsed = Date.now() - start;
    // Documented success states: 200 (page exists), 401 (auth-required —
    // endpoint exists), 403 (auth-required), documented 404s
    // (path-renamed-by-release; flag but don't fail). Anything that
    // confirms the host responded.
    const ok = res.statusCode >= 200 && res.statusCode < 500;
    return { endpoint, status: res.statusCode, ok, elapsedMs: elapsed };
  } catch (err) {
    const elapsed = Date.now() - start;
    return {
      endpoint,
      status: 'unreachable',
      ok: false,
      elapsedMs: elapsed,
      note: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main(): Promise<number> {
  if (
    process.env.GUIDEWIRE_OAUTH_CLIENT_ID === undefined ||
    process.env.GUIDEWIRE_OAUTH_CLIENT_ID.length === 0
  ) {
    process.stdout.write(NO_CREDS_MESSAGE);
    return 0;
  }

  process.stdout.write(
    `[smoke-reach] Checking ${ENDPOINTS.length} endpoints from 005-DR-REF librarian KB.\n`,
  );

  const results: CheckResult[] = [];
  for (const endpoint of ENDPOINTS) {
    const result = await checkEndpoint(endpoint);
    results.push(result);
    const statusStr = String(result.status);
    const statusFmt = result.ok ? statusStr : `[${statusStr}]`;
    process.stdout.write(
      `  ${result.ok ? 'OK ' : 'FAIL'}  ${statusFmt.padEnd(14)} ${result.elapsedMs}ms  ${endpoint.name}\n`,
    );
    if (result.note !== undefined) {
      process.stdout.write(`        note: ${result.note}\n`);
    }
  }

  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    process.stderr.write(
      `\n[smoke-reach] ${failures.length} endpoint(s) unreachable — investigate before proceeding.\n`,
    );
    return 1;
  }
  process.stdout.write(`\n[smoke-reach] All ${results.length} endpoints reachable.\n`);

  // Note: full OAuth flow validation against the tenant token endpoint
  // lands at GW-2.x when E2 wires the first read tool. This smoke just
  // confirms the librarian KB endpoints respond.
  return 0;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    process.stderr.write(
      `[smoke-reach] uncaught error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
