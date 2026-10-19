import * as React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DataGrid } from './DataGrid';
import { isSameCellValue } from './DataGrid.utils';
import { buildDisplayItems, type DisplayWalkRow } from './DataGrid.compute';
import type { DataGridColumn } from './DataGrid.types';

/*
 * Regressions found while migrating the price list grid onto DataGrid. Each of
 * these was a real defect: a grid that answered keys meant for its filter row,
 * totals and selections that forgot the rows inside a collapsed group, a
 * keyboard that did nothing until the mouse had been used, and subtotals
 * repeated at every level of a nested grouping.
 */

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 600 });
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

interface Line extends Record<string, unknown> {
  id: string;
  code: string;
  category: string;
  qty: number;
}

const ROWS: Line[] = [
  { id: 'r1', code: 'AAA', category: 'Alpha', qty: 3 },
  { id: 'r2', code: 'BBB', category: 'Beta', qty: 1 },
  { id: 'r3', code: 'CCC', category: 'Alpha', qty: 7 },
];

const COLUMNS: DataGridColumn<Line>[] = [
  { key: 'code', label: 'Code', editable: true },
  { key: 'category', label: 'Category', groupable: true },
  { key: 'qty', label: 'Qty', dataType: 'integer', editable: true, summary: 'sum' },
];

type GridProps = Partial<React.ComponentProps<typeof DataGrid<Line>>>;

function renderGrid(props: GridProps = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <DataGrid<Line> data={ROWS} columns={COLUMNS} getRowId={(row) => row.id} {...props} />
    </FluentProvider>,
  );
}

const footerText = (container: HTMLElement) => container.querySelector('tfoot')?.textContent ?? '';

/** Body rows actually rendered — not the header, filter or spacer rows. */
const dataRows = () =>
  Array.from(document.querySelectorAll<HTMLElement>('tbody tr[data-row-id]'));

describe('keys belong to whatever has focus', () => {
  it('ignores arrows pressed in the filter row', async () => {
    renderGrid({ onCellChange: vi.fn(), defaultShowFilters: true });

    // Give the grid an active cell first: without one it ignores keys anyway,
    // so the test would pass for the wrong reason.
    const code = screen.getAllByLabelText('Code')[0];
    fireEvent.mouseDown(code);
    code.focus();

    const filter = document.querySelector<HTMLInputElement>('[data-filter-for="code"]')!;
    filter.focus();
    fireEvent.keyDown(filter, { key: 'ArrowDown' });

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(document.activeElement).toBe(filter);
  });
});

describe('a collapsed group is still part of the data', () => {
  it('keeps it in the footer total and the row count', async () => {
    const { container } = renderGrid({ groupBy: 'category' });
    expect(footerText(container)).toContain('11');
    expect(screen.getByText('3 rows')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Alpha'));

    // Alpha holds r1 and r3, so only Beta's single row is left on screen.
    await waitFor(() => expect(dataRows()).toHaveLength(1));
    expect(footerText(container)).toContain('11');
    expect(screen.getByText('3 rows')).toBeInTheDocument();
  });

  it('selects its rows with select-all', async () => {
    const onSelectionChange = vi.fn();
    renderGrid({ groupBy: 'category', selectable: true, onSelectionChange });

    fireEvent.click(screen.getByText('Alpha'));
    await waitFor(() => expect(dataRows()).toHaveLength(1));
    fireEvent.click(screen.getByLabelText('Select all rows'));

    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['r1', 'r2', 'r3']));
  });
});

describe('the keyboard works before the mouse does', () => {
  it('takes the arrows from a cell reached by focus alone', async () => {
    renderGrid({ onCellChange: vi.fn() });

    // Arriving by Tab from outside the grid: focus, and no mousedown anywhere.
    const first = screen.getAllByLabelText('Code')[0];
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });

    await waitFor(() => expect(document.activeElement).toBe(screen.getAllByLabelText('Code')[1]));
  });
});

describe('subtotal levels', () => {
  const band = (id: string, depth: number): DisplayWalkRow => ({
    id,
    depth,
    getIsGrouped: () => true,
    getIsExpanded: () => true,
  });
  const leaf = (id: string, depth: number): DisplayWalkRow => ({
    id,
    depth,
    getIsGrouped: () => false,
    getIsExpanded: () => false,
  });

  // Task → Group → rows, the shape the quote grid uses.
  const nested = [band('t1', 0), band('g1', 1), leaf('r1', 2), band('g2', 1), leaf('r2', 2)];

  it('puts one under every level by default', () => {
    const subtotals = buildDisplayItems(nested, true, true).filter((i) => i.type === 'subtotal');
    expect(subtotals.map((i) => i.row.id)).toEqual(['g1', 'g2', 't1']);
  });

  it('puts one only under the bands holding rows when asked', () => {
    const subtotals = buildDisplayItems(nested, true, true, 'innermost').filter(
      (i) => i.type === 'subtotal',
    );
    expect(subtotals.map((i) => i.row.id)).toEqual(['g1', 'g2']);
  });
});

describe('isSameCellValue', () => {
  it('treats every spelling of blank as the same', () => {
    expect(isSameCellValue(null, undefined)).toBe(true);
    expect(isSameCellValue('', null)).toBe(true);
    expect(isSameCellValue(undefined, '')).toBe(true);
  });

  it('counts clearing a filled cell as a change', () => {
    // The bug this exists to stop: `String(a) === String(b)` reads these as
    // equal, so the clear is dropped and the button looks broken.
    expect(isSameCellValue(null, '2026-08-04')).toBe(false);
    expect(isSameCellValue('', 500)).toBe(false);
  });

  it('compares real values by worth, not by reference', () => {
    expect(isSameCellValue(500, 500)).toBe(true);
    expect(isSameCellValue(new Date('2026-08-04'), new Date('2026-08-04'))).toBe(true);
    expect(isSameCellValue(true, 'true')).toBe(true);
    expect(isSameCellValue(500, 501)).toBe(false);
  });
});
