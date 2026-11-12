import * as React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DataGrid } from './DataGrid';
import { defaultLookupFooter } from './DataGridCell';
import type { DataGridColumn, DataGridLookupOption } from './DataGrid.types';

/**
 * A lookup cell's dropdown carries a header and footer, as a Dynamics lookup
 * does: what is being searched, and what the search found.
 */

beforeAll(() => {
  for (const prop of ['clientHeight', 'offsetHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => 600 });
  }
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  HTMLElement.prototype.getBoundingClientRect = function getRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 600, width: 1000, height: 600, toJSON: () => '' };
  } as never;
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

type Row = { id: string; department: string; category: string | null };

const OPTIONS: DataGridLookupOption[] = [
  { key: 'c1', text: 'BASINMIX', secondaryText: '053.08.01' },
  { key: 'c2', text: 'BASINADD', secondaryText: '053.04.08' },
];

function renderGrid(column: Partial<DataGridColumn<Row>>) {
  const columns: DataGridColumn<Row>[] = [
    { key: 'department', label: 'Department' },
    {
      key: 'category',
      label: 'Category',
      dataType: 'lookup',
      editable: true,
      searchLookup: async () => OPTIONS,
      ...column,
    },
  ];
  render(
    <FluentProvider theme={webLightTheme}>
      <DataGrid<Row>
        data={[{ id: 'r1', department: '053', category: null }]}
        columns={columns}
        getRowId={(row) => row.id}
        onCellChange={vi.fn()}
      />
    </FluentProvider>,
  );
}

async function search(text: string) {
  const user = userEvent.setup();
  const input = screen.getByPlaceholderText('Search…');
  await user.click(input);
  await user.type(input, text);
  return user;
}

describe('lookup dropdown header and footer', () => {
  it('heads the dropdown with the column and footers it with what was found', async () => {
    renderGrid({});
    await search('basin');

    expect(await screen.findByText('BASINMIX')).toBeInTheDocument();
    expect(screen.getAllByText('Category').length).toBeGreaterThan(1); // the column header, and the dropdown's
    await waitFor(() => expect(screen.getByText('2 records')).toBeInTheDocument());
  });

  it('builds a header from the row being edited', async () => {
    renderGrid({ lookupHeader: (ctx) => `Categories in department ${ctx.row.department}` });
    await search('basin');
    expect(await screen.findByText('Categories in department 053')).toBeInTheDocument();
  });

  it('puts the column\'s own content, actions included, in the footer', async () => {
    const onNew = vi.fn();
    renderGrid({ lookupFooter: (_ctx, s) => <button onClick={onNew}>+ New category “{s.text}”</button> });
    const user = await search('basin');
    await user.click(await screen.findByRole('button', { name: /New category “basin”/ }));
    expect(onNew).toHaveBeenCalled();
  });

  it('hides a header or footer set to null', async () => {
    renderGrid({ lookupHeader: null, lookupFooter: null });
    await search('basin');
    await screen.findByText('BASINMIX');
    expect(screen.queryByText('2 records')).toBeNull();
  });

  it('hands the search the row it is for', async () => {
    const searchLookup = vi.fn().mockResolvedValue(OPTIONS);
    renderGrid({ searchLookup });
    await search('basin');
    await waitFor(() => expect(searchLookup).toHaveBeenCalled());
    const calls = searchLookup.mock.calls;
    expect(calls[calls.length - 1][1].row).toMatchObject({ id: 'r1', department: '053' });
  });
});

describe('lookupMinSearch', () => {
  it('still waits for two characters by default', async () => {
    const searchLookup = vi.fn().mockResolvedValue(OPTIONS);
    renderGrid({ searchLookup });
    await search('b');
    expect(await screen.findByText('Type at least 2 characters to search')).toBeInTheDocument();
    expect(searchLookup).not.toHaveBeenCalled();
  });

  it('lists options when the dropdown opens at 0, with nothing typed', async () => {
    const searchLookup = vi.fn().mockResolvedValue(OPTIONS);
    renderGrid({ searchLookup, lookupMinSearch: 0 });
    await userEvent.setup().click(screen.getByPlaceholderText('Search…'));

    expect(await screen.findByText('BASINMIX')).toBeInTheDocument();
    expect(await screen.findByText('2 records')).toBeInTheDocument();
    expect(searchLookup.mock.calls[0][0]).toBe('');
  });

  it('does not search for a cell whose dropdown is closed', async () => {
    const searchLookup = vi.fn().mockResolvedValue(OPTIONS);
    renderGrid({ searchLookup, lookupMinSearch: 0 });
    await screen.findByPlaceholderText('Search…');
    expect(searchLookup).not.toHaveBeenCalled();
  });

  it('narrows as the user types, and lists everything again when they clear it', async () => {
    const searchLookup = vi.fn(async (text: string) => OPTIONS.filter((o) => o.text.includes(text.toUpperCase())));
    renderGrid({ searchLookup, lookupMinSearch: 0 });
    const user = await search('mix');
    await waitFor(() => expect(screen.queryByText('BASINADD')).toBeNull());
    expect(screen.getByText('BASINMIX')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Search…'));
    expect(await screen.findByText('BASINADD')).toBeInTheDocument();
  });

  it('lists afresh for the row as it is now each time it opens', async () => {
    const user = userEvent.setup();
    const searchLookup = vi.fn().mockResolvedValue(OPTIONS);
    renderGrid({ searchLookup, lookupMinSearch: 0 });
    const input = screen.getByPlaceholderText('Search…');

    await user.click(input);
    await screen.findByText('BASINMIX');
    await user.type(input, 'mix');
    await waitFor(() => expect(searchLookup).toHaveBeenCalledWith('mix', expect.anything()));

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByText('BASINMIX')).toBeNull());
    searchLookup.mockClear();

    await user.click(document.body);
    await user.click(input);
    await screen.findByText('BASINMIX');
    expect(searchLookup.mock.calls[0][0]).toBe('');
  });

  it('lists options from a cell that already has a value', async () => {
    const searchLookup = vi.fn().mockResolvedValue(OPTIONS);
    render(
      <FluentProvider theme={webLightTheme}>
        <DataGrid<Row>
          data={[{ id: 'r1', department: '053', category: 'c1' }]}
          columns={[{
            key: 'category',
            label: 'Category',
            dataType: 'lookup',
            editable: true,
            lookupMinSearch: 0,
            getLookupValue: () => ({ id: 'c1', text: 'CURRENT' }),
            searchLookup,
          }]}
          getRowId={(row) => row.id}
          onCellChange={vi.fn()}
        />
      </FluentProvider>,
    );
    await userEvent.setup().click(await screen.findByText('CURRENT'));
    expect(await screen.findByText('BASINMIX')).toBeInTheDocument();
    expect(searchLookup.mock.calls[0][0]).toBe('');
  });
});

describe('defaultLookupFooter', () => {
  const base = { minLength: 2, searching: false, results: [] as DataGridLookupOption[] };

  it('asks for more until enough has been typed', () => {
    expect(defaultLookupFooter({ ...base, text: 'b' })).toBe('Type at least 2 characters to search');
  });

  it('says it is searching', () => {
    expect(defaultLookupFooter({ ...base, text: 'ba', searching: true })).toBe('Searching…');
  });

  it('counts what was found, or says nothing was', () => {
    expect(defaultLookupFooter({ ...base, text: 'ba', results: [OPTIONS[0]] })).toBe('1 record');
    expect(defaultLookupFooter({ ...base, text: 'ba', results: OPTIONS })).toBe('2 records');
    expect(defaultLookupFooter({ ...base, text: 'zz' })).toBe('No matching records');
  });
});
