/**
 * Pagination helper using `pageSize` / `pageOffset` per the librarian KB
 * (`005-DR-REF` § Pagination — AUTHORITATIVE per IS 202603 Consumer Guide).
 *
 * https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/query-parameters/c_the-pagination-query-parameters.html
 *
 * P5 of the librarian audit confirmed this is confidence-grade — no
 * `(unverified)` flag.
 */
export interface PageRequest {
  readonly pageSize?: number;
  readonly pageOffset?: number;
}

export const DEFAULT_PAGE_SIZE = 20;

export function withPagination(
  query: Readonly<Record<string, string | number | boolean>>,
  page: PageRequest = {},
): Record<string, string | number | boolean> {
  return {
    ...query,
    pageSize: page.pageSize ?? DEFAULT_PAGE_SIZE,
    pageOffset: page.pageOffset ?? 0,
  };
}

/**
 * `totalCount` is returned in the Cloud API response per the
 * AUTHORITATIVE pagination doc; "previous" and "next" links are returned
 * as response headers/body links. The full iterator (following next-link
 * navigation) lands when E2 wires the first list-shaped tool.
 */
export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly totalCount?: number;
  readonly nextLink?: string;
  readonly previousLink?: string;
}
