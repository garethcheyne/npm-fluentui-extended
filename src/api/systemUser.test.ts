import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { setWebApiFetch } from './webApi';
import { clearSystemUserCache, getSystemUser } from './systemUser';

/**
 * Users are fetched once per id for the life of the page: a column of personas
 * names the same few people over and over, and each row asking again is a
 * request per row for data that does not change.
 */

const USER_ID = '11111111-1111-1111-1111-111111111111';
let requests = 0;
let failNext = false;

beforeEach(() => {
  clearSystemUserCache();
  requests = 0;
  failNext = false;
  setWebApiFetch(async () => {
    requests++;
    if (failNext) {
      failNext = false;
      return new Response(JSON.stringify({ error: { message: 'Service unavailable' } }), { status: 503 });
    }
    return new Response(JSON.stringify({ systemuserid: USER_ID, fullname: 'Gareth Cheyne' }), { status: 200 });
  });
});

afterAll(() => {
  setWebApiFetch((input, init) => fetch(input, init));
});

describe('getSystemUser', () => {
  it('requests a user once, however often it is asked for', async () => {
    await getSystemUser(USER_ID);
    await getSystemUser(USER_ID);

    expect(requests).toBe(1);
  });

  it('shares one request between callers asking at the same moment', async () => {
    const [a, b] = await Promise.all([getSystemUser(USER_ID), getSystemUser(USER_ID)]);

    expect(requests).toBe(1);
    expect(a.fullname).toBe('Gareth Cheyne');
    expect(b).toBe(a);
  });

  it('treats the braced and upper-case forms of an id as the same user', async () => {
    await getSystemUser(USER_ID);
    await getSystemUser(`{${USER_ID.toUpperCase()}}`);

    expect(requests).toBe(1);
  });

  it('does not cache a failure, so the next call retries', async () => {
    failNext = true;
    await expect(getSystemUser(USER_ID)).rejects.toThrow('Service unavailable');

    const user = await getSystemUser(USER_ID);

    expect(user.fullname).toBe('Gareth Cheyne');
    expect(requests).toBe(2);
  });

  it('does not share a cancellable request', async () => {
    // One caller aborting must not cancel the request for everyone else
    await getSystemUser(USER_ID);
    await getSystemUser(USER_ID, { signal: new AbortController().signal });

    expect(requests).toBe(2);
  });
});
