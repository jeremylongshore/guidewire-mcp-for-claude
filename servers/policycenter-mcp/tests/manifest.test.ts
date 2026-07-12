import { describe, expect, it } from 'vitest';

import { POLICYCENTER_TOOLS, SERVER_NAME, SERVER_VERSION, listTools } from '../src/index.js';
import { formatDescription } from '../src/manifest.js';

describe('PolicyCenter manifest catalog', () => {
  it('ships exactly 9 tools (per E5 roadmap set)', () => {
    expect(POLICYCENTER_TOOLS).toHaveLength(9);
  });

  it('canonical tool names match D-016 (no API-verb prefixes, no engineering jargon)', () => {
    const names = POLICYCENTER_TOOLS.map((t) => t.name);
    expect(names).toEqual([
      'find-submissions-waiting-on-me',
      'show-policies-for-this-insured',
      'summarize-this-submission',
      'did-we-lose-this-account',
      'pull-this-submission',
      'draft-referral-note',
      'draft-endorsement',
      'whats-our-appetite-on-this-risk',
      'explain-why-this-got-referred',
    ]);
    for (const name of names) {
      expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(name).not.toMatch(/^(search|get|list|fetch|query|update|create|delete)[-_]/);
    }
  });

  it('declares valid modes and harness-execute requirements', () => {
    for (const tool of POLICYCENTER_TOOLS) {
      if (tool.mode === 'read_only') {
        expect(tool.requiresHarnessExecute).toBe(false);
      } else {
        expect(tool.mode).toBe('draft_only');
        expect(tool.requiresHarnessExecute).toBe(true);
      }
    }
  });

  it('every tool description follows the CV-6 <question> · <when-to-use> shape rule', () => {
    for (const tool of POLICYCENTER_TOOLS) {
      const expected = formatDescription(tool.vocabulary);
      expect(tool.description).toBe(expected);
      // The rendered description carries the "·" separator literally.
      expect(tool.description.split(' · ').length).toBe(2);
    }
  });

  it('every tool declares profile dependencies (BA-3 manifest schema invariant)', () => {
    for (const tool of POLICYCENTER_TOOLS) {
      expect(tool.requiredProfileSchema).toMatch(/^>?=?v\d+\.\d+/);
      expect(tool.requiredProfileFiles.length).toBeGreaterThan(0);
      // Every tool reads field-aliases.yaml — it's the carrier-vocabulary
      // mapping layer per 02-PRD § 6.6.
      expect(tool.requiredProfileFiles).toContain('field-aliases.yaml');
    }
  });

  it('listTools returns the public catalog summary used by MCP tools/list', () => {
    const summary = listTools();
    expect(summary).toHaveLength(9);
    for (const entry of summary) {
      expect(['read_only', 'draft_only']).toContain(entry.mode);
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.description).toBe('string');
      expect(entry.version).toBe('0.1.0');
    }
  });

  it('exports server metadata for the SDK constructor', () => {
    expect(SERVER_NAME).toBe('policycenter-mcp');
    expect(SERVER_VERSION).toBe('0.1.0');
  });
});
