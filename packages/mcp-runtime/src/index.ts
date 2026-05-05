/**
 * @intentsolutions/guidewire-mcp-runtime
 *
 * Thin wrapper around `@modelcontextprotocol/sdk` that wires harness,
 * observability, and audit into every tool registration. Stdio + HTTP
 * transports use the SDK directly — never wrap with Express/Fastify per
 * CLAUDE.md hard rule.
 *
 * Per 02-PRD § 3 + 02-PRD § 5.9 (three-mode enforcement at handshake) +
 * 05-TECHNICAL-SPEC § 4 (observability fan-out per tool call).
 */

export * from './server.js';
export type * from './types.js';
