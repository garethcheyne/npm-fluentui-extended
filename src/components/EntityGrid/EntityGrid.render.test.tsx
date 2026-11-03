import * as React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { setWebApiFetch } from '../../api/webApi';
import { clearMetadataCache } from '../../api/metadata';
import { EntityGrid } from './EntityGrid';
import type { EntityGridProps } from './EntityGrid.types';

/**
 * EntityGrid's first render tests.
 *
 * The grid fetches its own rows, so what is worth pinning is the conversation it
 * has with the Web API - the columns and annotations it asks for, the paging
 * link it follows verbatim rather than rebuilding, and what it does when a page
 * fails - and that what comes back is drawn the way Dynamics draws it: headers
 * from metadata display names, lookups by name rather than GUID. The Web API is
 * served from memory through `setWebApiFetch`.
 *
 * jsdom reports every element as zero-sized, which would leave the virtualised
 * modes rendering no rows at all, so the scroll container is given a size.
 */

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 1000 });
  HTMLElement.prototype.getBoundingClientRect = function getRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 600, width: 1000, height: 600, toJSON: () => '' };
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

const FORMATTED = '@OData.Community.Display.V1.FormattedValue';
const CONTACT = 'c0000000-0000-0000-0000-000000000001';
const NEXT_LINK = 'https://contoso.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=%3Ccookie%20page%3D%222%22%2F%3E';

const label = (text: string) => ({ UserLocalizedLabel: { Label: text } });

const ATTRIBUTES = [
  { LogicalName: 'name', DisplayName: label('Account Name') },
  { LogicalName: 'telephone1', DisplayName: label('Main Phone') },
  { LogicalName: 'primarycontactid', DisplayName: label('Primary Contact'), AttributeType: 'Lookup' },
];

const account = (n: number, extra: Record<string, unknown> = {}) => ({
  accountid: `a0000000-0000-0000-0000-00000000000${n}`,
  name: `Account ${n}`,
  telephone1: `555-000${n}`,
  ...extra,
});

const PAGE_ONE = [account(1, { _primarycontactid_value: CONTACT, [`_primarycontactid_value${FORMATTED}`]: 'Jane Smith' }), account(2)];
const PAGE_TWO = [account(3), account(4)];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

interface Sent {
  url: string;
  headers: Record<string, string>;
}

let requests: Sent[] = [];
let recordsResponse: () => Response;

const serve = (url: string): Response => {
  const path = decodeURIComponent(url);
  if (path.includes("EntityDefinitions(LogicalName='account')/Attributes/")) return json({ value: [] });
  if (path.includes("EntityDefinitions(LogicalName='account')/Attributes")) return json({ value: ATTRIBUTES });
  if (path.includes("EntityDefinitions(LogicalName='account')")) {
    return json({ LogicalName: 'account', EntitySetName: 'accounts', PrimaryIdAttribute: 'accountid', PrimaryNameAttribute: 'name' });
  }
  if (url === NEXT_LINK) return json({ value: PAGE_TWO, '@odata.count': 4 });
  if (path.includes('accounts?')) return recordsResponse();
  return json({ error: { message: `Unexpected request ${path}` } }, 404);
};

beforeEach(() => {
  clearMetadataCache();
  requests = [];
  recordsResponse = () => json({ value: PAGE_ONE, '@odata.count': 4, '@odata.nextLink': NEXT_LINK });
  setWebApiFetch(async (input, init) => {
    requests.push({ url: input, headers: (init?.headers ?? {}) as Record<string, string> });
    return serve(input);
  });
});

afterAll(() => {
  setWebApiFetch((input, init) => fetch(input, init));
});

const recordRequests = () => requests.filter((request) => !request.url.includes('EntityDefinitions'));
const lastRecordUrl = () => {
  const sent = recordRequests();
  return decodeURIComponent(sent[sent.length - 1].url);
};

function renderGrid(props: Partial<EntityGridProps> = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <EntityGrid
        entityName="account"
        columns={[{ name: 'name' }, { name: 'telephone1' }]}
        pageSize={2}
        {...props}
      />
    </FluentProvider>,
  );
}

describe('EntityGrid', () => {
  it('loads the entity’s rows and heads each column with its metadata display name', async () => {
    renderGrid({ columns: [{ name: 'name' }, { name: 'telephone1', label: 'Phone' }] });

    expect(await screen.findByText('Account 1')).toBeInTheDocument();
    expect(screen.getByText('555-0002')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Account Name/ })).toBeInTheDocument();
    // An explicit label wins over the metadata one
    expect(screen.getByRole('columnheader', { name: /Phone/ })).toBeInTheDocument();
    expect(screen.queryByText('Main Phone')).not.toBeInTheDocument();
  });

  it('asks for its columns, the primary id, a page size and the formatted-value annotations', async () => {
    renderGrid();
    await screen.findByText('Account 1');

    const [first] = recordRequests();
    const url = decodeURIComponent(first.url);
    expect(url).toContain('/api/data/v9.2/accounts?');
    expect(url).toContain('$select=accountid,name,telephone1');
    expect(url).toContain('$orderby=name asc');
    expect(url).toContain('$count=true');
    expect(first.headers.Prefer).toContain('odata.maxpagesize=2');
    expect(first.headers.Prefer).toContain('OData.Community.Display.V1.FormattedValue');
  });

  it('shows a lookup column by the name Dynamics formatted, not its GUID', async () => {
    renderGrid({ columns: [{ name: 'name' }, { name: '_primarycontactid_value', label: 'Primary Contact' }] });

    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText(CONTACT)).not.toBeInTheDocument();
  });

  // Regression: a lookup named by its logical name - the form the README uses - went into
  // $select as-is, which Dataverse rejects, and its cell read a property that never arrives.
  it('requests a lookup named by its logical name as _name_value and shows its formatted name', async () => {
    renderGrid({ columns: [{ name: 'name' }, { name: 'primarycontactid' }] });

    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Primary Contact/ })).toBeInTheDocument();
    expect(decodeURIComponent(recordRequests()[0].url)).toContain('_primarycontactid_value');
    expect(decodeURIComponent(recordRequests()[0].url)).not.toMatch(/[,=]primarycontactid(,|&|$)/);
  });

  it('follows @odata.nextLink verbatim for the next page, and replays the first for Previous', async () => {
    renderGrid();
    await screen.findByText('Account 1');
    expect(screen.getByText('Page 1 of 2 (4 records)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Account 3')).toBeInTheDocument();
    expect(screen.queryByText('Account 1')).not.toBeInTheDocument();
    expect(recordRequests()[1].url).toBe(NEXT_LINK);
    expect(screen.getByText(/^Page 2/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Account 1')).toBeInTheDocument();
    expect(decodeURIComponent(recordRequests()[2].url)).toContain('accounts?$select=');
  });

  it('appends the next page under the rows it has when Load More is pressed', async () => {
    renderGrid({ loadMode: 'manual', height: 400 });
    await screen.findByText('Account 1');
    expect(screen.getByText(/2 records loaded/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load More' }));

    expect(await screen.findByText('Account 4')).toBeInTheDocument();
    expect(screen.getByText('Account 1')).toBeInTheDocument();
    expect(recordRequests()[1].url).toBe(NEXT_LINK);
    // The second page carried no nextLink, so there is nothing more to offer
    expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument();
  });

  it('calls onLoadError and shows the server’s message when a page fails', async () => {
    recordsResponse = () => json({ error: { message: 'Principal user is missing prvReadAccount privilege' } }, 403);
    const onLoadError = vi.fn();
    renderGrid({ onLoadError });

    expect(await screen.findByText('Principal user is missing prvReadAccount privilege')).toBeInTheDocument();
    expect(onLoadError).toHaveBeenCalledTimes(1);
    expect(onLoadError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onLoadError.mock.calls[0][0].message).toBe('Principal user is missing prvReadAccount privilege');
  });

  it('says so when the page comes back empty', async () => {
    recordsResponse = () => json({ value: [] });
    renderGrid({ emptyMessage: 'No accounts yet' });

    expect(await screen.findByText('No accounts yet')).toBeInTheDocument();
  });

  it('re-queries sorted by a column when its header is clicked, then reverses it', async () => {
    renderGrid();
    await screen.findByText('Account 1');

    fireEvent.click(screen.getByText('Main Phone'));
    await waitFor(() => expect(lastRecordUrl()).toContain('$orderby=telephone1 asc'));
    await waitFor(() => expect(screen.getByRole('columnheader', { name: /Main Phone/ })).toHaveAttribute('aria-sort', 'ascending'));

    fireEvent.click(screen.getByText('Main Phone'));
    await waitFor(() => expect(lastRecordUrl()).toContain('$orderby=telephone1 desc'));
  });

  it('opens a record with its id when its row is clicked', async () => {
    const onRecordOpen = vi.fn();
    renderGrid({ onRecordOpen });

    fireEvent.click(await screen.findByText('Account 2'));

    expect(onRecordOpen).toHaveBeenCalledWith(PAGE_ONE[1].accountid, expect.objectContaining({ name: 'Account 2' }));
  });
});
