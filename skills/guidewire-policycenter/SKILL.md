---
name: guidewire-policycenter
description: >-
  Answer bounded underwriting questions with the Guidewire PolicyCenter MCP
  server's five implemented read-only tools. Use when reviewing an underwriter's
  submission queue, retrieving a submission, listing an account's policies, or
  checking cancellation and non-renewal history. Trigger with "PolicyCenter",
  "submissions waiting on me", "pull this submission", "policies for this
  insured", or "did we lose this account".
allowed-tools:
  - mcp__policycenter__find-submissions-waiting-on-me
  - mcp__policycenter__show-policies-for-this-insured
  - mcp__policycenter__summarize-this-submission
  - mcp__policycenter__did-we-lose-this-account
  - mcp__policycenter__pull-this-submission
version: 0.1.1
author: Jeremy Longshore <jeremy@intentsolutions.io>
license: Apache-2.0
compatibility: Designed for Claude Code with the guidewire-mcp plugin and Node.js 22 or newer
tags:
  - mcp
  - guidewire
  - insurance
  - policycenter
  - underwriting
argument-hint: "[underwriting question, account ID, or job ID]"
model: inherit
effort: high
---

# Guidewire PolicyCenter

## Overview

Use the current PolicyCenter MCP surface to perform five carrier-vocabulary
reads. Select one tool that answers the question, pass only the identifiers and
pagination requested, and distinguish returned facts from underwriting
interpretation.

This skill does not authorize writes. The current tools have `read_only` mode
and call PolicyCenter Job or Policy APIs. ClaimCenter, BillingCenter, drafting,
approval, and execute workflows are roadmap scope, not capabilities of this
skill.

## Prerequisites

- Install and build the `guidewire-mcp` Claude Code plugin on Node.js 22 or
  newer so its `policycenter` MCP server is connected.
- Obtain an authorized Guidewire Hub OAuth client and tenant endpoints.
- Know the required Guidewire `accountId` or Job `jobId`, unless a prior tool
  response in the same workflow supplied it.

## Authentication

The `policycenter` server uses Guidewire Hub OAuth client credentials. Its first
real tool call requires these runtime environment variables:

- `GUIDEWIRE_OAUTH_CLIENT_ID`
- `GUIDEWIRE_OAUTH_CLIENT_SECRET`
- `GUIDEWIRE_TOKEN_ENDPOINT`
- `GUIDEWIRE_PC_BASE_URL`

Optional runtime settings include `GUIDEWIRE_TENANT_ID`,
`GUIDEWIRE_OAUTH_SCOPES` (default `pc.read`), `GUIDEWIRE_ACTOR_ID`, and
`GUIDEWIRE_OBS_LOG_LEVEL`.

The server can start without OAuth configuration, but calls then fail loudly;
it does not substitute fixtures or mock data. Never ask the user to paste a
client secret into chat, and never reproduce tokens or secrets in output.

## Tool Selection

| User intent | Tool | Inputs | Returns |
|---|---|---|---|
| Review an underwriter's open queue | `mcp__policycenter__find-submissions-waiting-on-me` | Optional `actorId`; optional `pageSize`, `pageOffset` | Count and submission summaries |
| List policies for a known insured account | `mcp__policycenter__show-policies-for-this-insured` | `accountId`; optional pagination | Policy number, status, line, dates |
| Get an elevator-pitch submission view | `mcp__policycenter__summarize-this-submission` | `jobId` | Submission number, status, assignee, kind, optional account ID |
| Check cancellation, lapse, or non-renewal history | `mcp__policycenter__did-we-lose-this-account` | `accountId`; optional pagination | Lost policies and cancellation reasons |
| Retrieve the full attributes of one submission | `mcp__policycenter__pull-this-submission` | `jobId` | Core fields plus the complete returned attributes object |

`accountId` and `jobId` are Guidewire resource identifiers, not display names
or submission numbers. The current tool catalog has no account-name search or
identifier-resolution tool. If the user supplies only a name or business-facing
number and the needed resource ID is absent from conversation context, explain
the limitation instead of guessing.

Pagination rules are `pageSize` from 1 through 100 and a non-negative
`pageOffset`. Default to the server's page size of 20 unless the user requests a
different bounded result set.

## Instructions

### Step 1: Classify the question

Choose the single closest intent from the tool table. Do not call all five tools
for a question one call can answer. If the request includes several distinct
questions, state the minimal call sequence before proceeding.

### Step 2: Confirm identifiers

Use identifiers already provided by the user or returned by a prior tool call.
Never infer an `accountId` or `jobId` from a company name, policy number, or
submission number.

For `mcp__policycenter__find-submissions-waiting-on-me`, omit `actorId` to use
the server's configured actor. Only provide another actor when the user
explicitly requests that person's queue and the deployment's access policy
allows it.

### Step 3: Invoke the read

Call exactly one of:

- `mcp__policycenter__find-submissions-waiting-on-me`
- `mcp__policycenter__show-policies-for-this-insured`
- `mcp__policycenter__summarize-this-submission`
- `mcp__policycenter__did-we-lose-this-account`
- `mcp__policycenter__pull-this-submission`

Keep the request bounded. Do not add fields, filters, or execution modes that
are not in the selected tool's input schema.

### Step 4: Interpret conservatively

Preserve PolicyCenter facts such as identifiers, statuses, dates, counts, and
cancellation reasons. Apply these rules:

- An empty list means no matching records were returned; it does not prove the
  account or submission never existed.
- A raw typelist code or blank label may indicate that the carrier profile is
  incomplete.
- The default in-memory profile is not carrier-specific. A supplied profile can
  map field aliases, lines of business, roles, and typelist labels.
- `summarize-this-submission` currently projects fields from one Job resource.
  Do not claim that contacts, locations, coverages, premium, or exposures were
  retrieved unless they are present in the actual response.
- `pull-this-submission` exposes the returned attributes object; summarize only
  fields relevant to the user's question and avoid unnecessary personal data.

### Step 5: Report with provenance

Lead with the direct answer, followed by the relevant identifiers and returned
facts. State which PolicyCenter tool supplied the result. Clearly label any
inference, and never present a business recommendation as a Guidewire fact.

The current server emits structured start, completion, and failure audit events
through observability. Do not claim that a hash-chained persistence layer was
used unless the running deployment independently proves that integration.

## Output

Return the direct answer first, then a compact fact list containing the
relevant Guidewire identifiers, statuses, dates, counts, and source tool. Label
inferences explicitly. When the call fails or data is incomplete, return the
failure boundary and the safe next check instead of fabricating a result.

## Safety and Data Handling

- Treat policy, account, contact, premium, and cancellation data as sensitive
  insurance information.
- Return only fields necessary to answer the question.
- Do not expose OAuth credentials, authorization headers, or raw diagnostic
  payloads containing secrets.
- Do not use a read result to initiate a write, renewal, cancellation, quote,
  payment, or claims action.
- Do not silently cross actors, tenants, or carrier profiles.
- Do not claim production validation for endpoint filters that the repository
  marks for tenant smoke testing.

## Error Handling

- **OAuth not configured:** Name the missing environment variable category and
  stop. Do not request secret values in chat.
- **Unauthorized or forbidden:** Confirm tenant, scopes, actor, and carrier
  policy outside the response body before retrying.
- **Not found:** Verify whether the tool expects `accountId` or `jobId`; do not
  substitute a display number.
- **Profile load failure:** Report the named profile file and validation path
  from the error. Do not fall back silently to the default profile.
- **Rate limit or transient service failure:** Report that the result is
  incomplete. Retry only when safe, honoring provider guidance.
- **Unknown field or typelist code:** Preserve the raw value, label it as
  unresolved, and recommend updating the carrier profile.

## Examples

Use the queue tool for a bounded morning review, the account-loss tool for a
confirmed account ID, and the summary tool followed by the pull tool only when
the user requests a deeper drill-down. See the exact sequences and response
boundaries in [the tool contracts](references/tool-contracts.md).

## Success Criteria

A successful invocation uses a real Guidewire resource identifier, performs
only the smallest necessary read, reports the response accurately with tool
provenance, protects sensitive insurance data and credentials, and makes no
claim that exceeds the current server implementation.

## Resources

- [PolicyCenter tool contracts and examples](references/tool-contracts.md)
- Repository sources: `.mcp.json`, `servers/policycenter-mcp/src/index.ts`, and
  `servers/policycenter-mcp/src/tools/`
