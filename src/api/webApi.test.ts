import { describe, it, expect, afterEach } from 'vitest';
import { setWebApiBaseUrl, setWebApiFetch, webApiGet, webApiRequest, WebApiError } from './webApi';

/**
 * The shared client every component calls Dataverse through.
 *
 * What is pinned is that the base URL and the transport are honoured for every
 * kind of call: a component that bypassed them used to work inside Dynamics and
 * nowhere else - not standalone, not behind a dev proxy on another path.
 */

const seen: { url: string; init?: RequestInit }[] = [];

const capture = (body: unknown = { value: [] }, status = 200) =>
  setWebApiFetch(async (url, init) => {
    seen.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  });

afterEach(() => {
  seen.length = 0;
  setWebApiBaseUrl('/api/data/v9.2');
  setWebApiFetch((input, init) => fetch(input, init));
});

describe('webApiRequest', () => {
  it('resolves a relative path against the configured base', async () => {
    capture();
    setWebApiBaseUrl('https://contoso.crm.dynamics.com/api/data/v9.2/');

    await webApiRequest("EntityDefinitions(LogicalName='account')");

    expect(seen[0].url).toBe("https://contoso.crm.dynamics.com/api/data/v9.2/EntityDefinitions(LogicalName='account')");
  });

  it('follows an absolute URL as given', async () => {
    capture();

    await webApiRequest('https://contoso.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=abc');

    expect(seen[0].url).toBe('https://contoso.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=abc');
  });

  it('hands back the raw response, failures included, for the caller to judge', async () => {
    capture({ error: { message: 'nope' } }, 404);

    const response = await webApiRequest('accounts');

    expect(response.status).toBe(404);
  });

  it('passes the request options through to the transport', async () => {
    capture();

    await webApiRequest('accounts', { headers: { Prefer: 'odata.maxpagesize=5' } });

    expect(seen[0].init?.headers).toEqual({ Prefer: 'odata.maxpagesize=5' });
  });
});

describe('webApiGet', () => {
  it('uses the same base and transport', async () => {
    capture({ value: [1] });
    setWebApiBaseUrl('/proxy/api');

    const result = await webApiGet<{ value: number[] }>('accounts');

    expect(seen[0].url).toBe('/proxy/api/accounts');
    expect(result.value).toEqual([1]);
  });

  it('surfaces the message Dynamics sends with a failure', async () => {
    capture({ error: { message: 'Principal user is missing prvReadAccount privilege' } }, 403);

    await expect(webApiGet('accounts')).rejects.toMatchObject({
      name: 'WebApiError',
      status: 403,
      message: 'Principal user is missing prvReadAccount privilege',
    });
    await expect(webApiGet('accounts')).rejects.toBeInstanceOf(WebApiError);
  });
});
