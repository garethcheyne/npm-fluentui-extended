import * as React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { act, render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { setWebApiFetch } from '../api/webApi';
import { clearMetadataCache } from '../api/metadata';
import { clearHierarchyCache } from '../api/hierarchy';
import { Lookup } from '../components/Lookup/Lookup';
import { useHierarchyLookup } from './useHierarchyLookup';
import type { UseHierarchyLookupOptions } from './useHierarchyLookup';

/**
 * useHierarchyLookup's first tests.
 *
 * The hook is glue between the hierarchy API and a hierarchical Lookup, so what
 * is worth pinning is the shape of what it hands the Lookup - roots first, each
 * knowing whether it has children; a search that brings matches back with their
 * ancestors; children that slot under their parent - and the two ways it can go
 * wrong quietly: a slow, older search landing on top of a newer one, and a
 * failure that nobody hears about. The Web API is served from memory through
 * `setWebApiFetch`, from the same small account tree the API tests use.
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

const GROUP = '11111111-1111-1111-1111-111111111111';
const AGENCY = '22222222-2222-2222-2222-222222222222';
const STUDIO = '33333333-3333-3333-3333-333333333333';
const OTHER = '44444444-4444-4444-4444-444444444444';

const ACCOUNTS = [
  { accountid: GROUP, name: 'Horizon Media Group', _parentaccountid_value: null },
  { accountid: AGENCY, name: 'Horizon Agency', _parentaccountid_value: GROUP },
  { accountid: STUDIO, name: 'Pixel Studio', _parentaccountid_value: AGENCY },
  { accountid: OTHER, name: 'Northwind Traders', _parentaccountid_value: null },
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const serve = (url: string): Response => {
  const path = decodeURIComponent(url);
  if (path.includes('EntityDefinitions') && path.includes('OneToManyRelationships')) {
    return json({
      value: [{ SchemaName: 'account_parent_account', ReferencingAttribute: 'parentaccountid', ReferencingEntity: 'account' }],
    });
  }
  if (path.includes('EntityDefinitions')) {
    return json({ LogicalName: 'account', EntitySetName: 'accounts', PrimaryIdAttribute: 'accountid', PrimaryNameAttribute: 'name' });
  }
  if (path.includes('fetchXml=')) {
    const byParent = new Map<string, number>();
    for (const a of ACCOUNTS) {
      if (a._parentaccountid_value && path.includes(a._parentaccountid_value)) {
        byParent.set(a._parentaccountid_value, (byParent.get(a._parentaccountid_value) ?? 0) + 1);
      }
    }
    return json({ value: [...byParent].map(([parent, children]) => ({ parent, children })) });
  }
  if (path.includes('contains(name,')) {
    const text = /contains\(name,'([^']*)'\)/.exec(path)![1].toLowerCase();
    return json({ value: ACCOUNTS.filter((a) => a.name.toLowerCase().includes(text)) });
  }
  if (path.includes('_parentaccountid_value eq null')) {
    return json({ value: ACCOUNTS.filter((a) => !a._parentaccountid_value) });
  }
  const childOf = /_parentaccountid_value eq ([0-9a-f-]{36})/.exec(path);
  if (childOf) return json({ value: ACCOUNTS.filter((a) => a._parentaccountid_value === childOf[1]) });
  const ids = [...path.matchAll(/accountid eq ([0-9a-f-]{36})/g)].map((m) => m[1]);
  return json({ value: ACCOUNTS.filter((a) => ids.includes(a.accountid)) });
};

let requests: string[] = [];

beforeEach(() => {
  clearMetadataCache();
  clearHierarchyCache();
  requests = [];
  setWebApiFetch(async (input) => {
    requests.push(decodeURIComponent(input));
    return serve(input);
  });
});

afterAll(() => {
  setWebApiFetch((input, init) => fetch(input, init));
});

const renderHierarchy = (options?: UseHierarchyLookupOptions) =>
  renderHook(() => useHierarchyLookup('account', options));

const names = (options: { text: string }[]) => options.map((option) => option.text).sort();

describe('useHierarchyLookup', () => {
  it('starts from the top of the tree, marking which roots have children', async () => {
    const { result } = renderHierarchy();

    // A server-searched tree: the Lookup must not filter what the search returned
    expect(result.current).toMatchObject({ hierarchical: true, disableClientFilter: true, loading: true });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.options).toEqual([
      expect.objectContaining({ key: GROUP, text: 'Horizon Media Group', hasChildren: true, entityName: 'account', recordId: GROUP }),
      expect.objectContaining({ key: OTHER, text: 'Northwind Traders', hasChildren: false }),
    ]);
  });

  it('brings each search match back with its ancestors, chained by parentKey', async () => {
    const { result } = renderHierarchy();
    await waitFor(() => expect(result.current.options).toHaveLength(2));

    act(() => result.current.onSearchChange!('pixel'));

    await waitFor(() => expect(names(result.current.options!)).toEqual(['Horizon Agency', 'Horizon Media Group', 'Pixel Studio']));
    const byKey = new Map(result.current.options!.map((option) => [option.key, option]));
    expect(byKey.get(STUDIO)?.parentKey).toBe(AGENCY);
    expect(byKey.get(AGENCY)?.parentKey).toBe(GROUP);
  });

  it('goes back to the roots when the search is cleared', async () => {
    const { result } = renderHierarchy();
    act(() => result.current.onSearchChange!('pixel'));
    await waitFor(() => expect(result.current.options).toHaveLength(3));

    act(() => result.current.onSearchChange!('   '));

    await waitFor(() => expect(names(result.current.options!)).toEqual(['Horizon Media Group', 'Northwind Traders']));
    // Asked for again rather than replayed from somewhere stale
    expect(requests.filter((url) => url.includes('_parentaccountid_value eq null'))).toHaveLength(2);
  });

  it('loads a node’s children as options that sit under it', async () => {
    const { result } = renderHierarchy();
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    const group = result.current.options!.find((option) => option.key === GROUP)!;

    const children = await result.current.onLoadChildren!(group);

    expect(children).toEqual([
      expect.objectContaining({ key: AGENCY, text: 'Horizon Agency', parentKey: GROUP, hasChildren: true, entityName: 'account' }),
    ]);
  });

  it('applies the caller’s filter and shapes each option through toOption', async () => {
    const { result } = renderHierarchy({
      filter: 'statecode eq 0',
      toOption: (record, option) => ({ ...option, secondaryText: `id ${record.id.slice(0, 4)}` }),
    });

    await waitFor(() => expect(result.current.options).toHaveLength(2));

    expect(result.current.options![0].secondaryText).toBe('id 1111');
    const rootQuery = requests.find((url) => url.includes('_parentaccountid_value eq null'));
    expect(rootQuery).toContain('(_parentaccountid_value eq null) and (statecode eq 0)');
  });

  it('keeps the newest search when an older, slower one finishes after it', async () => {
    let releaseSlow!: () => void;
    const slowGate = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });
    setWebApiFetch(async (input) => {
      if (decodeURIComponent(input).includes("contains(name,'horizon')")) await slowGate;
      return serve(input);
    });
    const { result } = renderHierarchy();
    await waitFor(() => expect(result.current.options).toHaveLength(2));

    act(() => result.current.onSearchChange!('horizon'));
    act(() => result.current.onSearchChange!('northwind'));
    await waitFor(() => expect(names(result.current.options!)).toEqual(['Northwind Traders']));
    expect(result.current.loading).toBe(false);

    await act(async () => {
      releaseSlow();
      await slowGate;
      // Let the slow search's ancestor and child-count requests run through
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(names(result.current.options!)).toEqual(['Northwind Traders']);
  });

  it('reports a failed load through onError and keeps what the list had', async () => {
    const onError = vi.fn();
    const { result } = renderHierarchy({ onError });
    await waitFor(() => expect(result.current.options).toHaveLength(2));

    setWebApiFetch(async (input) =>
      decodeURIComponent(input).includes('contains(')
        ? json({ error: { message: 'Search is unavailable' } }, 500)
        : serve(input),
    );
    act(() => result.current.onSearchChange!('pixel'));

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe('Search is unavailable');
    expect(result.current.loading).toBe(false);
    expect(names(result.current.options!)).toEqual(['Horizon Media Group', 'Northwind Traders']);
  });

  it('reports a failed child load through onError and rejects, so the Lookup can stop its spinner', async () => {
    const onError = vi.fn();
    const { result } = renderHierarchy({ onError });
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    setWebApiFetch(async () => json({ error: { message: 'Children unavailable' } }, 503));

    await expect(result.current.onLoadChildren!(result.current.options![0])).rejects.toThrow('Children unavailable');
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('useHierarchyLookup on a real Lookup', () => {
  function AccountTree() {
    const hierarchy = useHierarchyLookup('account');
    return <Lookup {...hierarchy} open searchDebounceMs={0} aria-label="Account" />;
  }

  const renderTree = () =>
    render(
      <FluentProvider theme={webLightTheme}>
        <AccountTree />
      </FluentProvider>,
    );

  it('draws the roots as a tree and fetches a node’s children when it is opened', async () => {
    renderTree();

    const group = (await screen.findByText('Horizon Media Group')).closest('[role="treeitem"]')!;
    expect(group).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Northwind Traders').closest('[role="treeitem"]')).not.toHaveAttribute('aria-expanded');

    fireEvent.click(group.querySelector('[aria-hidden]')!);

    const agency = await screen.findByText('Horizon Agency');
    expect(agency.closest('[role="treeitem"]')).toHaveAttribute('aria-level', '2');
  });

  it('shows a typed search’s match under its ancestors', async () => {
    renderTree();
    await screen.findByText('Horizon Media Group');

    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'pixel' } });

    const studio = await screen.findByText('Pixel Studio');
    expect(studio.closest('[role="treeitem"]')).toHaveAttribute('aria-level', '3');
    expect(screen.queryByText('Northwind Traders')).not.toBeInTheDocument();
  });
});
