import { describe, it, expect, vi } from 'vitest';
import { resolveCellValue, computeEditPatch } from './DataGrid.compute';
import type { DataGridColumn } from './DataGrid.types';

interface Line extends Record<string, unknown> {
  id: string;
  cost: number;
  transport: number;
  sell: number;
  qty: number;
  taxPercent: number;
  storedGp?: number;
}

const row: Line = { id: 'r1', cost: 100, transport: 10, sell: 200, qty: 3, taxPercent: 15 };

/**
 * The pricing model the quote grid uses, expressed as grid columns:
 *   costWithTransport = cost × (1 + transport/100)
 *   gp%               = (sell − costWithTransport) / sell × 100
 *   totalEx           = sell × qty
 */
const columns: DataGridColumn<Line>[] = [
  { key: 'cost', dataType: 'money', editable: true },
  { key: 'transport', dataType: 'percent', editable: true },
  { key: 'sell', dataType: 'money', editable: true },
  { key: 'qty', dataType: 'integer', editable: true },
  { key: 'taxPercent', dataType: 'percent', editable: true },
  {
    key: 'costWithTransport',
    dataType: 'money',
    computed: { value: (c) => c.num('cost') * (1 + c.num('transport') / 100) },
  },
  {
    key: 'gp',
    dataType: 'percent',
    editable: true,
    computed: {
      value: (c) =>
        c.num('sell') === 0
          ? 0
          : ((c.num('sell') - c.num('costWithTransport')) / c.num('sell')) * 100,
      // Typing a GP% sets the price that would achieve it.
      onEdit: (value, c) => {
        const pct = Number(value);
        if (!Number.isFinite(pct) || pct >= 100) return;
        return { sell: c.num('costWithTransport') / (1 - pct / 100) };
      },
    },
  },
  {
    key: 'totalEx',
    dataType: 'money',
    computed: { value: (c) => c.num('sell') * c.num('qty'), persist: true },
  },
];

const columnMap = new Map(columns.map((c) => [c.key, c]));
type Overlay = (row: Line, key: string, rowId: string, base: unknown) => unknown;
const read = (key: string, overlay?: Overlay) =>
  resolveCellValue(row, key, 'r1', columnMap, overlay);

describe('resolveCellValue', () => {
  it('reads a stored column straight off the row', () => {
    expect(read('sell')).toBe(200);
  });

  it('calculates a virtual column from other columns', () => {
    // Raw, unrounded: display formatting applies precision, and a virtual
    // column never reaches a record where the noise would matter
    expect(read('costWithTransport')).toBeCloseTo(110, 10);
    expect(read('gp')).toBeCloseTo(45, 10);
    expect(read('totalEx')).toBe(600);
  });

  it('chains one calculation through another', () => {
    // gp depends on costWithTransport, which is itself calculated
    expect(read('gp')).toBeCloseTo(((200 - 110) / 200) * 100, 10);
  });

  it('recalculates from unsaved edits, not the stored record', () => {
    // The reason calculations take a context instead of the raw row: an edited
    // cost must move the margin before anything is saved
    const pending: Record<string, unknown> = { cost: 150 };
    const overlay = (_r: Line, key: string, _id: string, base: unknown) =>
      key in pending ? pending[key] : base;

    expect(read('costWithTransport', overlay)).toBeCloseTo(165, 10);
    expect(read('gp', overlay)).toBeCloseTo(((200 - 165) / 200) * 100, 10);
    // ...while the stored row is untouched
    expect(row.cost).toBe(100);
  });

  it('reports its calculation rather than a staged copy of itself', () => {
    // A persisted calculated column is staged so it can be saved. If that
    // staged value won here, the cell would freeze at the figure it held when
    // first written while the inputs behind it carried on moving.
    const overlay = (_r: Line, key: string, _id: string, base: unknown) =>
      key === 'totalEx' ? 1 : base;
    expect(read('totalEx', overlay)).toBe(600);
  });

  it('returns undefined for an unknown column rather than throwing', () => {
    expect(read('nope')).toBeUndefined();
  });

  it('survives a calculation that refers to itself', () => {
    const selfRef: DataGridColumn<Line>[] = [
      { key: 'a', computed: { value: (c) => c.num('a') + 1 } },
    ];
    const map = new Map(selfRef.map((c) => [c.key, c]));
    expect(resolveCellValue(row, 'a', 'r1', map)).toBe(1);
  });

  it('survives two calculations that refer to each other', () => {
    const cycle: DataGridColumn<Line>[] = [
      { key: 'a', computed: { value: (c) => c.num('b') + 1 } },
      { key: 'b', computed: { value: (c) => c.num('a') + 1 } },
    ];
    const map = new Map(cycle.map((c) => [c.key, c]));
    expect(() => resolveCellValue(row, 'a', 'r1', map)).not.toThrow();
  });

  it('treats a blank dependency as zero', () => {
    const sparse: Line = { ...row, cost: undefined as unknown as number };
    expect(resolveCellValue(sparse, 'costWithTransport', 'r1', columnMap)).toBe(0);
  });
});

describe('computeEditPatch', () => {
  const patchFor = (key: string, value: unknown) =>
    computeEditPatch(row, 'r1', key, value, columns, columnMap);

  it('writes the edited field', () => {
    expect(patchFor('qty', 5).qty).toBe(5);
  });

  it('carries persisted calculations along with the edit that moved them', () => {
    // sell × qty, using the new qty rather than the stored one
    expect(patchFor('qty', 5).totalEx).toBe(1000);
  });

  it('leaves virtual calculations out of the patch entirely', () => {
    const patch = patchFor('sell', 250);
    expect(patch).not.toHaveProperty('gp');
    expect(patch).not.toHaveProperty('costWithTransport');
  });

  it('turns an edit of a calculated column into writes on its inputs', () => {
    // Asking for 50% GP on a $110 landed cost means a $220 sell
    const patch = patchFor('gp', 50);
    expect(patch.sell).toBeCloseTo(220, 10);
    expect(patch).not.toHaveProperty('gp');
  });

  it('recalculates persisted columns from the write-back, not the old value', () => {
    const patch = patchFor('gp', 50);
    // totalEx must use the sell price the GP edit just produced
    expect(patch.totalEx).toBeCloseTo(220 * 3, 10);
  });

  it('rounds a persisted figure to the precision it displays at', () => {
    // 100 × 1.1 is 110.00000000000001 in binary floating point, and that is
    // not a number to hand to a money field
    const cols: DataGridColumn<Line>[] = [
      { key: 'cost', editable: true },
      {
        key: 'landed',
        dataType: 'money',
        computed: { value: (c) => c.num('cost') * 1.1, persist: true },
      },
    ];
    const map = new Map(cols.map((c) => [c.key, c]));
    expect(computeEditPatch(row, 'r1', 'cost', 100, cols, map).landed).toBe(110);
  });

  it('respects an explicit precision when rounding a persisted figure', () => {
    const cols: DataGridColumn<Line>[] = [
      { key: 'cost', editable: true },
      {
        key: 'third',
        dataType: 'decimal',
        precision: 4,
        computed: { value: (c) => c.num('cost') / 3, persist: true },
      },
    ];
    const map = new Map(cols.map((c) => [c.key, c]));
    expect(computeEditPatch(row, 'r1', 'cost', 10, cols, map).third).toBe(3.3333);
  });

  it('leaves a non-numeric persisted value alone', () => {
    const cols: DataGridColumn<Line>[] = [
      { key: 'qty', editable: true },
      {
        key: 'band',
        dataType: 'string',
        computed: { value: (c) => (c.num('qty') > 3 ? 'bulk' : 'single'), persist: true },
      },
    ];
    const map = new Map(cols.map((c) => [c.key, c]));
    expect(computeEditPatch(row, 'r1', 'qty', 10, cols, map).band).toBe('bulk');
  });

  it('drops an edit a calculated column refuses', () => {
    // 100% GP has no finite sell price, so onEdit returns nothing
    const patch = patchFor('gp', 100);
    expect(patch).not.toHaveProperty('sell');
  });

  it('honours persistAs when the field name differs from the column key', () => {
    const aliased: DataGridColumn<Line>[] = [
      { key: 'qty', editable: true },
      {
        key: 'lineTotal',
        computed: { value: (c) => c.num('qty') * 10, persist: true, persistAs: 'extendedamount' },
      },
    ];
    const map = new Map(aliased.map((c) => [c.key, c]));
    const patch = computeEditPatch(row, 'r1', 'qty', 4, aliased, map);
    expect(patch.extendedamount).toBe(40);
    expect(patch).not.toHaveProperty('lineTotal');
  });

  it('layers the consumer overlay under the cascade', () => {
    // An unsaved sell edit already staged should feed the qty edit's totals
    const overlay = (_r: Line, key: string, _id: string, base: unknown) =>
      key === 'sell' ? 300 : base;
    const patch = computeEditPatch(row, 'r1', 'qty', 2, columns, columnMap, overlay);
    expect(patch.totalEx).toBe(600);
  });

  it('does not consult calculations on other rows', () => {
    const spy = vi.fn(() => 1);
    const cols: DataGridColumn<Line>[] = [
      { key: 'qty', editable: true },
      { key: 'x', computed: { value: spy } },
    ];
    const map = new Map(cols.map((c) => [c.key, c]));
    computeEditPatch(row, 'r1', 'qty', 2, cols, map);
    // x is virtual, so nothing needs its value
    expect(spy).not.toHaveBeenCalled();
  });
});
