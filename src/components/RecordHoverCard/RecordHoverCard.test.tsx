import * as React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { setWebApiFetch } from '../../api/webApi';
import { clearMetadataCache } from '../../api/metadata';
import { RecordHoverCard } from './RecordHoverCard';

/**
 * RecordHoverCard's first tests.
 *
 * The card exists for its loading behaviour, so that is what is pinned: no request
 * until the pointer has settled (or the caller opens it), the columns asked for are
 * the columns requested, Dynamics' formatted values are asked for and shown in place
 * of GUIDs and option numbers, a loaded record is held across re-opens, and a failure
 * is not held - the next open tries again. Nothing about where the surface sits:
 * jsdom has no layout to check it against.
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

const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';
const FORMATTED = '@OData.Community.Display.V1.FormattedValue';

/** An account as the Web API returns it with formatted-value annotations on. */
const ACCOUNT = {
  accountid: ACCOUNT_ID,
  name: 'Contoso Ltd',
  accountnumber: 'ACC-001',
  _primarycontactid_value: '99999999-9999-9999-9999-999999999999',
  [`_primarycontactid_value${FORMATTED}`]: 'Maria Campbell',
  industrycode: 7,
  [`industrycode${FORMATTED}`]: 'Consulting',
  telephone1: null,
};

const ATTRIBUTES = [
  { LogicalName: 'accountnumber', DisplayName: { UserLocalizedLabel: { Label: 'Account Number' } } },
  { LogicalName: 'primarycontactid', DisplayName: { UserLocalizedLabel: { Label: 'Primary Contact' } } },
  { LogicalName: 'industrycode', DisplayName: { UserLocalizedLabel: { Label: 'Industry' } } },
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

interface Sent {
  url: string;
  headers: Record<string, string>;
}

let sent: Sent[] = [];
let failRecord = false;

const serve = (url: string): Response => {
  if (url.includes('/Attributes/Microsoft.Dynamics.CRM.')) return json({ value: [] });
  if (url.includes('/Attributes?')) return json({ value: ATTRIBUTES });
  if (url.includes('EntityDefinitions')) {
    return json({ LogicalName: 'account', EntitySetName: 'accounts', PrimaryIdAttribute: 'accountid', PrimaryNameAttribute: 'name' });
  }
  if (url.includes(`accounts(${ACCOUNT_ID})`)) {
    if (failRecord) return json({ error: { message: 'Principal user is missing prvReadAccount privilege' } }, 403);
    return json(ACCOUNT);
  }
  return json({ error: { message: `Unexpected request ${url}` } }, 404);
};

beforeEach(() => {
  clearMetadataCache();
  sent = [];
  failRecord = false;
  setWebApiFetch(async (input, init) => {
    const url = decodeURIComponent(input);
    sent.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    return serve(url);
  });
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  setWebApiFetch((input, init) => fetch(input, init));
});

const recordRequests = () => sent.filter((request) => request.url.includes(`accounts(${ACCOUNT_ID})`));

const COLUMNS = ['accountnumber', '_primarycontactid_value', 'industrycode', 'telephone1'];

function renderCard(props: Partial<React.ComponentProps<typeof RecordHoverCard>> = {}) {
  const view = (next: Partial<React.ComponentProps<typeof RecordHoverCard>> = {}) => (
    <FluentProvider theme={webLightTheme}>
      <RecordHoverCard entityName="account" recordId={ACCOUNT_ID} {...props} {...next}>
        <a href="#account">Contoso</a>
      </RecordHoverCard>
    </FluentProvider>
  );
  const result = render(view());
  return { ...result, rerenderWith: (next: Partial<React.ComponentProps<typeof RecordHoverCard>>) => result.rerender(view(next)) };
}

const anchor = () => screen.getByText('Contoso');

describe('when the record is fetched', () => {
  it('fetches nothing until the pointer has rested on the anchor', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderCard({ hoverDelayMs: 400 });

    expect(sent).toHaveLength(0);

    fireEvent.mouseEnter(anchor());
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(sent).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    vi.useRealTimers();

    expect(await screen.findByText('Contoso Ltd')).toBeInTheDocument();
    expect(recordRequests()).toHaveLength(1);
  });

  it('fetches nothing for a pointer that passes over on its way somewhere else', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderCard({ hoverDelayMs: 400 });

    fireEvent.mouseEnter(anchor());
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.mouseLeave(anchor());
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(sent).toHaveLength(0);
    expect(screen.queryByText('Loading record...')).not.toBeInTheDocument();
  });

  it('loads when the caller opens it, with no hover involved', async () => {
    renderCard({ open: true });

    expect(await screen.findByText('Contoso Ltd')).toBeInTheDocument();
    expect(recordRequests()).toHaveLength(1);
  });

  it('holds a loaded record, so opening the card again costs nothing', async () => {
    const { rerenderWith } = renderCard({ open: true });
    await screen.findByText('Contoso Ltd');

    rerenderWith({ open: false });
    rerenderWith({ open: true });

    expect(await screen.findByText('Contoso Ltd')).toBeInTheDocument();
    expect(recordRequests()).toHaveLength(1);
  });

  it('never fetches while disabled, rendering just the anchor', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderCard({ disabled: true });

    fireEvent.mouseEnter(anchor());
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(sent).toHaveLength(0);
    expect(anchor()).not.toHaveAttribute('aria-expanded');
  });
});

describe('what the card shows', () => {
  it('requests the primary name plus the columns asked for', async () => {
    renderCard({ open: true, columns: COLUMNS });
    await screen.findByText('Contoso Ltd');

    expect(recordRequests()[0].url).toContain(
      `accounts(${ACCOUNT_ID})?$select=name,accountnumber,_primarycontactid_value,industrycode,telephone1`,
    );
  });

  it('asks for formatted values, and shows them for a lookup and a choice', async () => {
    // Without the Prefer header the contact shows as its GUID and the industry as 7
    renderCard({ open: true, columns: COLUMNS });
    await screen.findByText('Contoso Ltd');

    expect(recordRequests()[0].headers.Prefer).toBe('odata.include-annotations="OData.Community.Display.V1.FormattedValue"');
    expect(screen.getByText('Maria Campbell')).toBeInTheDocument();
    expect(screen.getByText('Consulting')).toBeInTheDocument();
    expect(screen.queryByText(ACCOUNT._primarycontactid_value)).not.toBeInTheDocument();
    expect(screen.queryByText('7')).not.toBeInTheDocument();
  });

  it('labels each column the way the form does, and marks an empty one', async () => {
    renderCard({ open: true, columns: COLUMNS });
    await screen.findByText('Contoso Ltd');

    expect(screen.getByText('Account Number')).toBeInTheDocument();
    expect(screen.getByText('ACC-001')).toBeInTheDocument();
    // The lookup's label is found under its attribute name, not `_..._value`
    expect(screen.getByText('Primary Contact')).toBeInTheDocument();
    expect(screen.getByText('Industry')).toBeInTheDocument();
    // No metadata label for telephone1: humanized, and its null shown as a dash
    expect(screen.getByText('Telephone1')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders a supplied record without making any request', async () => {
    renderCard({
      open: true,
      record: {
        title: 'Fabrikam Inc',
        subtitle: 'ACC-002',
        details: [{ label: 'City', value: 'Seattle' }],
      },
      actions: <button type="button">Open record</button>,
    });

    expect(screen.getByText('Fabrikam Inc')).toBeInTheDocument();
    expect(screen.getByText('ACC-002')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('Seattle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open record' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(sent).toHaveLength(0);
  });

  it('hands the raw record to mapRecord and renders what comes back', async () => {
    const mapRecord = vi.fn((raw: Record<string, unknown>) => ({
      title: `${raw.name} (${raw.accountnumber})`,
      details: [{ label: 'Industry', value: String(raw[`industrycode${FORMATTED}`]) }],
    }));
    renderCard({ open: true, columns: ['accountnumber', 'industrycode'], mapRecord });

    expect(await screen.findByText('Contoso Ltd (ACC-001)')).toBeInTheDocument();
    expect(screen.getByText('Consulting')).toBeInTheDocument();
    expect(mapRecord).toHaveBeenCalledWith(expect.objectContaining({ accountid: ACCOUNT_ID }));
    // The mapping owns the labels, so attribute metadata is not fetched
    expect(sent.some((request) => request.url.includes('/Attributes'))).toBe(false);
  });
});

describe('a record that fails to load', () => {
  it('shows the error and reports it', async () => {
    failRecord = true;
    const onLoadError = vi.fn();
    renderCard({ open: true, onLoadError });

    expect(await screen.findByText('Principal user is missing prvReadAccount privilege')).toBeInTheDocument();
    expect(onLoadError).toHaveBeenCalledTimes(1);
    expect(onLoadError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('is not held: opening the card again retries', async () => {
    failRecord = true;
    const { rerenderWith } = renderCard({ open: true });
    await screen.findByText('Principal user is missing prvReadAccount privilege');

    failRecord = false;
    rerenderWith({ open: false });
    rerenderWith({ open: true });

    expect(await screen.findByText('Contoso Ltd')).toBeInTheDocument();
    expect(recordRequests()).toHaveLength(2);
  });

  // Regression: a load keyed on the identity of `columns` / `onLoadError` re-ran on every
  // render while the card was open, so a host that re-rendered on error - here by storing
  // it, with an inline columns array - got a request per render, without end.
  it('does not retry on its own while it stays open', async () => {
    // A host that stores the error re-renders, handing the card a fresh columns array
    failRecord = true;
    function Host() {
      const [, setFailure] = React.useState<Error | null>(null);
      return (
        <FluentProvider theme={webLightTheme}>
          <RecordHoverCard
            entityName="account"
            recordId={ACCOUNT_ID}
            columns={['accountnumber']}
            onLoadError={setFailure}
            open
          >
            <a href="#account">Contoso</a>
          </RecordHoverCard>
        </FluentProvider>
      );
    }
    render(<Host />);

    await screen.findByText('Principal user is missing prvReadAccount privilege');
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(recordRequests()).toHaveLength(1);
  });
});
