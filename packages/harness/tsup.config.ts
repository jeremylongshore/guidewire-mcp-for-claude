import { defineConfig } from 'tsup';

export default defineConfig([
  // Library entry — the main package import
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    target: 'node22',
    splitting: false,
  },
  // CLI entry — guidewire-harness binary. Shebang lives in src/cli.ts (first
  // line); no banner needed here. tsup preserves the shebang comment.
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    target: 'node22',
    splitting: false,
  },
]);
