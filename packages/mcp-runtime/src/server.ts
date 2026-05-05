import type { ObservabilityHandle } from '@intentsolutions/guidewire-observability';

import type { McpServerConfig, RegisteredTool, ToolRegistration } from './types.js';

/**
 * Carrier-vocabulary tool name validator. Hyphen-coupled, lowercase, no
 * API-verb prefixes (vocab-lint enforces this in CI per 007 § 7 rule 1).
 */
const TOOL_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
/**
 * Both underscore-prefixed (`search_*`) and hyphen-prefixed (`search-*`)
 * forms are refused — the rule is the lexical opening, not the separator.
 */
const API_VERB_PREFIXES = [
  'search_',
  'get_',
  'list_',
  'fetch_',
  'query_',
  'update_',
  'create_',
  'delete_',
  'search-',
  'get-',
  'list-',
  'fetch-',
  'query-',
  'update-',
  'create-',
  'delete-',
];

export interface McpServer {
  readonly name: string;
  readonly version: string;
  readonly tools: readonly RegisteredTool[];
  /** Returns the registration for an exact tool name; throws if unknown. */
  getTool(name: string): ToolRegistration;
  /** MCP `tools/list` shape — what the agent sees during handshake. */
  listTools(): readonly RegisteredTool[];
}

/**
 * Builds a server bundle with three-mode enforcement applied at registration
 * time. The actual transport (stdio / HTTP) wires up via the MCP SDK in
 * the `servers/<suite>-mcp/` package; this runtime returns the validated
 * tool registry the SDK consumes.
 */
export function createMcpServer(
  tools: ReadonlyArray<ToolRegistration>,
  config: McpServerConfig,
  observability: ObservabilityHandle,
): McpServer {
  const registry = new Map<string, ToolRegistration>();
  const summaries: RegisteredTool[] = [];

  for (const tool of tools) {
    assertCarrierVocabulary(tool.name);
    if (registry.has(tool.name)) {
      throw new Error(`Duplicate tool registration: ${tool.name}`);
    }
    registry.set(tool.name, tool);
    summaries.push({
      name: tool.name,
      description: tool.description,
      version: tool.version,
      mode: tool.mode,
      inputSchema: tool.inputSchema,
    });
  }

  observability.logger.info(
    {
      server_name: config.name,
      tenant_id: config.tenantId,
      tool_count: summaries.length,
    },
    'mcp.server.bootstrap',
  );

  return {
    name: config.name,
    version: config.version,
    tools: summaries,
    getTool(name): ToolRegistration {
      const tool = registry.get(name);
      if (tool === undefined) {
        throw new Error(`Unknown tool: ${name}`);
      }
      return tool;
    },
    listTools(): readonly RegisteredTool[] {
      return summaries;
    },
  };
}

function assertCarrierVocabulary(name: string): void {
  for (const prefix of API_VERB_PREFIXES) {
    if (name.startsWith(prefix)) {
      throw new Error(
        `Tool name '${name}' starts with API-verb prefix '${prefix}' — refused per 007 § 7 rule 1.`,
      );
    }
  }
  if (!TOOL_NAME_PATTERN.test(name)) {
    throw new Error(
      `Tool name '${name}' is not carrier-vocabulary shaped (lowercase, hyphen-coupled).`,
    );
  }
}
