import type { ToolMode } from '@intentsolutions/guidewire-schemas';
import type { z } from 'zod';

/**
 * Tool registration shape per 02-PRD § 3 + § 5.9. Mode is declared in
 * tool metadata (Zod schema + manifest), bound at MCP-handshake time, and
 * is NOT negotiable mid-call (006 § 7.2).
 */
export interface ToolRegistration<TArgs extends z.ZodTypeAny = z.ZodTypeAny, TResult = unknown> {
  /** Carrier-vocabulary, hyphen-coupled (007 § 7 rule 3). */
  readonly name: string;
  /** Operator-voice, no engineering jargon (007 § 7 rule 7). */
  readonly description: string;
  /** Tool version — pinned into the harness idempotency-key derivation. */
  readonly version: string;
  /** Three-mode declaration per D-005. */
  readonly mode: ToolMode;
  /** Local Zod schema validating tool args at the server boundary. */
  readonly inputSchema: TArgs;
  /**
   * Minimum profile schema version required (e.g. `>=v2.0` for E2.5
   * aggregate-query tools per D-020). Boot-time validation refuses to load
   * tools whose required schema is not satisfied by the active profile.
   */
  readonly requiredProfileSchema?: string;
  /** Tool implementation. The runtime opens spans + writes audit before/after. */
  readonly handler: (args: z.infer<TArgs>, ctx: ToolContext) => Promise<TResult>;
}

export interface ToolContext {
  readonly traceId: string;
  readonly tenantId: string;
  readonly actorId: string;
}

export interface McpServerConfig {
  readonly name: string;
  readonly version: string;
  readonly tenantId: string;
}

export interface RegisteredTool {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly mode: ToolMode;
  readonly inputSchema: z.ZodTypeAny;
}
