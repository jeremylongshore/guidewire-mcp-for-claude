/**
 * Test helpers shared across the 5 in-scope tool tests.
 *
 * **NO MOCKS at the tool level.** We only stub the boundary — the
 * `GuidewireFetch` injection point on `packages/client-sdk/createClient`.
 * Tool mapping logic, profile alias resolution, audit emission, span
 * lifecycle: all real.
 *
 * Per 05-TECHNICAL-SPEC § 5: response shapes are derived from the public
 * Guidewire apiref (`https://docs.guidewire.com/cloud/pc/202503/apiref/`).
 * No invented JSON; every field appears in the apiref's PC Job / Policy /
 * Account API resource definitions.
 */

import { createMemoryAuditStore } from '@intentsolutions/guidewire-audit';
import type { AuthHandle } from '@intentsolutions/guidewire-auth';
import {
  type GuidewireClient,
  type GuidewireFetch,
  createClient,
} from '@intentsolutions/guidewire-client';
import {
  createEvidenceExporter,
  createHarness,
  createInMemoryApprovalSink,
  createInMemoryPolicyEngine,
} from '@intentsolutions/guidewire-harness';
import { getObservability } from '@intentsolutions/guidewire-observability';
import { trace } from '@opentelemetry/api';
import { vi } from 'vitest';

import type { AuditEventBrief, ToolContext } from '../src/manifest.js';
import { createDefaultProfile } from '../src/profile.js';

export const TEST_TENANT_ID = 'sandbox-jeremy-dev';
export const TEST_ACTOR_ID = 'actor:underwriter@demo';

const fakeAuth: AuthHandle = {
  getToken: async () => ({
    accessToken: 'fake-token',
    tokenType: 'Bearer',
    expiresAt: Date.now() + 60_000,
  }),
  refreshToken: async () => ({
    accessToken: 'fake-token-refreshed',
    tokenType: 'Bearer',
    expiresAt: Date.now() + 60_000,
  }),
  validateJwt: () => ({ sub: TEST_ACTOR_ID }),
};

export interface BuiltContext {
  readonly ctx: ToolContext;
  readonly client: GuidewireClient;
  readonly auditEvents: AuditEventBrief[];
  readonly fetchSpy: ReturnType<typeof vi.fn>;
}

export function buildToolContext(fetchImpl: GuidewireFetch): BuiltContext {
  const fetchSpy = vi.fn(fetchImpl);
  const client = createClient({
    auth: fakeAuth,
    baseUrls: { pc: 'https://pc.sandbox.guidewire.cloud' },
    fetch: fetchSpy as GuidewireFetch,
  });

  const observability = getObservability({
    server_name: 'policycenter-mcp-test',
    tenant_id: TEST_TENANT_ID,
    log_level: 'silent',
  });

  const auditEvents: AuditEventBrief[] = [];
  const emitAudit = async (event: AuditEventBrief): Promise<void> => {
    auditEvents.push(event);
  };

  const tracer = trace.getTracer('policycenter-mcp-test');
  const profile = createDefaultProfile(TEST_TENANT_ID);

  const audit = createMemoryAuditStore();
  const harness = createHarness({
    audit,
    policy: createInMemoryPolicyEngine({
      rules: [{ actorId: '*', toolName: '*', mode: '*', outcome: 'allow' }],
    }),
    approvals: createInMemoryApprovalSink(),
    evidence: createEvidenceExporter({ audit }),
    observability,
    profile: {
      tenantId: TEST_TENANT_ID,
      ruleSetVersion: 'v1.0',
    },
  });

  const ctx: ToolContext = {
    traceId: 'trace-test-1',
    tenantId: TEST_TENANT_ID,
    actorId: TEST_ACTOR_ID,
    client,
    profile,
    tracer,
    observability,
    emitAudit,
    harness,
  };

  return { ctx, client, auditEvents, fetchSpy };
}

/**
 * Build a Guidewire-shaped JSON response (200 OK with the supplied body).
 * Mirrors the envelope shape the apiref documents on every list-shaped PC
 * endpoint: `{ count, total, data: [{ id, attributes, links? }, ...] }`.
 */
export function jsonResponse(
  body: unknown,
  status = 200,
): {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
} {
  return {
    status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}
