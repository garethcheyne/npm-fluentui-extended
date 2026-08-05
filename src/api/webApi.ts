/**
 * Minimal Dynamics 365 Web API client.
 *
 * Deliberately built on native `fetch` rather than `Xrm.WebApi` so components work
 * inside a model-driven form, in a standalone SPA, and in the test harness without
 * a different code path for each. Callers that do have Xrm available can supply
 * their own transport via `setWebApiFetch`.
 */

/** Web API version segment. Dynamics has kept this stable since v9. */
const API_VERSION = 'v9.2';

export interface WebApiRequestOptions {
  /** Abort signal, so a component unmounting cancels its in-flight requests */
  signal?: AbortSignal;
  /** Extra OData headers, e.g. Prefer: odata.include-annotations */
  headers?: Record<string, string>;
}

export interface WebApiCollection<T> {
  value: T[];
  /** Present when more pages exist - follow it verbatim rather than rebuilding the query */
  '@odata.nextLink'?: string;
  /** Present when the request asked for $count */
  '@odata.count'?: number;
}

export class WebApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the request never completed */
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'WebApiError';
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

let webApiFetch: FetchLike = (input, init) => fetch(input, init);

/**
 * Replace the transport used by every component in this library. Useful when the
 * host app already has an authenticated client, or for tests.
 */
export const setWebApiFetch = (impl: FetchLike): void => {
  webApiFetch = impl;
};

/** Base path for Web API requests. Relative by default, which works inside Dynamics. */
let apiBaseUrl = `/api/data/${API_VERSION}`;

/** Point the client at an absolute environment URL for standalone/SPA usage. */
export const setWebApiBaseUrl = (baseUrl: string): void => {
  apiBaseUrl = baseUrl.replace(/\/+$/, '');
};

export const getWebApiBaseUrl = (): string => apiBaseUrl;

const DEFAULT_HEADERS: Record<string, string> = {
  'OData-MaxVersion': '4.0',
  'OData-Version': '4.0',
  Accept: 'application/json',
};

/**
 * GET a Web API resource.
 *
 * `path` may be a path relative to the API root ("accounts?$top=10") or an
 * absolute URL - `@odata.nextLink` values come back absolute and must be followed
 * as-is, so both forms are accepted.
 */
export const webApiGet = async <T>(path: string, options: WebApiRequestOptions = {}): Promise<T> => {
  const url = /^https?:\/\//i.test(path) ? path : `${apiBaseUrl}/${path.replace(/^\/+/, '')}`;

  let response: Response;
  try {
    response = await webApiFetch(url, {
      method: 'GET',
      headers: { ...DEFAULT_HEADERS, ...options.headers },
      signal: options.signal,
    });
  } catch (err) {
    // An aborted request is a normal unmount, not a failure worth wrapping
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new WebApiError(err instanceof Error ? err.message : 'Network request failed', 0, url);
  }

  if (!response.ok) {
    // Dynamics returns { error: { message } } - surface that rather than a bare status
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.error?.message) detail = body.error.message;
    } catch {
      // Non-JSON error body; the status line is all we have
    }
    throw new WebApiError(detail, response.status, url);
  }

  return (await response.json()) as T;
};

/** Escape a value for use inside an OData string literal. */
export const escapeODataString = (value: string): string => value.replace(/'/g, "''");
