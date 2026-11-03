import * as React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { setWebApiFetch } from '../../api/webApi';
import { clearMetadataCache } from '../../api/metadata';
import type { OwnerRecord } from '../../api/owner';
import { OwnerLookup } from './OwnerLookup';

/**
 * OwnerLookup's first tests.
 *
 * `ownerid` is polymorphic, so what is worth pinning is that both halves of it are
 * asked for, that what comes back stays marked as a user or a team all the way to
 * the caller's handler, and that narrowing `types` really does stop the other query
 * going out - an owner picker that quietly searched teams anyway would offer records
 * the field cannot take. The Web API is served from memory through `setWebApiFetch`.
 */

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 200 });
  HTMLElement.prototype.getBoundingClientRect = function getRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 300, bottom: 32, width: 300, height: 32, toJSON: () => '' };
  } as never;
  HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const ALICE = '11111111-1111-1111-1111-111111111111';
const SALES_TEAM = '22222222-2222-2222-2222-222222222222';

const USERS = [
  {
    systemuserid: ALICE,
    fullname: 'Alice Archer',
    jobtitle: 'Account Manager',
    internalemailaddress: 'alice@contoso.com',
    isdisabled: false,
  },
];

const TEAMS = [
  {
    teamid: SALES_TEAM,
    name: 'Sales Team',
    description: 'Inside sales',
    emailaddress: null,
    '_businessunitid_value@OData.Community.Display.V1.FormattedValue': 'Contoso',
  },
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let requests: string[] = [];
let failTeams = false;

const serve = (url: string): Response => {
  const path = decodeURIComponent(url);
  if (path.includes('/systemusers?')) return json({ value: USERS });
  if (path.includes('/teams?')) {
    if (failTeams) return json({ error: { message: 'No read access to teams' } }, 403);
    return json({ value: TEAMS });
  }
  return json({ error: { message: `Unexpected request ${path}` } }, 404);
};

beforeEach(() => {
  clearMetadataCache();
  requests = [];
  failTeams = false;
  setWebApiFetch(async (input) => {
    requests.push(decodeURIComponent(input));
    return serve(input);
  });
});

afterAll(() => {
  setWebApiFetch((input, init) => fetch(input, init));
});

const userRequests = () => requests.filter((url) => url.includes('/systemusers?'));
const teamRequests = () => requests.filter((url) => url.includes('/teams?'));

function renderOwnerLookup(props: Partial<React.ComponentProps<typeof OwnerLookup>> = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <OwnerLookup searchDebounceMs={0} {...props} />
    </FluentProvider>,
  );
}

/** Focus is what fires the first, empty search - the list a picker shows before typing. */
const focusInput = () => fireEvent.focus(screen.getByRole('textbox'));

describe('searching for an owner', () => {
  it('searches users and teams together and lists both', async () => {
    renderOwnerLookup({ types: ['systemuser', 'team'] });

    focusInput();

    expect(await screen.findByText('Alice Archer')).toBeInTheDocument();
    expect(await screen.findByText('Sales Team')).toBeInTheDocument();
    expect(userRequests()).toHaveLength(1);
    expect(teamRequests()).toHaveLength(1);
    // Users first, the way the Dynamics owner lookup groups them
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      expect.stringContaining('Alice Archer'),
      expect.stringContaining('Sales Team'),
    ]);
  });

  it('only offers owner teams, since access teams cannot own a record', async () => {
    renderOwnerLookup({ types: ['systemuser', 'team'] });

    focusInput();

    await waitFor(() => expect(teamRequests()).toHaveLength(1));
    expect(teamRequests()[0]).toContain('teamtype eq 0');
  });

  it('sends what was typed to both queries', async () => {
    renderOwnerLookup({ types: ['systemuser', 'team'] });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: "O'Brien" } });

    await waitFor(() => {
      expect(userRequests().some((url) => url.includes("contains(fullname,'O''Brien')"))).toBe(true);
      expect(teamRequests().some((url) => url.includes("contains(name,'O''Brien')"))).toBe(true);
    });
  });

  it('leaves disabled users out unless asked for them', async () => {
    const { unmount } = renderOwnerLookup();
    focusInput();
    await waitFor(() => expect(userRequests()).toHaveLength(1));
    expect(userRequests()[0]).toContain('isdisabled eq false');
    unmount();

    requests = [];
    renderOwnerLookup({ includeDisabled: true });
    focusInput();
    await waitFor(() => expect(userRequests()).toHaveLength(1));
    expect(userRequests()[0]).not.toContain('isdisabled eq false');
  });

  it('still lists users when the teams query fails', async () => {
    // A caller with no read access to teams should get a users-only picker, not an error
    failTeams = true;
    renderOwnerLookup({ types: ['systemuser', 'team'] });

    focusInput();

    expect(await screen.findByText('Alice Archer')).toBeInTheDocument();
    expect(screen.queryByText('Sales Team')).not.toBeInTheDocument();
  });
});

describe('restricting the owner types', () => {
  it('searches users only by default, with no Users/Teams switch', async () => {
    renderOwnerLookup();

    focusInput();

    expect(await screen.findByText('Alice Archer')).toBeInTheDocument();
    expect(teamRequests()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Teams' })).not.toBeInTheDocument();
  });

  it('searches teams only when that is all it is given', async () => {
    renderOwnerLookup({ types: ['team'] });

    focusInput();

    expect(await screen.findByText('Sales Team')).toBeInTheDocument();
    expect(userRequests()).toHaveLength(0);
    expect(screen.queryByText('Alice Archer')).not.toBeInTheDocument();
  });

  it('narrows the list from the Users/Teams switch when offering both', async () => {
    renderOwnerLookup({ types: ['systemuser', 'team'] });
    focusInput();
    await screen.findByText('Sales Team');

    fireEvent.click(screen.getByRole('button', { name: 'Teams' }));

    expect(screen.queryByText('Alice Archer')).not.toBeInTheDocument();
    expect(screen.getByText('Sales Team')).toBeInTheDocument();
    // A filter, not a new search
    expect(teamRequests()).toHaveLength(1);
  });
});

describe('picking an owner', () => {
  it('reports a team as a team owner', async () => {
    const onOwnerSelect = vi.fn();
    renderOwnerLookup({ types: ['systemuser', 'team'], onOwnerSelect });
    focusInput();

    fireEvent.click(await screen.findByText('Sales Team'));

    expect(onOwnerSelect).toHaveBeenCalledTimes(1);
    expect(onOwnerSelect.mock.calls[0][0]).toMatchObject<Partial<OwnerRecord>>({
      id: SALES_TEAM,
      name: 'Sales Team',
      type: 'team',
      businessUnit: 'Contoso',
    });
  });

  it('reports a user as a systemuser owner', async () => {
    const onOwnerSelect = vi.fn();
    renderOwnerLookup({ types: ['systemuser', 'team'], onOwnerSelect });
    focusInput();

    fireEvent.click(await screen.findByText('Alice Archer'));

    expect(onOwnerSelect.mock.calls[0][0]).toMatchObject<Partial<OwnerRecord>>({
      id: ALICE,
      name: 'Alice Archer',
      type: 'systemuser',
      email: 'alice@contoso.com',
    });
  });

  it('shows a selected owner without querying for it', () => {
    // There is no id-only form: the caller hands over the whole OwnerRecord
    renderOwnerLookup({
      selectedOwner: { id: SALES_TEAM, name: 'Sales Team', type: 'team' },
      showHoverCard: false,
    });

    expect(screen.getByText('Sales Team')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('lists a supplied roster without making a request', async () => {
    const owners: OwnerRecord[] = [
      { id: ALICE, name: 'Alice Archer', type: 'systemuser' },
      { id: SALES_TEAM, name: 'Sales Team', type: 'team' },
    ];
    renderOwnerLookup({ types: ['systemuser', 'team'], owners, open: true });

    focusInput();

    expect(screen.getByText('Alice Archer')).toBeInTheDocument();
    expect(screen.getByText('Sales Team')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(requests).toHaveLength(0);
  });
});
