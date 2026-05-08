import { describe, expect, it } from 'vitest';

import { tool } from '../src/tools/explain-why-this-got-referred.js';

describe('explain-why-this-got-referred', () => {
  it('declares carrier-vocabulary metadata per E5 manifest contract', () => {
    expect(tool.name).toBe('explain-why-this-got-referred');
    expect(tool.mode).toBe('read_only');
    expect(tool.epicTag).toBe('E5');
    expect(tool.requiresHarnessExecute).toBe(false);
    expect(tool.incompleteWithoutProfile).toBe(true);
    expect(tool.requiredProfileFiles).toContain('custom-entities.yaml');
    expect(tool.description).toMatch(/ · /);
  });
});
