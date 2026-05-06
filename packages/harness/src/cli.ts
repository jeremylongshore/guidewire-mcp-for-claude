#!/usr/bin/env node
/**
 * guidewire-harness CLI — per D-003 (library + CLI, NOT an MCP server).
 *
 * Subcommands:
 *   plan-export  <traceId>     Print the Plan JSON for a given traceId to stdout.
 *   audit-verify [--from-seq N] Verify the hash chain integrity for a tenant.
 *   evidence-export <traceId> Write the EvidenceBundle JSON to stdout.
 *
 * The CLI is process-bounded (no shared state with a running MCP server).
 * It reads audit store state at invocation time from the configured Postgres
 * DSN (via GUIDEWIRE_AUDIT_DSN env var) or falls back to an in-memory store
 * that contains no entries (useful for smoke-testing the binary itself).
 *
 * In this skeleton, the Postgres store binding is a stub (subsequent bead
 * wires the real pg-store). The CLI demonstrates the interface contract and
 * passes the `audit-verify` smoke test with an empty in-memory store.
 *
 * Usage:
 *   guidewire-harness plan-export <traceId>
 *   guidewire-harness audit-verify [--from-seq <N>] [--tenant <id>]
 *   guidewire-harness evidence-export <traceId> [--include-spans]
 */

import { createMemoryAuditStore } from '@intentsolutions/guidewire-audit';
import { createEvidenceExporter } from './evidence/exporter.js';

// ─── Arg parsing (no commander/yargs — pure process.argv) ───────────────────

const args = process.argv.slice(2);
const subcommand = args[0];

function flag(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

function fatal(msg: string): never {
  process.stderr.write(`guidewire-harness: ${msg}\n`);
  process.exit(1);
}

function out(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

// ─── Store bootstrap (skeleton: always in-memory, real pg binding is E3+) ───

function bootAuditStore() {
  // In production: read GUIDEWIRE_AUDIT_DSN and init the pg-store.
  // For now, return the in-memory store (empty — demonstrates the interface).
  return createMemoryAuditStore();
}

// ─── Subcommand dispatch ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (subcommand === undefined || subcommand === '--help' || subcommand === '-h') {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  switch (subcommand) {
    case 'plan-export': {
      const traceId = args[1];
      if (traceId === undefined) fatal('plan-export requires a <traceId> argument');

      const tenantId = flag('--tenant') ?? 'default';
      const store = bootAuditStore();
      const entries: unknown[] = [];

      for await (const entry of store.query({ tenantId })) {
        if (entry.traceId === traceId && entry.eventType === 'plan.created') {
          entries.push(entry);
        }
      }

      if (entries.length === 0) {
        process.stderr.write(`guidewire-harness: no plan.created entry for traceId=${traceId}\n`);
        process.exit(1);
      }

      out({
        subcommand: 'plan-export',
        traceId,
        planEntry: entries[0],
        note: 'Full Plan JSON (args, summary, wire) lives in blobRef — E3+ blob store binding required for complete reconstruction.',
      });
      break;
    }

    case 'audit-verify': {
      const fromSeqRaw = flag('--from-seq');
      const fromSeq = fromSeqRaw !== undefined ? Number.parseInt(fromSeqRaw, 10) : 1;
      const tenantId = flag('--tenant') ?? 'default';

      if (Number.isNaN(fromSeq)) fatal(`--from-seq must be an integer, got: ${fromSeqRaw}`);

      const store = bootAuditStore();
      const result = await store.verifyChain(tenantId, fromSeq);

      out({
        subcommand: 'audit-verify',
        ...result,
        note: result.valid
          ? `Chain is valid (seq ${result.fromSeq}..${result.toSeq}).`
          : `Chain BROKEN at seq=${result.brokenAtSeq ?? 'unknown'}: ${result.reason ?? 'see above'}`,
      });

      // Exit non-zero when chain is broken so CI scripts can gate on it.
      if (!result.valid) process.exit(2);
      break;
    }

    case 'evidence-export': {
      const traceId = args[1];
      if (traceId === undefined) fatal('evidence-export requires a <traceId> argument');

      const tenantId = flag('--tenant') ?? 'default';
      const includeSpans = hasFlag('--include-spans');

      const store = bootAuditStore();
      const exporter = createEvidenceExporter({ audit: store, tenantId });
      const bundle = await exporter.build(traceId, { includeSpans });

      out(bundle);
      break;
    }

    default:
      fatal(`unknown subcommand: ${subcommand}\n${USAGE}`);
  }
}

const USAGE = `
guidewire-harness — Guidewire MCP harness CLI (D-003)

Usage:
  guidewire-harness plan-export <traceId> [--tenant <id>]
  guidewire-harness audit-verify [--from-seq <N>] [--tenant <id>]
  guidewire-harness evidence-export <traceId> [--tenant <id>] [--include-spans]
  guidewire-harness --help

Environment:
  GUIDEWIRE_AUDIT_DSN   Postgres DSN for the audit store (E3+ binding; skeleton uses in-memory)

Exit codes:
  0   Success
  1   Usage / configuration error
  2   Chain integrity check failed (audit-verify only)
`.trimStart();

main().catch((err) => {
  process.stderr.write(`guidewire-harness: unexpected error: ${String(err)}\n`);
  process.exit(1);
});
