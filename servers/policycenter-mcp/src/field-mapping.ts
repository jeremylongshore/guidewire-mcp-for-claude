/**
 * Field-mapping helpers for PolicyCenter responses.
 *
 * Guidewire Cloud API responses are envelope-shaped: `{ count, total, data:
 * [{ attributes: { ... } }] }` per the apiref module pages. These helpers
 * extract `data[*].attributes` and apply per-tenant `field-aliases.yaml`
 * remapping (02-PRD § 6.6) so tool outputs speak the carrier's vocabulary
 * rather than Guidewire's raw field names.
 *
 * Money typing per 008 § 11 / 05-TECHNICAL-SPEC § 3.1: `{ amount: string,
 * currency: string }` — `amount` is string for arbitrary precision (do NOT
 * use JS `number` for financial values).
 */

import type { AliasScope, ProfileHandle } from './profile.js';

/**
 * Common Guidewire envelope. Each list-shaped Cloud API response wraps the
 * payload in a `{ data: [...], count, total }` shape; single-resource reads
 * return `{ data: { id, attributes } }` (no array). The mapping helpers
 * below handle both forms.
 */
export interface GuidewireResource<TAttrs = Record<string, unknown>> {
  readonly id: string;
  readonly attributes: TAttrs;
  readonly links?: Record<string, { href: string }>;
}

export interface GuidewireListEnvelope<TAttrs = Record<string, unknown>> {
  readonly count?: number;
  readonly total?: number;
  readonly data: ReadonlyArray<GuidewireResource<TAttrs>>;
}

export interface GuidewireSingleEnvelope<TAttrs = Record<string, unknown>> {
  readonly data: GuidewireResource<TAttrs>;
}

/**
 * Money-typed value per 008 § 11. `amount` is string — never JS `number`
 * for financial values (precision loss is unacceptable for multi-currency
 * carriers; stripping currency is a catastrophic error).
 */
export interface Money {
  readonly amount: string;
  readonly currency: string;
}

/**
 * Maps a Guidewire `attributes` payload to a carrier-vocabulary record by
 * applying the active profile's `field-aliases.yaml`. The result is a
 * plain object whose keys are the alias names — a missing alias surfaces
 * the raw field, never throws.
 */
export function applyFieldAliases<TOut extends Record<string, unknown>>(
  attributes: Record<string, unknown>,
  scope: AliasScope,
  profile: ProfileHandle,
  fields: readonly string[],
): Partial<TOut> {
  const out: Record<string, unknown> = {};
  for (const rawField of fields) {
    const aliasedKey = profile.fieldAlias(scope, rawField);
    if (rawField in attributes) {
      out[aliasedKey] = attributes[rawField];
    }
  }
  return out as Partial<TOut>;
}

/**
 * Pulls the `data` array from a Guidewire list envelope, or `[]` when the
 * payload is empty. Tools never see the envelope directly — they consume
 * `extractList(...)` and map.
 */
export function extractList<TAttrs>(
  envelope: GuidewireListEnvelope<TAttrs>,
): ReadonlyArray<GuidewireResource<TAttrs>> {
  return envelope.data;
}

/**
 * Pulls the `data` object from a Guidewire single-resource envelope.
 */
export function extractSingle<TAttrs>(
  envelope: GuidewireSingleEnvelope<TAttrs>,
): GuidewireResource<TAttrs> {
  return envelope.data;
}

/**
 * Defensive type guard for Money-shaped fields. Per 008 § 11 / 05-TECHNICAL-SPEC
 * § 3.1, Money fields MUST be string-typed (never JS `number`).
 */
export function isMoney(value: unknown): value is Money {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.amount === 'string' && typeof v.currency === 'string';
}
