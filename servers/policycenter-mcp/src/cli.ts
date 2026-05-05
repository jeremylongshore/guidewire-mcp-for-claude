#!/usr/bin/env node
/**
 * `policycenter-mcp` — bin entry.
 *
 * Wires the 5 carrier-vocabulary read tools into an MCP server using the
 * official SDK transports (stdio default; streamable HTTP via `--transport
 * http`). Per CLAUDE.md hard rule: use SDK transports directly, **NOT**
 * Express/Fastify wrappers.
 *
 * Dev-tier credentials per D-021 — env vars override SOPS-encrypted values
 * when present:
 *   - `GUIDEWIRE_TENANT_ID`         — stable tenant slug (default `dev-local`)
 *   - `GUIDEWIRE_PC_BASE_URL`       — PolicyCenter Cloud API base URL
 *   - `GUIDEWIRE_TOKEN_ENDPOINT`    — OAuth token endpoint
 *   - `GUIDEWIRE_OAUTH_CLIENT_ID`
 *   - `GUIDEWIRE_OAUTH_CLIENT_SECRET`
 *   - `GUIDEWIRE_OAUTH_SCOPES`      — space-separated scopes
 *   - `GUIDEWIRE_OBS_LOG_LEVEL`     — pino level (default `info`)
 *   - `GUIDEWIRE_ACTOR_ID`          — fallback actor id when no JWT
 *
 * **NO MOCKS** — when creds aren't present, the server still starts and
 * tools surface a structured failure on first call (per D-008). The CLI
 * never falls back to fixtures.
 */

import { createServer } from 'node:http';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

import { createAuth } from '@intentsolutions/guidewire-auth';
import { createClient } from '@intentsolutions/guidewire-client';
import { getObservability } from '@intentsolutions/guidewire-observability';
import { context, trace } from '@opentelemetry/api';

import { POLICYCENTER_TOOLS, SERVER_NAME, SERVER_VERSION } from './index.js';
import type { AuditEventBrief, ToolContext } from './manifest.js';
import { ProfileLoadError, createDefaultProfile, loadProfile } from './profile.js';

interface CliArgs {
  readonly transport: 'stdio' | 'http';
  readonly port: number;
  /** Resolved path to the customer profile directory, or undefined for in-memory default. */
  readonly profilePath: string | undefined;
}

function parseArgs(argv: readonly string[]): CliArgs {
  let transport: 'stdio' | 'http' = 'stdio';
  let port = 3030;
  let profilePath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--transport') {
      const next = argv[i + 1];
      if (next !== 'stdio' && next !== 'http') {
        throw new Error(`--transport must be 'stdio' or 'http', got '${next}'`);
      }
      transport = next;
      i += 1;
    } else if (arg === '--http') {
      transport = 'http';
    } else if (arg === '--stdio') {
      transport = 'stdio';
    } else if (arg === '--port') {
      const next = argv[i + 1];
      if (next === undefined) throw new Error('--port requires a value');
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--port must be a positive integer, got '${next}'`);
      }
      port = parsed;
      i += 1;
    } else if (arg === '--profile') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error('--profile requires a path argument (e.g. --profile profiles/oss-demo)');
      }
      profilePath = next;
      i += 1;
    }
  }
  return { transport, port, profilePath };
}

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value !== undefined && value.length > 0 ? value : undefined;
}

async function buildServer(
  transport: 'stdio' | 'http',
  profilePath: string | undefined,
): Promise<McpServer> {
  const tenantId = getEnv('GUIDEWIRE_TENANT_ID') ?? 'dev-local';
  const pcBaseUrl = getEnv('GUIDEWIRE_PC_BASE_URL');
  const tokenEndpoint = getEnv('GUIDEWIRE_TOKEN_ENDPOINT');
  const clientId = getEnv('GUIDEWIRE_OAUTH_CLIENT_ID');
  const clientSecret = getEnv('GUIDEWIRE_OAUTH_CLIENT_SECRET');
  const oauthScopes = (getEnv('GUIDEWIRE_OAUTH_SCOPES') ?? 'pc.read').split(/\s+/);
  const actorIdFallback = getEnv('GUIDEWIRE_ACTOR_ID') ?? 'actor:dev-local';

  // On stdio transport, stdout is the JSON-RPC wire — pino logs would
  // corrupt it. Silence the logger by default; users can override via
  // `GUIDEWIRE_OBS_LOG_LEVEL` if they're piping logs through a known
  // sink. On HTTP transport, the wire is the HTTP socket so stdout is
  // safe for structured logs.
  const defaultLogLevel: 'info' | 'silent' = transport === 'stdio' ? 'silent' : 'info';
  const observability = getObservability({
    server_name: SERVER_NAME,
    tenant_id: tenantId,
    log_level:
      (getEnv('GUIDEWIRE_OBS_LOG_LEVEL') as
        | 'info'
        | 'warn'
        | 'error'
        | 'debug'
        | 'silent'
        | undefined) ?? defaultLogLevel,
  });

  let auth: Awaited<ReturnType<typeof createAuth>> | undefined;
  if (tokenEndpoint !== undefined && clientId !== undefined && clientSecret !== undefined) {
    auth = await createAuth({
      profile: {
        oauth: {
          client_id_env: 'GUIDEWIRE_OAUTH_CLIENT_ID',
          client_secret_env: 'GUIDEWIRE_OAUTH_CLIENT_SECRET',
          token_endpoint: tokenEndpoint,
          scopes: oauthScopes,
          token_lifetime_seconds: 3600,
          refresh_strategy: 'proactive',
          jwt_propagation: { enabled: false, actor_claim: 'sub' },
        },
        api: {
          cloud_release: 'Palisades',
          ...(pcBaseUrl !== undefined && { base_url_pc: pcBaseUrl }),
        },
      },
      clientId,
      clientSecret,
    });
  }

  // Per D-021 / D-008: when creds aren't present we still start, but every
  // tool call will fail loudly — never silently degrades to mocks.
  const stubAuth = {
    async getToken() {
      throw new Error(
        'Guidewire OAuth not configured — set GUIDEWIRE_TOKEN_ENDPOINT / ' +
          'GUIDEWIRE_OAUTH_CLIENT_ID / GUIDEWIRE_OAUTH_CLIENT_SECRET (per D-021).',
      );
    },
    async refreshToken() {
      throw new Error('Guidewire OAuth not configured.');
    },
    validateJwt() {
      return { sub: actorIdFallback };
    },
  };

  const client = createClient({
    auth: auth ?? stubAuth,
    baseUrls: pcBaseUrl !== undefined ? { pc: pcBaseUrl } : {},
  });

  // Profile loading: --profile <path> loads and validates all 9 YAMLs from
  // disk at boot (per E4). Missing --profile falls back to the in-memory
  // default and logs a warning — the server still starts, but tools surface
  // Guidewire field names without carrier-vocabulary mapping (D-008: no
  // silent mock fallback; tools still hit real endpoints).
  let profile: Awaited<ReturnType<typeof createDefaultProfile>>;
  if (profilePath !== undefined) {
    try {
      profile = await loadProfile(profilePath);
      observability.logger.info(
        {
          profile_path: profilePath,
          tenant_id: profile.tenantId,
          schema_version: profile.schemaVersion,
        },
        'mcp.profile.loaded',
      );
    } catch (err) {
      // ProfileLoadError: typed error naming the exact file + Zod path.
      // Any other error: re-wrap with context. Both are hard boot failures
      // per D-008 — never silently degrade to the default profile.
      if (err instanceof ProfileLoadError) {
        process.stderr.write(
          `policycenter-mcp: profile load failed — ${err.message}\n` +
            `  file: ${err.file}\n` +
            `  path: ${err.zodPath}\n`,
        );
      } else {
        process.stderr.write(
          `policycenter-mcp: profile load failed at "${profilePath}" — ${(err as Error).message}\n`,
        );
      }
      process.exit(1);
    }
  } else {
    process.stderr.write(
      'policycenter-mcp: no --profile <path> supplied; running with in-memory default.\n' +
        '  Field-alias mapping and typelist labels are not carrier-specific.\n' +
        '  Run: pnpm dev policycenter-mcp -- --profile profiles/oss-demo\n',
    );
    profile = createDefaultProfile(tenantId);
  }

  // Read-side audit emitter — Persona 5 wants tamper-evident records of
  // every read for exfil detection per 006 § 1.1. The full hash-chain audit
  // store wires in via `packages/audit` when E3 lands the harness; for now
  // we route to the structured logger.
  const emitAudit = async (event: AuditEventBrief): Promise<void> => {
    observability.logger.info(
      {
        audit_event_type: event.eventType,
        audit_mode: event.mode,
        audit_tool_name: event.toolName,
        audit_tool_version: event.toolVersion,
        audit_result_count: event.resultCount,
        audit_latency_ms: event.latencyMs,
        audit_decision_reason: event.decisionReason,
        tenant_id: tenantId,
      },
      'mcp.audit.event',
    );
  };

  const mcpServer = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  for (const tool of POLICYCENTER_TOOLS) {
    // The MCP SDK's registerTool expects a ZodRawShape (the inside of
    // z.object({...})) for inputSchema. Our manifest carries the wrapped
    // ZodObject so the boot-time validation can call `parse()`; we extract
    // the shape here for SDK registration while preserving full validation
    // by parsing the args inside the callback.
    // biome-ignore lint/suspicious/noExplicitAny: SDK's ZodRawShape needs runtime shape access
    const shape = (tool.inputSchema as any).shape ?? {};

    mcpServer.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: shape,
        _meta: {
          mode: tool.mode,
          version: tool.version,
          epicTag: tool.epicTag,
          requiresHarnessExecute: tool.requiresHarnessExecute,
          incompleteWithoutProfile: tool.incompleteWithoutProfile,
          requiredProfileSchema: tool.requiredProfileSchema,
        },
      },
      async (rawArgs: unknown) => {
        const parseResult = tool.inputSchema.safeParse(rawArgs);
        if (!parseResult.success) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    decision: 'refused',
                    reason: 'invalid_args',
                    message: parseResult.error.message,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        const activeSpan = trace.getSpan(context.active());
        const traceId = activeSpan?.spanContext().traceId ?? `trace-${Date.now().toString(16)}`;

        const ctx: ToolContext = {
          traceId,
          tenantId,
          actorId: actorIdFallback,
          client,
          profile,
          tracer: observability.tracer,
          observability,
          emitAudit,
        };

        try {
          const value = await tool.handler(parseResult.data, ctx);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(value, null, 2),
              },
            ],
          };
        } catch (err) {
          observability.logger.error(
            {
              tool_name: tool.name,
              err: { type: (err as Error).name, message: (err as Error).message },
            },
            'mcp.tool.failure',
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    decision: 'refused',
                    reason: 'tool_error',
                    message: (err as Error).message,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  observability.logger.info(
    {
      server_name: SERVER_NAME,
      version: SERVER_VERSION,
      tool_count: POLICYCENTER_TOOLS.length,
      tenant_id: tenantId,
    },
    'mcp.server.bootstrap',
  );

  return mcpServer;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const server = await buildServer(args.transport, args.profilePath);

  if (args.transport === 'stdio') {
    const stdioTransport = new StdioServerTransport();
    // SDK Transport interface uses non-exactOptional `onclose?: () => void`
    // shapes that conflict with our exactOptionalPropertyTypes setting.
    // The cast scopes the variance fix to one line.
    await server.connect(stdioTransport as unknown as Transport);
    return;
  }

  // Stateless HTTP mode — omit sessionIdGenerator entirely (SDK comment:
  // "If not provided, session management is disabled").
  const httpTransport = new StreamableHTTPServerTransport({});
  await server.connect(httpTransport as unknown as Transport);
  const httpServer = createServer((req, res) => {
    void httpTransport.handleRequest(req, res);
  });
  httpServer.listen(args.port, () => {
    process.stderr.write(`policycenter-mcp HTTP transport listening on :${args.port}\n`);
  });
}

main().catch((err) => {
  process.stderr.write(`policycenter-mcp fatal: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
