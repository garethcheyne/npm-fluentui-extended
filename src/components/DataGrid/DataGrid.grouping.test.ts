import { describe, it, expect } from 'vitest';
import { buildDisplayItems, type DisplayWalkRow } from './DataGrid.compute';

const row = (id: string, depth = 0, grouped = false, expanded = true): DisplayWalkRow => ({
  id,
  depth,
  getIsGrouped: () => grouped,
  getIsExpanded: () => expanded,
});
const group = (id: string, depth: number, expanded = true) => row(id, depth, true, expanded);

const shape = (items: ReturnType<typeof buildDisplayItems>) =>
  items.map((i) => `${i.type}:${i.row.id}`);

describe('buildDisplayItems', () => {
  it('passes rows straight through when nothing is grouped', () => {
    const rows = [row('a'), row('b')];
    expect(shape(buildDisplayItems(rows, false, true))).toEqual(['row:a', 'row:b']);
  });

  it('puts a subtotal after the rows of a single group', () => {
    const rows = [group('g1', 0), row('a', 1), row('b', 1)];
    expect(shape(buildDisplayItems(rows, true, true))).toEqual([
      'group:g1',
      'row:a',
      'row:b',
      'subtotal:g1',
    ]);
  });

  it('closes nested groups innermost-first', () => {
    // The whole reason open groups are a stack: the inner total has to sit
    // under its own rows, and the outer one under everything it covers
    const rows = [
      group('outer', 0),
      group('inner', 1),
      row('a', 2),
      row('b', 2),
    ];
    expect(shape(buildDisplayItems(rows, true, true))).toEqual([
      'group:outer',
      'group:inner',
      'row:a',
      'row:b',
      'subtotal:inner',
      'subtotal:outer',
    ]);
  });

  it('ends only the bands a new group actually closes', () => {
    const rows = [
      group('o1', 0),
      group('i1', 1),
      row('a', 2),
      group('i2', 1), // a sibling of i1, so it ends i1 but not o1
      row('b', 2),
    ];
    expect(shape(buildDisplayItems(rows, true, true))).toEqual([
      'group:o1',
      'group:i1',
      'row:a',
      'subtotal:i1',
      'group:i2',
      'row:b',
      'subtotal:i2',
      'subtotal:o1',
    ]);
  });

  it('closes every open band when a new outermost group starts', () => {
    const rows = [
      group('o1', 0),
      group('i1', 1),
      row('a', 2),
      group('o2', 0),
      row('b', 1),
    ];
    expect(shape(buildDisplayItems(rows, true, true))).toEqual([
      'group:o1',
      'group:i1',
      'row:a',
      'subtotal:i1',
      'subtotal:o1',
      'group:o2',
      'row:b',
      'subtotal:o2',
    ]);
  });

  it('handles three levels', () => {
    const rows = [group('a', 0), group('b', 1), group('c', 2), row('r', 3)];
    expect(shape(buildDisplayItems(rows, true, true))).toEqual([
      'group:a',
      'group:b',
      'group:c',
      'row:r',
      'subtotal:c',
      'subtotal:b',
      'subtotal:a',
    ]);
  });

  it('gives a collapsed band no subtotal', () => {
    // Its rows are not on screen, so a total under them would float free
    const rows = [group('g1', 0, false)];
    expect(shape(buildDisplayItems(rows, true, true))).toEqual(['group:g1']);
  });

  it('still ends an outer band when the inner one is collapsed', () => {
    const rows = [group('outer', 0), group('inner', 1, false), group('inner2', 1)];
    expect(shape(buildDisplayItems(rows, true, true))).toEqual([
      'group:outer',
      'group:inner',
      'group:inner2',
      'subtotal:inner2',
      'subtotal:outer',
    ]);
  });

  it('emits no subtotals when none are configured', () => {
    const rows = [group('g1', 0), row('a', 1)];
    expect(shape(buildDisplayItems(rows, true, false))).toEqual(['group:g1', 'row:a']);
  });

  it('never emits a row twice', () => {
    // Reading subRows as well as the expanded model was the original bug here
    const rows = [group('g', 0), row('a', 1), row('b', 1)];
    const ids = buildDisplayItems(rows, true, true)
      .filter((i) => i.type === 'row')
      .map((i) => i.row.id);
    expect(ids).toEqual(['a', 'b']);
  });

  it('keys groups and subtotals apart so the virtualiser can tell them apart', () => {
    const items = buildDisplayItems([group('g', 0), row('a', 1)], true, true);
    const keys = items.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
