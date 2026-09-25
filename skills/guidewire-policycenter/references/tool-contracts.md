# PolicyCenter Tool Contracts

This reference summarizes the v0.1.1 plugin's five registered tools. The
TypeScript schemas in `servers/policycenter-mcp/src/tools/` remain authoritative.

## Inputs

- `find-submissions-waiting-on-me`: optional `actorId`; `pageSize` 1 through
  100; non-negative `pageOffset`. The configured actor is used when omitted.
- `show-policies-for-this-insured`: required Guidewire `accountId` plus optional
  pagination.
- `summarize-this-submission`: required Guidewire Job `jobId`.
- `did-we-lose-this-account`: required Guidewire `accountId` plus optional
  pagination.
- `pull-this-submission`: required Guidewire Job `jobId`.

Every tool declares `read_only` mode and `requiresHarnessExecute: false`.

## Current response boundaries

The queue tool returns count, submission number, status, assignee, and kind.
The policies tool returns count, policy number, status, line of business, and
effective and expiration dates. The account-loss tool filters cancelled,
lapsed, or lost policies and returns cancellation reasons.

The summary tool currently reads a single Job resource and projects core
fields. Repository comments reserve composite fan-out for later tenant-backed
validation. The pull tool returns core fields plus the full attributes object
from that Job resource.

## Example sequences

- Morning review: call the queue tool with the default actor and bounded
  pagination, then report each returned submission without adding a ranking the
  response did not provide.
- Account history: with a confirmed `accountId`, call the account-loss tool and
  report status, line, dates, and reason without assigning blame.
- Submission drill-down: use a returned Job resource ID with the summary tool;
  use the pull tool only when the user requests deeper attributes.

## Runtime behavior

The server registers the tools under the `policycenter` MCP configuration. It
starts without credentials but uses a stub authenticator that throws on tool
calls. With credentials, it requests Guidewire Hub OAuth tokens and calls the
configured PolicyCenter base URL. The default OAuth scope is `pc.read`.

Without a `--profile` argument, the server uses an in-memory default and warns
that field aliases and typelist labels are not carrier-specific. A supplied
profile is validated at boot; invalid profile files cause an explicit refusal.
