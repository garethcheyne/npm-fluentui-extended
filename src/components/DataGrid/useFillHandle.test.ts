import { describe, it, expect } from 'vitest';
import { isFillable } from './useFillHandle';
import type { DataGridColumn } from './DataGrid.types';

const column = (over: Partial<DataGridColumn> = {}): DataGridColumn => ({
  key: 'field',
  ...over,
});

describe('isFillable', () => {
  it('offers the handle on an editable column', () => {
    expect(isFillable(column({ editable: true, dataType: 'money' }), true)).toBe(true);
  });

  it('withholds it from a read-only column', () => {
    expect(isFillable(column({ editable: false }), true)).toBe(false);
    expect(isFillable(column({}), true)).toBe(false);
  });

  it('withholds it when the whole grid is read-only', () => {
    expect(isFillable(column({ editable: true }), false)).toBe(false);
  });

  it('withholds it from a lookup by default', () => {
    // Dragging an id down leaves every filled row pointing at the right record
    // but still showing the name it had before — the denormalised columns beside
    // it are not part of the value being dragged
    expect(isFillable(column({ editable: true, dataType: 'lookup' }), true)).toBe(false);
  });

  it('lets a column opt back in, or out', () => {
    expect(isFillable(column({ editable: true, dataType: 'lookup', fillable: true }), true)).toBe(
      true,
    );
    expect(isFillable(column({ editable: true, fillable: false }), true)).toBe(false);
  });

  it('honours an explicit opt-in over the grid being read-only', () => {
    // `fillable` is the column's own answer, so it is checked before anything
    // else — a consumer setting it means it
    expect(isFillable(column({ fillable: true }), false)).toBe(true);
  });

  it('reports false for a column that does not exist', () => {
    expect(isFillable(undefined, true)).toBe(false);
  });
});
