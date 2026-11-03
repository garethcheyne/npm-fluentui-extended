import * as React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { setWebApiFetch } from '../../api/webApi';
import { clearMetadataCache } from '../../api/metadata';
import { clearSystemUserCache } from '../../api/systemUser';
import type { SystemUserRecord } from '../../api/systemUser';
import { SystemUserCard, SystemUserPersona } from './index';

/**
 * SystemUserPersona and SystemUserCard's first tests.
 *
 * The persona's promise is that a column of them is cheap: a supplied user renders
 * without a request, and a bare `userId` is only fetched once the pointer has rested
 * on it long enough to open the card. The card's promise is that it reads like the
 * Dynamics flyout - actionable contact rows, and no blank ones. Both are pinned here
 * with the Web API served from memory.
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

const USER_ID = '11111111-1111-1111-1111-111111111111';

const USER: SystemUserRecord = {
  systemuserid: USER_ID,
  fullname: 'Gareth Cheyne',
  jobtitle: 'Solution Architect',
  internalemailaddress: 'gareth@contoso.com',
  mobilephone: '+44 7700 900123',
  address1_telephone1: '+44 20 7946 0000',
  address1_composite: '1 Main Street, London',
  title: null,
  isdisabled: false,
  businessUnit: 'Contoso UK',
};

/** The same user as the Web API returns it, business unit as an annotation. */
const RAW_USER = {
  systemuserid: USER_ID,
  fullname: 'Gareth Cheyne',
  jobtitle: 'Solution Architect',
  internalemailaddress: 'gareth@contoso.com',
  mobilephone: null,
  address1_telephone1: null,
  address1_composite: null,
  isdisabled: false,
  '_businessunitid_value@OData.Community.Display.V1.FormattedValue': 'Contoso UK',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let requests: string[] = [];
let failUser = false;

beforeEach(() => {
  clearMetadataCache();
  clearSystemUserCache();
  requests = [];
  failUser = false;
  setWebApiFetch(async (input) => {
    const url = decodeURIComponent(input);
    requests.push(url);
    if (url.includes(`systemusers(${USER_ID})?`)) {
      return failUser ? json({ error: { message: 'User not found' } }, 404) : json(RAW_USER);
    }
    return json({ error: { message: `Unexpected request ${url}` } }, 404);
  });
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  setWebApiFetch((input, init) => fetch(input, init));
});

const userRequests = () => requests.filter((url) => url.includes(`systemusers(${USER_ID})?`));

function renderPersona(props: Partial<React.ComponentProps<typeof SystemUserPersona>> = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <SystemUserPersona {...props} />
    </FluentProvider>,
  );
}

/** Rest the pointer on an element for `ms`, with the hover timer driven by hand. */
const hoverFor = (element: HTMLElement, ms: number) => {
  fireEvent.mouseEnter(element);
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe('a persona for a supplied user', () => {
  it('shows the name, the initials and the job title', () => {
    renderPersona({ user: USER, imageUrl: null, showHoverCard: false });

    expect(screen.getByText('Gareth Cheyne')).toBeInTheDocument();
    expect(screen.getByText('GC')).toBeInTheDocument();
    expect(screen.getByText('Solution Architect')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('takes the name and secondary line from props over the record', () => {
    renderPersona({ user: USER, name: 'G. Cheyne', secondaryText: 'On leave', imageUrl: null, showHoverCard: false });

    expect(screen.getByText('G. Cheyne')).toBeInTheDocument();
    expect(screen.getByText('On leave')).toBeInTheDocument();
    expect(screen.queryByText('Solution Architect')).not.toBeInTheDocument();
  });

  it('leaves the job title out when showSecondaryText is off', () => {
    renderPersona({ user: USER, showSecondaryText: false, showHoverCard: false });

    expect(screen.getByText('Gareth Cheyne')).toBeInTheDocument();
    expect(screen.queryByText('Solution Architect')).not.toBeInTheDocument();
  });

  it('adds the business unit as a third line at large size only', () => {
    const { unmount } = renderPersona({ user: USER, size: 'medium', showHoverCard: false });
    expect(screen.queryByText('Contoso UK')).not.toBeInTheDocument();
    unmount();

    renderPersona({ user: USER, size: 'large', showHoverCard: false });
    expect(screen.getByText('Contoso UK')).toBeInTheDocument();
  });

  it('reports the user when the name is clicked', () => {
    const onClick = vi.fn();
    renderPersona({ user: USER, onClick, showHoverCard: false });

    fireEvent.click(screen.getByText('Gareth Cheyne'));

    expect(onClick).toHaveBeenCalledWith(USER);
  });

  it('opens the contact card on hover without fetching anything', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderPersona({ user: USER, hoverCardDelayMs: 500 });

    hoverFor(screen.getByText('Gareth Cheyne'), 500);

    expect(screen.getByRole('link', { name: 'gareth@contoso.com' })).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
});

describe('a persona given only a userId', () => {
  it('requests the user straight away, so the name shows without a hover', async () => {
    renderPersona({ userId: USER_ID });

    expect(await screen.findByText('Gareth Cheyne')).toBeInTheDocument();
    expect(userRequests()).toHaveLength(1);
  });

  it('requests each person once, however many personas name them', async () => {
    // A column of personas names the same people over and over; braces and case are
    // the forms the same id turns up in
    render(
      <FluentProvider theme={webLightTheme}>
        <SystemUserPersona userId={USER_ID} />
        <SystemUserPersona userId={USER_ID} />
        <SystemUserPersona userId={`{${USER_ID.toUpperCase()}}`} />
      </FluentProvider>,
    );

    expect(await screen.findAllByText('Gareth Cheyne')).toHaveLength(3);
    expect(userRequests()).toHaveLength(1);
  });

  it('with a name to show, waits for the card before requesting the rest', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderPersona({ userId: USER_ID, name: 'Gareth Cheyne', hoverCardDelayMs: 500 });

    expect(userRequests()).toHaveLength(0);

    hoverFor(screen.getByText('Gareth Cheyne'), 499);
    expect(userRequests()).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    vi.useRealTimers();

    expect(await screen.findByRole('link', { name: 'gareth@contoso.com' })).toBeInTheDocument();
    expect(userRequests()).toHaveLength(1);
  });

  it('asks for the business unit name rather than its id', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderPersona({ userId: USER_ID, hoverCardDelayMs: 0 });

    hoverFor(screen.getByText('Unnamed user'), 0);
    vi.useRealTimers();

    expect(await screen.findAllByText('Contoso UK')).not.toHaveLength(0);
    expect(userRequests()[0]).toContain('_businessunitid_value');
  });

  it('shows a failure in the card, reports it, and retries on the next open', async () => {
    failUser = true;
    const onLoadError = vi.fn();
    renderPersona({ userId: USER_ID, onLoadError });
    const trigger = screen.getByText('Unnamed user');

    // A click opens the card straight away, no hover timer involved
    fireEvent.click(trigger);
    expect(await screen.findByText('User not found')).toBeInTheDocument();
    expect(onLoadError).toHaveBeenCalledTimes(1);

    failUser = false;
    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(await screen.findByRole('link', { name: 'gareth@contoso.com' })).toBeInTheDocument();
    expect(userRequests()).toHaveLength(2);
  });

  // Regression: loading was only ever triggered by the card opening, so with the card
  // off a persona given only a userId read "Unnamed user" for good.
  it('still loads the user when there is no card to defer the load to', async () => {
    renderPersona({ userId: USER_ID, showHoverCard: false });

    expect(await screen.findByText('Gareth Cheyne')).toBeInTheDocument();
  });
});

describe('a persona with nothing to show', () => {
  // The userId prop's documented contract: "with neither, nothing renders".
  it('renders nothing with neither a userId nor a user', () => {
    const { container } = renderPersona({ showHoverCard: false });

    expect(screen.queryByText('Unnamed user')).not.toBeInTheDocument();
    expect(container.querySelector('.fui-Avatar')).toBeNull();
  });
});

describe('SystemUserCard', () => {
  function renderCard(props: Partial<React.ComponentProps<typeof SystemUserCard>> = {}) {
    return render(
      <FluentProvider theme={webLightTheme}>
        <SystemUserCard user={USER} loading={false} error={null} {...props} />
      </FluentProvider>,
    );
  }

  it('lists each contact detail, email and phones as links', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'gareth@contoso.com' })).toHaveAttribute('href', 'mailto:gareth@contoso.com');
    expect(screen.getByRole('link', { name: '+44 20 7946 0000' })).toHaveAttribute('href', 'tel:+44 20 7946 0000');
    expect(screen.getByRole('link', { name: '+44 7700 900123' })).toHaveAttribute('href', 'tel:+44 7700 900123');
    expect(screen.getByText('1 Main Street, London')).toBeInTheDocument();
    expect(screen.getByText('Solution Architect')).toBeInTheDocument();
  });

  it('drops the rows a user has no value for, and the section when none are left', () => {
    renderCard({ user: { systemuserid: USER_ID, fullname: 'Gareth Cheyne' } });

    expect(screen.getByText('Gareth Cheyne')).toBeInTheDocument();
    expect(screen.queryByText('Contact')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('offers email and a Teams chat by default, replaced by actions when given', () => {
    const { unmount } = renderCard();
    expect(screen.getByRole('link', { name: /Send email/ })).toHaveAttribute('href', 'mailto:gareth@contoso.com');
    expect(screen.getByRole('link', { name: /Teams message/ })).toHaveAttribute(
      'href',
      'https://teams.microsoft.com/l/chat/0/0?users=gareth%40contoso.com',
    );
    unmount();

    renderCard({ actions: <button type="button">Open record</button> });
    expect(screen.getByRole('button', { name: 'Open record' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Send email/ })).not.toBeInTheDocument();
  });

  it('appends additional contact rows after the record’s own', () => {
    renderCard({
      additionalContact: [{ key: 'teams', value: 'Teams: @gareth', href: 'https://teams.example/gareth' }],
    });

    expect(screen.getByRole('link', { name: 'Teams: @gareth' })).toHaveAttribute('href', 'https://teams.example/gareth');
  });

  it('marks a disabled account', () => {
    renderCard({ user: { ...USER, isdisabled: true } });

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('shows loading and error states in place of the user', () => {
    const { unmount } = renderCard({ loading: true });
    expect(screen.getByText('Loading user...')).toBeInTheDocument();
    expect(screen.queryByText('Gareth Cheyne')).not.toBeInTheDocument();
    unmount();

    renderCard({ error: 'User not found' });
    expect(screen.getByText('User not found')).toBeInTheDocument();
    expect(screen.queryByText('Gareth Cheyne')).not.toBeInTheDocument();
  });
});
