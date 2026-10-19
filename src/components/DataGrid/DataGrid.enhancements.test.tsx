import * as React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DataGrid } from './DataGrid';
import { layoutStorageKey } from './DataGrid.utils';
import type { DataGridColumn, DataGridHandle } from './DataGrid.types';

/*
 * The features added to let DataGrid replace the project grids: custom states,
 * group hooks, controlled visibility and layouts, summaries, and spreadsheet
 * keys. Setup mirrors DataGrid.render.test.tsx.
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
}

const ROWS: Line[] = [
  { id: 'r1', code: 'AAA', category: 'Alpha', qty: 3, price: 10.5 },
  { id: 'r2', code: 'BBB', category: 'Beta', qty: 1, price: 200 },
  { id: 'r3', code: 'CCC', category: 'Alpha', qty: 7, price: 45.25 },
];

const COLUMNS: DataGridColumn<Line>[] = [
  { key: 'code', label: 'Code', editable: true },
  { key: 'category', label: 'Category', groupable: true },
  { key: 'qty', label: 'Qty', dataType: 'integer', editable: true, summary: 'sum' },
  { key: 'price', label: 'Price', dataType: 'money', editable: true, summary: 'sum' },
];

type GridProps = Partial<React.ComponentProps<typeof DataGrid<Line>>>;

function grid(props: GridProps = {}) {
  return (
    <FluentProvider theme={webLightTheme}>
      <DataGrid<Line> data={ROWS} columns={COLUMNS} getRowId={(row) => row.id} {...props} />
    </FluentProvider>
  );
}

function renderGrid(props: GridProps = {}) {
  return render(grid(props));
}

function dataRows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('tbody tr[data-row-id]'));
}

function rowEl(id: string): HTMLElement {
  return document.querySelector<HTMLElement>(`tr[data-row-id="${id}"]`)!;
}

function cellEl(rowId: string, columnKey: string): HTMLElement {
  return document.querySelector<HTMLElement>(
    `tr[data-row-id="${rowId}"] td[data-column-key="${columnKey}"]`,
  )!;
}

function hasHeader(label: string): boolean {
  return Array.from(document.querySelectorAll('thead th')).some(
    (th) => th.textContent?.trim() === label,
  );
}

function withColumn(key: string, patch: Partial<DataGridColumn<Line>>): DataGridColumn<Line>[] {
  return COLUMNS.map((c) => (c.key === key ? { ...c, ...patch } : c));
}

const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 30));

describe('custom cell states', () => {
  it('renders a state that exists only in the consumer', () => {
    renderGrid({
      cellStates: { attention: { background: 'gold', color: 'brown' } },
      columns: withColumn('qty', {
        getCellState: (ctx) => (ctx.rowId === 'r1' ? 'attention' : null),
      }),
    });
    expect(cellEl('r1', 'qty').style.getPropertyValue('--fue-cell-bg')).toBe('gold');
    expect(cellEl('r1', 'qty').style.getPropertyValue('--fue-cell-color')).toBe('brown');
    expect(cellEl('r2', 'qty').style.getPropertyValue('--fue-cell-bg')).toBe('');
  });

  it('restyles a built-in state and leaves the others alone', () => {
    renderGrid({
      cellStates: { error: { background: 'pink' } },
      columns: withColumn('qty', {
        getCellState: (ctx) => (ctx.rowId === 'r1' ? 'error' : 'warn'),
      }),
    });
    expect(cellEl('r1', 'qty').style.getPropertyValue('--fue-cell-bg')).toBe('pink');
    const warn = cellEl('r2', 'qty').style.getPropertyValue('--fue-cell-bg');
    expect(warn).not.toBe('');
    expect(warn).not.toBe('pink');
  });

  it('adds no class or variable for a state without a fill, leaving the row showing', () => {
    renderGrid({
      cellStates: { goodText: { color: 'green' } },
      columns: withColumn('qty', { getCellState: () => 'goodText' }),
    });
    expect(cellEl('r1', 'qty').style.getPropertyValue('--fue-cell-bg')).toBe('');
  });
});

describe('row states', () => {
  it('layers a list of states, so an excluded row can also be dirty', () => {
    renderGrid({ getRowState: (_row, id) => (id === 'r1' ? ['muted', 'dirty'] : null) });
    const style = rowEl('r1').style;
    expect(style.getPropertyValue('--fue-row-opacity')).toBe('0.7');
    expect(style.getPropertyValue('--fue-row-accent')).not.toBe('');
    expect(rowEl('r2').style.getPropertyValue('--fue-row-accent')).toBe('');
  });

  it('strikes a deleted row through', () => {
    renderGrid({ getRowState: () => 'deleted' });
    expect(rowEl('r1').style.getPropertyValue('--fue-row-text-decoration')).toBe('line-through');
  });

  it('puts selection on top without losing what it does not set', () => {
    renderGrid({
      selectable: true,
      selectedRowIds: new Set(['r1']),
      getRowState: () => 'deleted',
    });
    const selected = rowEl('r1').style;
    const unselected = rowEl('r2').style;
    expect(selected.getPropertyValue('--fue-row-bg')).not.toBe(
      unselected.getPropertyValue('--fue-row-bg'),
    );
    expect(selected.getPropertyValue('--fue-row-text-decoration')).toBe('line-through');
  });

  it('accepts a consumer state through rowStates', () => {
    renderGrid({ rowStates: { flagged: { accent: 'orange' } }, getRowState: () => 'flagged' });
    expect(rowEl('r1').style.getPropertyValue('--fue-row-accent')).toBe('orange');
  });
});

describe('cell tooltip hook', () => {
  it('shows the explanation on hover instead of the value', async () => {
    renderGrid({
      columns: withColumn('code', { getCellTooltip: () => 'Calculated by Dynamics' }),
    });
    await userEvent.hover(screen.getAllByText('AAA')[0]);
    // Fluent mirrors a description tooltip's text for assistive tech, so it can
    // be in the document more than once
    const shown = await screen.findAllByText('Calculated by Dynamics', undefined, { timeout: 2000 });
    expect(shown.length).toBeGreaterThan(0);
  });

  it('still renders the value underneath', () => {
    renderGrid({ columns: withColumn('code', { getCellTooltip: () => 'Locked' }) });
    expect(screen.getAllByText('AAA').length).toBeGreaterThan(0);
  });
});

describe('summaries', () => {
  it('runs a function summary over effective values', () => {
    renderGrid({
      columns: withColumn('price', {
        // Line value, qty times price: 31.5 + 200 + 316.75
        summary: (rows, { readValue }) =>
          rows.reduce((sum, row) => sum + Number(readValue(row, 'qty')) * Number(readValue(row, 'price')), 0),
      }),
    });
    expect(screen.getByText('548.25')).toBeInTheDocument();
  });

  it('renders a node a summary returns as it is', () => {
    renderGrid({
      columns: withColumn('price', { summary: () => <span>GP 12%</span> }),
    });
    expect(screen.getByText('GP 12%')).toBeInTheDocument();
  });

  it('leaves rows excluded by includeInSummary out of totals but on screen', () => {
    renderGrid({ includeInSummary: (_row, id) => id !== 'r2' });
    expect(screen.getByText('10')).toBeInTheDocument(); // qty 3 + 7
    expect(screen.getByText('55.75')).toBeInTheDocument(); // price 10.5 + 45.25
    expect(dataRows()).toHaveLength(3);
  });

  it('leaves excluded rows out of group counts too', () => {
    renderGrid({ groupBy: 'category', includeInSummary: (_row, id) => id !== 'r1' });
    // Alpha now counts only r3; Beta has its one row
    expect(screen.getAllByText('(1)')).toHaveLength(2);
  });

  it('holds subtotals back until there are enough groups', () => {
    const { container, rerender } = renderGrid({
      groupBy: 'category',
      groupSubtotals: ['qty'],
      groupSubtotalsMinGroups: 3,
      footerSummary: false,
    });
    // 3 rows, 2 banners, 2 spacers, and no subtotal rows
    expect(container.querySelectorAll('tbody tr').length).toBe(7);

    rerender(
      grid({ groupBy: 'category', groupSubtotals: ['qty'], groupSubtotalsMinGroups: 2, footerSummary: false }),
    );
    expect(container.querySelectorAll('tbody tr').length).toBe(9);
  });
});

describe('group header hooks', () => {
  it('selects the rows in one group from its checkbox', async () => {
    const onSelectionChange = vi.fn();
    renderGrid({ groupBy: 'category', selectable: true, groupSelection: true, onSelectionChange });

    await userEvent.click(screen.getAllByLabelText('Select rows in group')[0]);
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['r1', 'r3']));
    // Ticking the box is not a request to collapse the group
    expect(dataRows()).toHaveLength(3);
  });

  it('shows a partial selection as indeterminate', () => {
    renderGrid({
      groupBy: 'category',
      selectable: true,
      groupSelection: true,
      selectedRowIds: new Set(['r1']),
    });
    const alpha = screen.getAllByLabelText('Select rows in group')[0] as HTMLInputElement;
    expect(alpha.indeterminate).toBe(true);
    expect(alpha.checked).toBe(false);
  });

  it('renders custom banner content', () => {
    renderGrid({
      groupBy: 'category',
      renderGroupHeader: (ctx) => <span>{`Band ${String(ctx.value)} has ${ctx.count}`}</span>,
    });
    expect(screen.getByText('Band Alpha has 2')).toBeInTheDocument();
  });

  it('opens a group context menu on right-click', async () => {
    const onClick = vi.fn();
    renderGrid({
      groupBy: 'category',
      groupContextMenu: (ctx) => [{ key: 'rename', text: `Rename ${String(ctx.value)}`, onClick }],
    });
    fireEvent.contextMenu(screen.getByText('Alpha'));
    expect(await screen.findByText('Rename Alpha')).toBeInTheDocument();
  });

  it('reports a double-click, and collapses from the chevron only', async () => {
    const onGroupDoubleClick = vi.fn();
    renderGrid({ groupBy: 'category', onGroupDoubleClick });

    fireEvent.click(screen.getByText('Alpha'));
    expect(dataRows()).toHaveLength(3);

    fireEvent.doubleClick(screen.getByText('Alpha'));
    expect(onGroupDoubleClick).toHaveBeenCalledWith(expect.objectContaining({ value: 'Alpha' }));

    await userEvent.click(screen.getAllByLabelText('Collapse group')[0]);
    expect(dataRows()).toHaveLength(1);
  });
});

describe('column visibility', () => {
  it('hides forced columns and brings them back when the force lifts', () => {
    const { rerender } = renderGrid({ forceHiddenColumns: ['price'] });
    expect(hasHeader('Price')).toBe(false);

    rerender(grid({ forceHiddenColumns: [] }));
    expect(hasHeader('Price')).toBe(true);
  });

  it('follows controlled visibility', () => {
    renderGrid({ columnVisibility: { qty: false } });
    expect(hasHeader('Qty')).toBe(false);
    expect(hasHeader('Price')).toBe(true);
  });

  it('loads the new scope when persist.scope changes, without overwriting it', () => {
    const storage = memoryStorage();
    const scopeA = `a-${Math.random()}`;
    const scopeB = `b-${Math.random()}`;
    storage.setItem(layoutStorageKey(scopeB, 'visibility'), JSON.stringify({ price: false }));

    const { rerender } = renderGrid({ persist: { scope: scopeA, storage } });
    expect(hasHeader('Price')).toBe(true);

    rerender(grid({ persist: { scope: scopeB, storage } }));
    expect(hasHeader('Price')).toBe(false);
    expect(storage.getItem(layoutStorageKey(scopeB, 'visibility'))).toBe(
      JSON.stringify({ price: false }),
    );
    // Nothing the user changed, so nothing written under the old scope either
    expect(storage.getItem(layoutStorageKey(scopeA, 'visibility'))).toBeNull();
  });
});

describe('layouts through the handle', () => {
  it('applies a layout and reads it back', () => {
    const ref = React.createRef<DataGridHandle<Line>>();
    render(
      <FluentProvider theme={webLightTheme}>
        <DataGrid<Line> ref={ref} data={ROWS} columns={COLUMNS} getRowId={(row) => row.id} />
      </FluentProvider>,
    );

    act(() => ref.current!.applyLayout({ visibility: { price: false }, density: 'compact' }));

    expect(hasHeader('Price')).toBe(false);
    const layout = ref.current!.getLayout();
    expect(layout.visibility).toEqual({ price: false });
    expect(layout.density).toBe('compact');
    expect(layout.order).toEqual(['code', 'category', 'qty', 'price']);
  });

  it('outlines a highlighted row, then lets it go', async () => {
    const ref = React.createRef<DataGridHandle<Line>>();
    render(
      <FluentProvider theme={webLightTheme}>
        <DataGrid<Line> ref={ref} data={ROWS} columns={COLUMNS} getRowId={(row) => row.id} />
      </FluentProvider>,
    );
    const before = rowEl('r2').className;

    act(() => ref.current!.highlightRow('r2', { durationMs: 20 }));
    expect(rowEl('r2').className).not.toBe(before);

    await waitFor(() => expect(rowEl('r2').className).toBe(before));
  });
});

describe('row chrome', () => {
  it('renders a row indicator without making rows draggable', () => {
    renderGrid({ renderRowIndicator: (_row, id) => (id === 'r1' ? '+' : null) });
    expect(rowEl('r1').textContent).toContain('+');
    expect(screen.queryByLabelText('Reorder row')).not.toBeInTheDocument();
  });

  it('marks editable cells while hints are on', () => {
    const { rerender } = renderGrid({ onCellChange: vi.fn() });
    const plain = cellEl('r1', 'code').className;

    rerender(grid({ onCellChange: vi.fn(), showEditableHints: true }));
    expect(cellEl('r1', 'code').className).not.toBe(plain);
  });
});

describe('toolbar search slot', () => {
  it('replaces the search box and still drives the search', async () => {
    renderGrid({
      renderToolbarSearch: ({ value, onChange }) => (
        <input aria-label="Product search" value={value} onChange={(e) => onChange(e.target.value)} />
      ),
    });
    expect(screen.queryByPlaceholderText('Search…')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Product search'), 'BBB');
    expect(dataRows()).toHaveLength(1);
  });
});

describe('spreadsheet keys', () => {
  function clickInto(input: HTMLElement) {
    fireEvent.mouseDown(input);
    input.focus();
  }

  it('tabs to the next editable cell, skipping read-only ones, without staging an edit', async () => {
    const onCellChange = vi.fn();
    renderGrid({ onCellChange });

    const code = screen.getAllByLabelText('Code')[0];
    clickInto(code);
    fireEvent.keyDown(code, { key: 'Tab' });

    // Category is not editable, so Tab lands on Qty
    const qty = screen.getAllByLabelText('Qty')[0] as HTMLInputElement;
    await waitFor(() => expect(document.activeElement).toBe(qty));
    // Arrived by keyboard, so the value is selected ready to be typed over
    expect(qty.selectionStart).toBe(0);
    expect(qty.selectionEnd).toBe(qty.value.length);
    expect(onCellChange).not.toHaveBeenCalled();
  });

  it('wraps Tab onto the next row', async () => {
    renderGrid({ onCellChange: vi.fn() });

    const price = screen.getAllByLabelText('Price')[0];
    clickInto(price);
    fireEvent.keyDown(price, { key: 'Tab' });

    await waitFor(() => expect(document.activeElement).toBe(screen.getAllByLabelText('Code')[1]));
  });

  it('steps back with Shift+Tab', async () => {
    renderGrid({ onCellChange: vi.fn() });

    const qty = screen.getAllByLabelText('Qty')[0];
    clickInto(qty);
    fireEvent.keyDown(qty, { key: 'Tab', shiftKey: true });

    await waitFor(() => expect(document.activeElement).toBe(screen.getAllByLabelText('Code')[0]));
  });

  it('keeps the arrows on the caret while it is inside the text', async () => {
    renderGrid({ onCellChange: vi.fn() });

    const code = screen.getAllByLabelText('Code')[0] as HTMLInputElement;
    clickInto(code);
    code.setSelectionRange(1, 1);
    fireEvent.keyDown(code, { key: 'ArrowRight' });

    await nextFrame();
    expect(document.activeElement).toBe(code);
  });

  it('leaves the cell once the caret reaches the end', async () => {
    renderGrid({ onCellChange: vi.fn() });

    const qty = screen.getAllByLabelText('Qty')[0] as HTMLInputElement;
    clickInto(qty);
    qty.setSelectionRange(qty.value.length, qty.value.length);
    fireEvent.keyDown(qty, { key: 'ArrowRight' });

    await waitFor(() => expect(document.activeElement).toBe(screen.getAllByLabelText('Price')[0]));
  });
});
