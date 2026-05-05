import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { getObservability } from '@intentsolutions/guidewire-observability';

import { createMcpServer } from '../src/server.js';
import type { ToolRegistration } from '../src/types.js';

const obs = getObservability({
  server_name: 'test-mcp',
  tenant_id: 'sandbox-jeremy-dev',
  log_level: 'silent',
});

const stubTool = (overrides: Partial<ToolRegistration> = {}): ToolRegistration => ({
  name: 'find-submissions-waiting-on-me',
  description: "The underwriter's personal queue, sorted by stake.",
  version: '1.0.0',
  mode: 'read_only',
  inputSchema: z.object({ assignedToMe: z.boolean().default(true) }),
  handler: async () => ({ items: [] }),
  ...overrides,
});

describe('createMcpServer', () => {
  it('registers a stub tool and exposes it via tools/list', () => {
    const server = createMcpServer(
      [stubTool()],
      { name: 'policycenter-mcp', version: '0.1.0', tenantId: 'sandbox-jeremy-dev' },
      obs,
    );
    const list = server.listTools();
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('find-submissions-waiting-on-me');
    expect(list[0]?.mode).toBe('read_only');
  });

  it('getTool returns the original registration', () => {
    const tool = stubTool();
    const server = createMcpServer(
      [tool],
      { name: 'policycenter-mcp', version: '0.1.0', tenantId: 'sandbox-jeremy-dev' },
      obs,
    );
    expect(server.getTool('find-submissions-waiting-on-me')).toBe(tool);
  });

  it('refuses API-verb prefixes (vocabulary linter integration)', () => {
    expect(() =>
      createMcpServer(
        [stubTool({ name: 'search_policies' })],
        { name: 'policycenter-mcp', version: '0.1.0', tenantId: 'sandbox-jeremy-dev' },
        obs,
      ),
    ).toThrow(/API-verb prefix/);
  });

  it('refuses non-kebab-case tool names', () => {
    expect(() =>
      createMcpServer(
        [stubTool({ name: 'FindSubmissionsWaitingOnMe' })],
        { name: 'policycenter-mcp', version: '0.1.0', tenantId: 'sandbox-jeremy-dev' },
        obs,
      ),
    ).toThrow(/carrier-vocabulary shaped/);
  });

  it('refuses duplicate tool registrations', () => {
    expect(() =>
      createMcpServer(
        [stubTool(), stubTool()],
        { name: 'policycenter-mcp', version: '0.1.0', tenantId: 'sandbox-jeremy-dev' },
        obs,
      ),
    ).toThrow(/Duplicate tool registration/);
  });
});
