import * as React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DataGrid } from './DataGrid';
import type { DataGridColumn, DataGridFill } from './DataGrid.types';

/** Double-clicking the fill handle copies the value into every row below. */

beforeAll(() => {
  for (const prop of ['clientHeight', 'offsetHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => 600 });
  }
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  HTMLElement.prototype.getBoundingClientRect = function getRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 600, width: 1000, height: 600, toJSON: () => '' };
  } as never;
  // jsdom has no layout, so nothing is under any point; the drag half of the
  // handle hit-tests on release.
  if (!document.elementFromPoint) document.elementFromPoint = () => null;
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

type Row = { id: string; code: string | null; locked?: boolean };

const rows = (...codes: Array<string | null>): Row[] => codes.map((code, i) => ({ id: `r${i}`, code }));

function renderGrid(
  data: Row[],
  extra: { column?: Partial<DataGridColumn<Row>>; onRowDoubleClick?: () => void } = {},
) {
  const onFill = vi.fn<(fill: DataGridFill<Row>) => void>();
  const { container } = render(
    <FluentProvider theme={webLightTheme}>
      <DataGrid<Row>
        data={data}
        columns={[{ key: 'code', label: 'Code', editable: true, ...extra.column }]}
        getRowId={(row) => row.id}
        onCellChange={vi.fn()}
        onFill={onFill}
        onRowDoubleClick={extra.onRowDoubleClick}
      />
    </FluentProvider>,
  );

  /** Activates a row's cell, then double-clicks its handle the way a mouse does. */
  const doubleClickHandle = (rowId: string) => {
    const cell = container.querySelector(`[data-row-id="${rowId}"] [data-column-key="code"]`)!;
    fireEvent.mouseDown(cell);
    const handle = screen.getByLabelText(/double-click to fill/);
    for (let click = 0; click < 2; click++) {
      fireEvent.mouseDown(handle);
      fireEvent.mouseUp(handle);
    }
    fireEvent.doubleClick(handle);
  };
  return { onFill, doubleClickHandle };
}

describe('double-clicking the fill handle', () => {
  it('fills every row below, down to the last row', () => {
    const { onFill, doubleClickHandle } = renderGrid(rows('A', null, '', '  '));
    doubleClickHandle('r0');
    expect(onFill).toHaveBeenCalledTimes(1);
    expect(onFill.mock.calls[0][0]).toMatchObject({ value: 'A', sourceRowId: 'r0', targetRowIds: ['r1', 'r2', 'r3'] });
  });

  it('overwrites cells that already hold a value', () => {
    // A checkbox or choice column is never empty, so stopping at the next value
    // would fill nothing in the columns people most want to set in bulk
    const { onFill, doubleClickHandle } = renderGrid(rows('A', 'B', null, 'C'));
    doubleClickHandle('r0');
    expect(onFill.mock.calls[0][0].targetRowIds).toEqual(['r1', 'r2', 'r3']);
  });

  it('fills only the rows below, not those above', () => {
    const { onFill, doubleClickHandle } = renderGrid(rows('X', 'A', null));
    doubleClickHandle('r1');
    expect(onFill.mock.calls[0][0].targetRowIds).toEqual(['r2']);
  });

  it('does nothing from an empty cell', () => {
    const { onFill, doubleClickHandle } = renderGrid(rows(null, null));
    doubleClickHandle('r0');
    expect(onFill).not.toHaveBeenCalled();
  });

  it('leaves a locked cell alone and carries on past it', () => {
    const data: Row[] = [{ id: 'r0', code: 'A' }, { id: 'r1', code: null, locked: true }, { id: 'r2', code: null }];
    const { onFill, doubleClickHandle } = renderGrid(data, {
      column: { isCellReadOnly: (ctx) => ctx.row.locked === true },
    });
    doubleClickHandle('r0');
    expect(onFill.mock.calls[0][0].targetRowIds).toEqual(['r2']);
  });

  it('is not also a double-click on the row', () => {
    const onRowDoubleClick = vi.fn();
    const { doubleClickHandle } = renderGrid(rows('A', null), { onRowDoubleClick });
    doubleClickHandle('r0');
    expect(onRowDoubleClick).not.toHaveBeenCalled();
  });
});
