import { describe, it, expect } from 'vitest';
import { autoScrollStep, isFillable, rowsToFillDown } from './useFillHandle';
import type { DataGridColumn } from './DataGrid.types';

describe('rowsToFillDown', () => {
  const order = ['a', 'b', 'c', 'd', 'e'];

  it('runs to the last row', () => {
    expect(rowsToFillDown(order, 'b')).toEqual(['c', 'd', 'e']);
  });

  it('never fills upwards', () => {
    expect(rowsToFillDown(order, 'c')).toEqual(['d', 'e']);
  });

  it('fills nothing from the last row, or a row not in the list', () => {
    expect(rowsToFillDown(order, 'e')).toEqual([]);
    expect(rowsToFillDown(order, 'z')).toEqual([]);
  });
});

describe('autoScrollStep', () => {
  // Rows show between y=100 and y=500; the edge band is 32px.
  it('does not scroll away from the edges', () => {
    expect(autoScrollStep(300, 100, 500)).toBe(0);
    expect(autoScrollStep(133, 100, 500)).toBe(0);
    expect(autoScrollStep(467, 100, 500)).toBe(0);
  });

  it('scrolls down near the bottom and up near the top', () => {
    expect(autoScrollStep(490, 100, 500)).toBeGreaterThan(0);
    expect(autoScrollStep(110, 100, 500)).toBeLessThan(0);
  });

  it('goes faster the further past the edge, up to a cap', () => {
    const near = autoScrollStep(480, 100, 500);
    const far = autoScrollStep(560, 100, 500);
    expect(far).toBeGreaterThan(near);
    expect(autoScrollStep(5000, 100, 500)).toBe(40);
    expect(autoScrollStep(-5000, 100, 500)).toBe(-40);
  });
});

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
