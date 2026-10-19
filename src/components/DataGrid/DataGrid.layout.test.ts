import { describe, it, expect } from 'vitest';
import { toGroupList, applyPinOrder, pinOffsets } from './DataGrid.utils';
import type { DataGridColumn, DataGridRow } from './DataGrid.types';

describe('toGroupList', () => {
  it('accepts a single key', () => {
    expect(toGroupList('category')).toEqual(['category']);
  });

  it('accepts a list, keeping the order groups nest in', () => {
    expect(toGroupList(['region', 'category'])).toEqual(['region', 'category']);
  });

  it('treats null and undefined as ungrouped', () => {
    expect(toGroupList(null)).toEqual([]);
    expect(toGroupList(undefined)).toEqual([]);
  });

  it('drops blanks so a cleared level does not linger', () => {
    expect(toGroupList(['region', '', 'category'])).toEqual(['region', 'category']);
    expect(toGroupList('')).toEqual([]);
  });

  it('reads a layout stored before grouping could nest', () => {
    // Persisted state used to hold a bare string
    expect(toGroupList('category' as string | string[] | null)).toEqual(['category']);
  });
});

const cols = (spec: Record<string, 'left' | 'right' | undefined>): Map<string, DataGridColumn<DataGridRow>> =>
  new Map(Object.entries(spec).map(([key, pin]) => [key, { key, pin }]));

describe('applyPinOrder', () => {
  const map = cols({ a: undefined, b: 'left', c: undefined, d: 'right', e: 'left' });

  it('pulls pinned columns to their edges', () => {
    expect(applyPinOrder(['a', 'b', 'c', 'd', 'e'], map)).toEqual(['b', 'e', 'a', 'c', 'd']);
  });

  it('keeps the given order within each band', () => {
    // e was dragged before b, and that holds among the left-pinned columns
    expect(applyPinOrder(['e', 'b', 'a'], map)).toEqual(['e', 'b', 'a']);
  });

  it('leaves reserved columns leading, ahead of anything pinned', () => {
    // A checkbox behind a frozen column would separate a row from its own tick
    const order = ['__select', 'a', 'b'];
    expect(applyPinOrder(order, map, ['__select'])).toEqual(['__select', 'b', 'a']);
  });

  it('is a no-op when nothing is pinned', () => {
    const plain = cols({ a: undefined, b: undefined });
    expect(applyPinOrder(['b', 'a'], plain)).toEqual(['b', 'a']);
  });

  it('ignores ids with no column', () => {
    expect(applyPinOrder(['ghost', 'b'], map)).toEqual(['b', 'ghost']);
  });
});

describe('pinOffsets', () => {
  const width = () => 100;

  it('accumulates left offsets so columns sit end to end', () => {
    const pin = (id: string) => (id === 'a' || id === 'b' ? ('left' as const) : undefined);
    const offsets = pinOffsets(['a', 'b', 'c'], width, pin);
    expect(offsets.get('a')).toEqual({ side: 'left', offset: 0, last: false });
    expect(offsets.get('b')).toEqual({ side: 'left', offset: 100, last: true });
    expect(offsets.get('c')).toBeUndefined();
  });

  it('accumulates right offsets inwards from the right edge', () => {
    // The last column sits at 0 from the right; the one before it clears it
    const pin = (id: string) => (id === 'y' || id === 'z' ? ('right' as const) : undefined);
    const offsets = pinOffsets(['x', 'y', 'z'], width, pin);
    expect(offsets.get('z')).toEqual({ side: 'right', offset: 0, last: false });
    expect(offsets.get('y')).toEqual({ side: 'right', offset: 100, last: true });
  });

  it('marks the innermost column on each side, for the divider edge', () => {
    const pin = (id: string) =>
      id === 'a' ? ('left' as const) : id === 'z' ? ('right' as const) : undefined;
    const offsets = pinOffsets(['a', 'm', 'z'], width, pin);
    expect(offsets.get('a')?.last).toBe(true);
    expect(offsets.get('z')?.last).toBe(true);
  });

  it('respects differing widths', () => {
    const pin = () => 'left' as const;
    const widths: Record<string, number> = { a: 40, b: 250 };
    const offsets = pinOffsets(['a', 'b'], (id) => widths[id], pin);
    expect(offsets.get('b')?.offset).toBe(40);
  });

  it('returns nothing when no column is pinned', () => {
    expect(pinOffsets(['a', 'b'], width, () => undefined).size).toBe(0);
  });
});
