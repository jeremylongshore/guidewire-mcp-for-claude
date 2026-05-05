# `@intentsolutions/guidewire-mcp-runtime`

Thin wrapper around `@modelcontextprotocol/sdk` that wires the harness,
observability, and audit chain into every tool registration. The actual
stdio + HTTP transports come from the MCP SDK directly —
**no Express/Fastify** per [CLAUDE.md](../../CLAUDE.md) hard rule.

Reference spec: [02-PRD § 3](../../000-docs/blueprint/02-PRD.md) +
[02-PRD § 5.9](../../000-docs/blueprint/02-PRD.md) (three-mode enforcement
at handshake) + [05-TECHNICAL-SPEC § 4](../../000-docs/blueprint/05-TECHNICAL-SPEC.md)
(observability fan-out per tool call).

## Public API

```ts
import { createMcpServer, type ToolRegistration } from '@intentsolutions/guidewire-mcp-runtime';
import { getObservability } from '@intentsolutions/guidewire-observability';
import { z } from 'zod';

const obs = getObservability({
  server_name: 'policycenter-mcp',
  tenant_id: 'sandbox-jeremy-dev',
});

const findSubmissions: ToolRegistration = {
  name: 'find-submissions-waiting-on-me',
  description: "The underwriter's personal queue, sorted by stake.",
  version: '1.0.0',
  mode: 'read_only',
  inputSchema: z.object({ assignedToMe: z.boolean().default(true) }),
  handler: async (args, ctx) => {
    // ...harness-mediated read against PolicyCenter...
    return { items: [] };
  },
};

const server = createMcpServer(
  [findSubmissions],
  { name: 'policycenter-mcp', version: '1.0.0', tenantId: 'sandbox-jeremy-dev' },
  obs,
);

server.listTools(); // → MCP tools/list shape
```

## Boot-time validation

Tool registration enforces the carrier-vocabulary 8-rule checklist
mechanically (per [007 § 7](../../000-docs/007-DR-MEMO-carrier-vocabulary.md)).
Rules enforced at registration:

| Rule | Failure mode |
|---|---|
| Lowercase + hyphen-coupled | `Tool name '...' is not carrier-vocabulary shaped` |
| No API-verb prefix (`search_`, `get_`, `list_`, ...) | `Tool name '...' starts with API-verb prefix '...'` |
| No duplicate registrations | `Duplicate tool registration: ...` |

Other rules (engineering-speak, possessive scope, persona density) live in
`audit-harness vocab-lint` and run at PR time + boot.

## Three-mode contract enforcement

Mode is part of the registration and is bound at MCP-handshake time. It is
NOT negotiable mid-call (006 § 7.2). The transport layer (which lives in
`servers/<suite>-mcp/` not here) injects the harness on every invocation —
the runtime exposes the registry; the harness wraps the handler with
plan → policy → execute → audit.

## Testing

```bash
pnpm --filter @intentsolutions/guidewire-mcp-runtime test
```
