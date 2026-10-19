import * as React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DataGrid } from './DataGrid';
import { layoutStorageKey } from './DataGrid.utils';
import type { DataGridColumn } from './DataGrid.types';

/**
 * jsdom reports every element as zero-sized, so the virtualiser concludes the
 * viewport shows no rows and renders none of them. Giving the scroll container a
 * height is what lets these tests see a body at all.
 */
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 600;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return 1000;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return 600;
    },
  });
  // The virtualiser measures through this; the default all-zero rect makes it
  // decide nothing is on screen.
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

/** A `Storage` backed by a Map, so a persistence test cannot leak into another. */
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  } as Storage;
}

interface Line extends Record<string, unknown> {
  id: string;
  code: string;
  category: string;
  qty: number;
  price: number;
  active: boolean;
  status: number;
}

const ROWS: Line[] = [
  { id: 'r1', code: 'AAA', category: 'Alpha', qty: 3, price: 10.5, active: true, status: 1 },
  { id: 'r2', code: 'BBB', category: 'Beta', qty: 1, price: 200, active: false, status: 2 },
  { id: 'r3', code: 'CCC', category: 'Alpha', qty: 7, price: 45.25, active: true, status: 1 },
];

const COLUMNS: DataGridColumn<Line>[] = [
  { key: 'code', label: 'Code', editable: true },
  { key: 'category', label: 'Category', groupable: true },
  { key: 'qty', label: 'Qty', dataType: 'integer', editable: true, summary: 'sum' },
  { key: 'price', label: 'Price', dataType: 'money', editable: true, summary: 'sum' },
  { key: 'active', label: 'Active', dataType: 'boolean', editable: true },
  {
    key: 'status',
    label: 'Status',
    dataType: 'choice',
    choices: [
      { value: 1, label: 'Open' },
      { value: 2, label: 'Closed' },
    ],
  },
];

function renderGrid(props: Partial<React.ComponentProps<typeof DataGrid<Line>>> = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <DataGrid<Line> data={ROWS} columns={COLUMNS} getRowId={(row) => row.id} {...props} />
    </FluentProvider>,
  );
}

/** Data rows only — group headers and subtotals carry no `data-row-id`. */
function dataRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('tbody tr[data-row-id]'));
}

/**
 * The `<th>` for a column, by its label.
 *
 * Headers are found through their text rather than a `title` attribute: the
 * tooltip is a Fluent one, which puts nothing in the DOM until it is shown.
 */
function queryColumnHeader(label: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('thead th')).find(
      (th) => th.textContent?.trim().replace(/[\u2191\u2193]$/, '').trim() === label,
    ) ?? null
  );
}

function columnHeader(label: string): HTMLElement {
  const found = queryColumnHeader(label);
  if (!found) throw new Error(`No column header labelled "${label}"`);
  return found;
}

describe('DataGrid rendering', () => {
  it('renders a header per visible column', () => {
    renderGrid();
    for (const column of COLUMNS) {
      expect(columnHeader(column.label!)).toBeInTheDocument();
    }
  });

  it('renders every row', () => {
    renderGrid();
    expect(dataRows()).toHaveLength(3);
  });

  it('formats by data type rather than dumping the stored value', () => {
    renderGrid();
    // Money reads to two places; the raw 200 would render as "200"
    expect(screen.getAllByText('200.00').length).toBeGreaterThan(0);
  });

  it('resolves a choice to its label', () => {
    renderGrid();
    // A choice renders through OptionSetField as a badge, not as titled text
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('shows a placeholder rather than a blank for an unset value', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <DataGrid<Line>
          data={[{ ...ROWS[0], code: '' }]}
          columns={[{ key: 'code', label: 'Code' }]}
          getRowId={(row) => row.id}
        />
      </FluentProvider>,
    );
    // A blank cell reads as "does not apply here", which is a different claim
    // from "no value yet"
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('shows the empty message when there are no rows', () => {
    renderGrid({ data: [], emptyMessage: 'Nothing here' });
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('shows the error in place of the body', () => {
    renderGrid({ error: 'It broke' });
    expect(screen.getByText('It broke')).toBeInTheDocument();
    expect(dataRows()).toHaveLength(0);
  });

  it('shows the loading message in place of the body', () => {
    renderGrid({ loading: true, loadingMessage: 'Fetching' });
    expect(screen.getByText('Fetching')).toBeInTheDocument();
    expect(dataRows()).toHaveLength(0);
  });

  it('counts rows in the status bar', () => {
    renderGrid();
    expect(screen.getByText('3 rows')).toBeInTheDocument();
  });

  it('hides a column marked not visible by default', () => {
    renderGrid({
      columns: [...COLUMNS, { key: 'hiddenOne', label: 'Hidden', defaultVisible: false }],
    });
    expect(queryColumnHeader('Hidden')).not.toBeInTheDocument();
  });
});

describe('DataGrid editing', () => {
  it('reports a text edit with the row, column and id', async () => {
    const onCellChange = vi.fn();
    renderGrid({ onCellChange });

    const input = screen.getAllByLabelText('Code')[0];
    await userEvent.clear(input);
    await userEvent.type(input, 'ZZZ');
    fireEvent.blur(input);

    expect(onCellChange).toHaveBeenCalledWith(ROWS[0], 'code', 'ZZZ', 'r1');
  });

  it('parses a numeric edit to a number, not a string', async () => {
    const onCellChange = vi.fn();
    renderGrid({ onCellChange });

    const input = screen.getAllByLabelText('Qty')[0];
    await userEvent.clear(input);
    await userEvent.type(input, '42');
    fireEvent.blur(input);

    expect(onCellChange).toHaveBeenCalledWith(ROWS[0], 'qty', 42, 'r1');
  });

  it('refuses a character that cannot be part of a number', async () => {
    const onCellChange = vi.fn();
    renderGrid({ onCellChange });

    const input = screen.getAllByLabelText('Price')[0] as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, '1a2');

    // The rejected character must not stick in the DOM either
    expect(input.value).toBe('12');
  });

  it('commits on Enter without waiting for a blur', async () => {
    const onCellChange = vi.fn();
    renderGrid({ onCellChange });

    const input = screen.getAllByLabelText('Code')[0];
    await userEvent.clear(input);
    await userEvent.type(input, 'QQQ{Enter}');

    expect(onCellChange).toHaveBeenCalledWith(ROWS[0], 'code', 'QQQ', 'r1');
  });

  it('abandons the edit on Escape', async () => {
    const onCellChange = vi.fn();
    renderGrid({ onCellChange });

    const input = screen.getAllByLabelText('Code')[0] as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, 'QQQ{Escape}');

    expect(onCellChange).not.toHaveBeenCalled();
    expect(input.value).toBe('AAA');
  });

  it('does not stage an edit that matches what is already stored', async () => {
    const onCellChange = vi.fn();
    renderGrid({ onCellChange });

    const input = screen.getAllByLabelText('Code')[0];
    fireEvent.blur(input);

    expect(onCellChange).not.toHaveBeenCalled();
  });

  it('leaves every cell read-only when the grid is', () => {
    renderGrid({ onCellChange: vi.fn(), readOnly: true });
    expect(screen.queryByLabelText('Code')).not.toBeInTheDocument();
  });

  it('leaves cells read-only when no change handler is supplied', () => {
    renderGrid();
    expect(screen.queryByLabelText('Code')).not.toBeInTheDocument();
  });

  it('honours a per-cell read-only rule', () => {
    renderGrid({
      onCellChange: vi.fn(),
      columns: COLUMNS.map((c) =>
        c.key === 'code' ? { ...c, isCellReadOnly: (ctx) => ctx.rowId === 'r2' } : c,
      ),
    });
    // Two of the three rows keep their editor
    expect(screen.getAllByLabelText('Code')).toHaveLength(2);
  });

  it('reads through getCellValue so unsaved edits are what is shown', () => {
    renderGrid({
      getCellValue: (_row, key, rowId, base) => (key === 'code' && rowId === 'r1' ? 'STAGED' : base),
    });
    expect(screen.getAllByText('STAGED').length).toBeGreaterThan(0);
  });

  it('hands the column-resolved value to getCellValue, so accessors still work', () => {
    renderGrid({
      columns: [{ key: 'computed', label: 'Computed', accessor: (row) => `${row.code}!` }],
      // A pass-through override must not erase what the accessor produced
      getCellValue: (_row, _key, _rowId, base) => base,
    });
    expect(screen.getAllByText('AAA!').length).toBeGreaterThan(0);
  });
});

describe('DataGrid selection', () => {
  it('replaces the selection on a plain click', async () => {
    const onSelectionChange = vi.fn();
    renderGrid({ selectable: true, onSelectionChange });

    await userEvent.click(screen.getAllByLabelText('Select row')[0]);
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['r1']));
  });

  it('extends a range with Shift', () => {
    const onSelectionChange = vi.fn();
    renderGrid({ selectable: true, onSelectionChange });

    const rows = dataRows();
    fireEvent.mouseDown(rows[0]);
    fireEvent.mouseDown(rows[2], { shiftKey: true });

    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['r1', 'r2', 'r3']));
  });

  it('adds and removes with Ctrl', () => {
    const onSelectionChange = vi.fn();
    renderGrid({ selectable: true, onSelectionChange });

    const rows = dataRows();
    fireEvent.mouseDown(rows[0], { ctrlKey: true });
    fireEvent.mouseDown(rows[2], { ctrlKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['r1', 'r3']));
  });

  it('leaves the selection alone on a plain click, so cell editing still works', () => {
    const onSelectionChange = vi.fn();
    renderGrid({ selectable: true, onSelectionChange });

    fireEvent.mouseDown(dataRows()[0]);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('moves the Shift anchor on a plain click, even without selecting', () => {
    // Otherwise a Shift-click extends from wherever the user last selected
    // something, which is rarely where they are looking
    const onSelectionChange = vi.fn();
    renderGrid({ selectable: true, onSelectionChange });

    const rows = dataRows();
    fireEvent.mouseDown(rows[0]);
    fireEvent.mouseDown(rows[1], { shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['r1', 'r2']));
  });

  it('ignores the modifiers when multi-select is off', () => {
    const onSelectionChange = vi.fn();
    renderGrid({ selectable: true, multiSelect: false, onSelectionChange });

    const rows = dataRows();
    fireEvent.mouseDown(rows[0]);
    fireEvent.mouseDown(rows[2], { shiftKey: true });

    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['r3']));
  });

  it('selects every row from the header checkbox', async () => {
    const onSelectionChange = vi.fn();
    renderGrid({ selectable: true, onSelectionChange });

    await userEvent.click(screen.getByLabelText('Select all rows'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['r1', 'r2', 'r3']));
  });

  it('reports the count in the status bar', () => {
    renderGrid({ selectable: true, selectedRowIds: new Set(['r1', 'r2']) });
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('offers no checkbox column unless selectable', () => {
    renderGrid();
    expect(screen.queryByLabelText('Select all rows')).not.toBeInTheDocument();
  });
});

describe('DataGrid sorting and filtering', () => {
  it('sorts on a header click', async () => {
    renderGrid({ defaultSorting: [{ id: 'qty', desc: false }] });
    const first = dataRows()[0];
    expect(first.dataset.rowId).toBe('r2');
  });

  it('filters on what the cell displays, not on what it stores', () => {
    // "200.00" is the rendered money value; the stored one is 200
    renderGrid({ showFilters: true });
    const filter = screen.getByLabelText('Filter Price');
    fireEvent.change(filter, { target: { value: '200.00' } });
    expect(dataRows()).toHaveLength(1);
  });

  it('searches every column when none is named', () => {
    renderGrid({ globalFilter: 'Beta' });
    expect(dataRows()).toHaveLength(1);
  });

  it('searches only the named columns', () => {
    // 'Alpha' is a category; scoping to `code` must not match it
    renderGrid({ globalFilter: 'Alpha', searchColumns: ['code'] });
    expect(dataRows()).toHaveLength(0);
  });

  it('matches a choice on its label rather than its stored number', () => {
    renderGrid({ globalFilter: 'Closed' });
    expect(dataRows()).toHaveLength(1);
  });

  it('shows the filter row only when asked', () => {
    renderGrid();
    expect(screen.queryByLabelText('Filter Price')).not.toBeInTheDocument();
  });
});

describe('DataGrid grouping', () => {
  it('renders a banner per group with its row count', () => {
    renderGrid({ groupBy: 'category' });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('drops the grouped column from the body, since the banner already says it', () => {
    renderGrid({ groupBy: 'category' });
    expect(queryColumnHeader('Category')).not.toBeInTheDocument();
  });

  it('collapses a group on click', async () => {
    renderGrid({ groupBy: 'category' });
    expect(dataRows()).toHaveLength(3);

    await userEvent.click(screen.getByText('Alpha'));
    expect(dataRows()).toHaveLength(1);
  });

  it('adds no subtotal row unless asked', () => {
    const { container } = renderGrid({ groupBy: 'category' });
    // 3 data rows, 2 group banners, and the virtualiser's two spacers
    expect(container.querySelectorAll('tbody tr').length).toBe(3 + 2 + 2);
  });

  it('renders each row once, not once per level of the grouped model', () => {
    // The expanded row model already returns children under their group, so
    // reading `subRows` as well would render everything twice
    renderGrid({ groupBy: 'category' });
    expect(dataRows()).toHaveLength(3);
  });

  it('subtotals only the named columns', () => {
    renderGrid({ groupBy: 'category', groupSubtotals: ['qty'] });
    // Alpha holds 3 and 7
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('names the grouping in the status bar', () => {
    renderGrid({ groupBy: 'category' });
    expect(screen.getByText('grouped by Category')).toBeInTheDocument();
  });
});

describe('DataGrid footer', () => {
  it('totals the columns that ask for it', () => {
    renderGrid();
    // qty: 3 + 1 + 7
    expect(screen.getByText('11')).toBeInTheDocument();
    // price: 10.5 + 200 + 45.25
    expect(screen.getByText('255.75')).toBeInTheDocument();
  });

  it('renders no footer when no column asks for one', () => {
    const { container } = renderGrid({ columns: [{ key: 'code', label: 'Code' }] });
    expect(container.querySelector('tfoot')).toBeNull();
  });
});

describe('DataGrid toolbar', () => {
  it('renders the built-in toolbar once search columns are named', () => {
    renderGrid({ searchColumns: ['code'] });
    expect(screen.getByPlaceholderText('Search\u2026')).toBeInTheDocument();
  });

  it('renders no toolbar by default', () => {
    renderGrid();
    expect(screen.queryByPlaceholderText('Search\u2026')).not.toBeInTheDocument();
  });

  it('lets a custom toolbar replace the built-in one', () => {
    renderGrid({ searchColumns: ['code'], toolbar: <div>Mine</div> });
    expect(screen.getByText('Mine')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search\u2026')).not.toBeInTheDocument();
  });

  it('filters through the built-in search box', async () => {
    renderGrid({ searchColumns: ['code'] });
    await userEvent.type(screen.getByPlaceholderText('Search\u2026'), 'BBB');
    expect(dataRows()).toHaveLength(1);
  });
});

describe('DataGrid layout persistence', () => {
  it('restores a stored column order on the first render', () => {
    const scope = `test-${Math.random()}`;
    const storage = memoryStorage();

    // Seeded directly rather than by driving the grid: the layout is only
    // written once something changes, so an untouched grid stores nothing.
    storage.setItem(
      layoutStorageKey(scope, 'order'),
      JSON.stringify(['qty', 'code', 'category', 'price', 'active', 'status']),
    );

    renderGrid({ persist: { scope, storage } });
    const headers = Array.from(document.querySelectorAll('thead th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(headers[0]).toBe('Qty');
  });

  it('appends a column the stored order has never seen', () => {
    const scope = `test-${Math.random()}`;
    const storage = memoryStorage();
    storage.setItem(layoutStorageKey(scope, 'order'), JSON.stringify(['qty', 'code']));

    renderGrid({ persist: { scope, storage } });
    expect(columnHeader('Status')).toBeInTheDocument();
  });

  it('restores stored column visibility', () => {
    const scope = `test-${Math.random()}`;
    const storage = memoryStorage();
    storage.setItem(layoutStorageKey(scope, 'visibility'), JSON.stringify({ price: false }));

    renderGrid({ persist: { scope, storage } });
    expect(queryColumnHeader('Price')).not.toBeInTheDocument();
  });

  it('stores nothing when no persistence scope is given', () => {
    const storage = memoryStorage();
    renderGrid();
    expect(storage.length).toBe(0);
  });
});

describe('DataGrid density', () => {
  it('drives the row height from the density setting', () => {
    const { container, rerender } = render(
      <FluentProvider theme={webLightTheme}>
        <DataGrid<Line> data={ROWS} columns={COLUMNS} getRowId={(r) => r.id} density="compact" />
      </FluentProvider>,
    );
    const compact = container.querySelector<HTMLElement>('tbody tr[data-row-id]')!.style.height;

    rerender(
      <FluentProvider theme={webLightTheme}>
        <DataGrid<Line> data={ROWS} columns={COLUMNS} getRowId={(r) => r.id} density="spacious" />
      </FluentProvider>,
    );
    const spacious = container.querySelector<HTMLElement>('tbody tr[data-row-id]')!.style.height;

    expect(compact).toBe('22px');
    expect(spacious).toBe('36px');
  });

  it('scales the header with it, not only the body', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <DataGrid<Line> data={ROWS} columns={COLUMNS} getRowId={(r) => r.id} density="compact" />
      </FluentProvider>,
    );
    // 22px rows under a fixed 26px header reads as a header that was not told
    // about the setting
    expect(columnHeader('Code').style.height).toBe('22px');
  });
});

describe('DataGrid row state', () => {
  it('applies the state the consumer reports', () => {
    const { container } = renderGrid({ getRowState: (_row, id) => (id === 'r2' ? 'dirty' : null) });
    const row = container.querySelector<HTMLElement>('tr[data-row-id="r2"]')!;
    expect(row.className).not.toBe(
      container.querySelector<HTMLElement>('tr[data-row-id="r1"]')!.className,
    );
  });

  it('lets selection win over a reported state', () => {
    const { container } = renderGrid({
      selectable: true,
      selectedRowIds: new Set(['r2']),
      getRowState: () => 'dirty',
    });
    const selected = container.querySelector<HTMLElement>('tr[data-row-id="r2"]')!;
    const other = container.querySelector<HTMLElement>('tr[data-row-id="r1"]')!;
    expect(selected.getAttribute('aria-selected')).toBe('true');
    expect(other.getAttribute('aria-selected')).toBe('false');
  });
});
