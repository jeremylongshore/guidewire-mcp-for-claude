import type { AuthHandle } from '@intentsolutions/guidewire-auth';

/**
 * Per-suite Cloud API base URLs from the tenant's `auth.yaml`.
 */
export interface ClientBaseUrls {
  readonly pc?: string;
  readonly cc?: string;
  readonly bc?: string;
}

export interface ClientConfig {
  readonly auth: AuthHandle;
  readonly baseUrls: ClientBaseUrls;
  /** Override the default undici fetcher — used by tests + `tests/recordings/` replayer. */
  readonly fetch?: GuidewireFetch;
}

/**
 * Minimal HTTP shape used internally — kept narrow so the recordings
 * replayer in `tests/recordings/` can serve responses without pulling in
 * the full undici types.
 */
export type GuidewireFetch = (input: GuidewireRequest) => Promise<GuidewireResponse>;

export interface GuidewireRequest {
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string | undefined;
}

export interface GuidewireResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface GetOptions {
  readonly suite: 'pc' | 'cc' | 'bc';
  readonly path: string;
  readonly query?: Readonly<Record<string, string | number | boolean>>;
}

export interface WriteOptions extends GetOptions {
  /**
   * The `GW-DBTransaction-ID` value to inject. Per 02-PRD § 5.4 + librarian
   * P1, this is `Plan.wire.dbTransactionId` (NOT `Plan.idempotencyKey`).
   * The harness derives this; servers never construct it.
   */
  readonly dbTransactionId: string;
  readonly body?: unknown;
}
