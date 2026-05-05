import { request } from 'undici';

import type {
  ClientConfig,
  GetOptions,
  GuidewireFetch,
  GuidewireRequest,
  GuidewireResponse,
  WriteOptions,
} from './types.js';

const DB_TRANSACTION_HEADER = 'GW-DBTransaction-ID';

/**
 * Client interface. `get` is the read path; `post` / `put` are write paths
 * — both REQUIRE a `dbTransactionId` (the value of `Plan.wire.dbTransactionId`).
 *
 * Servers do not consume this client directly (depcruise REFUSE); the
 * harness mediates every call.
 */
export interface GuidewireClient {
  get<T = unknown>(opts: GetOptions): Promise<T>;
  post<T = unknown>(opts: WriteOptions): Promise<T>;
  put<T = unknown>(opts: WriteOptions): Promise<T>;
}

export function createClient(config: ClientConfig): GuidewireClient {
  const fetcher: GuidewireFetch = config.fetch ?? defaultUndiciFetch;

  const baseUrlFor = (suite: 'pc' | 'cc' | 'bc'): string => {
    const url = config.baseUrls[suite];
    if (url === undefined) {
      throw new Error(`No base URL configured for suite '${suite}' in auth.yaml`);
    }
    return url.replace(/\/$/, '');
  };

  const buildUrl = (
    suite: 'pc' | 'cc' | 'bc',
    path: string,
    query?: Readonly<Record<string, string | number | boolean>>,
  ): string => {
    const base = baseUrlFor(suite);
    const normalisedPath = path.startsWith('/') ? path : `/${path}`;
    if (query === undefined || Object.keys(query).length === 0) {
      return `${base}${normalisedPath}`;
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      params.append(key, String(value));
    }
    return `${base}${normalisedPath}?${params.toString()}`;
  };

  const baseHeaders = async (): Promise<Record<string, string>> => {
    const token = await config.auth.getToken();
    return {
      Authorization: `${token.tokenType} ${token.accessToken}`,
      Accept: 'application/json',
    };
  };

  const get = async <T>(opts: GetOptions): Promise<T> => {
    const headers = await baseHeaders();
    const req: GuidewireRequest = {
      method: 'GET',
      url: buildUrl(opts.suite, opts.path, opts.query),
      headers,
    };
    const res = await fetcher(req);
    return parseJson<T>(res);
  };

  const writeWith =
    (method: 'POST' | 'PUT') =>
    async <T>(opts: WriteOptions): Promise<T> => {
      assertDbTxnId(opts.dbTransactionId);
      const headers: Record<string, string> = {
        ...(await baseHeaders()),
        'Content-Type': 'application/json',
        [DB_TRANSACTION_HEADER]: opts.dbTransactionId,
      };
      const req: GuidewireRequest = {
        method,
        url: buildUrl(opts.suite, opts.path, opts.query),
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      };
      const res = await fetcher(req);
      return parseJson<T>(res);
    };

  return {
    get,
    post: writeWith('POST'),
    put: writeWith('PUT'),
  };
}

function assertDbTxnId(value: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new Error(
      `dbTransactionId must be 64 hex chars (Plan.wire.dbTransactionId per librarian P1); got '${value}'`,
    );
  }
}

function parseJson<T>(res: GuidewireResponse): T {
  if (res.status >= 400) {
    throw new Error(`Cloud API returned ${res.status}: ${res.body.slice(0, 256)}`);
  }
  if (res.body.length === 0) {
    return undefined as T;
  }
  return JSON.parse(res.body) as T;
}

const defaultUndiciFetch: GuidewireFetch = async (req) => {
  const res = await request(req.url, {
    method: req.method,
    headers: { ...req.headers },
    ...(req.body !== undefined && { body: req.body }),
  });
  const body = await res.body.text();
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(res.headers)) {
    if (typeof value === 'string') headers[key] = value;
    else if (Array.isArray(value)) headers[key] = value.join(',');
  }
  return { status: res.statusCode, headers, body };
};
