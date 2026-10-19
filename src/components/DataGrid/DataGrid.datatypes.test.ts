import { describe, it, expect } from 'vitest';
import {
  aggregate,
  columnAlign,
  formatCellValue,
  parseEditorValue,
  roundTo,
} from './DataGrid.utils';
import { UNFILLABLE_TYPES } from './DataGrid.tokens';
import { isFillable } from './useFillHandle';
import type { DataGridColumn, DataGridDataType, DataGridRow } from './DataGrid.types';

/**
 * One case per data type, covering what the type does and what it shows.
 *
 * Every type the grid claims to support is listed here, so adding one to
 * `DataGridDataType` without teaching the formatter about it fails the
 * exhaustiveness check at the bottom rather than shipping as `String(value)`.
 */
interface Row extends Record<string, unknown> {
  v: unknown;
}

const col = (over: Partial<DataGridColumn<Row>> = {}): DataGridColumn<Row> => ({
  key: 'v',
  ...over,
});

const show = (value: unknown, over: Partial<DataGridColumn<Row>> = {}) =>
  formatCellValue(value, col(over), { v: value });

const parse = (raw: string, over: Partial<DataGridColumn<Row>> = {}) =>
  parseEditorValue(raw, col(over));

const ALL_TYPES: DataGridDataType[] = [
  'string',
  'multiline',
  'integer',
  'decimal',
  'money',
  'percent',
  'boolean',
  'date',
  'datetime',
  'choice',
  'lookup',
  'image',
];

describe('data types — display', () => {
  it('string shows the text as-is', () => {
    expect(show('Widget', { dataType: 'string' })).toBe('Widget');
  });

  it('multiline keeps its line breaks rather than collapsing them', () => {
    // The memo editor relies on the raw text surviving the formatter
    expect(show('one\ntwo', { dataType: 'multiline' })).toBe('one\ntwo');
  });

  it('integer shows no decimal part', () => {
    expect(show(42, { dataType: 'integer' })).toBe('42');
    expect(show(42.7, { dataType: 'integer' })).toBe('43');
  });

  it('decimal shows two places by default', () => {
    expect(show(3.5, { dataType: 'decimal' })).toBe('3.50');
  });

  it('money shows two places and groups thousands', () => {
    expect(show(1234.5, { dataType: 'money' })).toBe('1,234.50');
  });

  it('percent shows one place and carries its sign', () => {
    expect(show(9.14, { dataType: 'percent' })).toBe('9.1%');
  });

  it('an explicit precision overrides the type default', () => {
    expect(show(1.23456, { dataType: 'money', precision: 4 })).toBe('1.2346');
    expect(show(1.9, { dataType: 'money', precision: 0 })).toBe('2');
  });

  it('boolean reads as Yes or No', () => {
    expect(show(true, { dataType: 'boolean' })).toBe('Yes');
    expect(show(false, { dataType: 'boolean' })).toBe('No');
  });

  it('date shows a date with no time', () => {
    const text = show('2024-03-15T13:45:00Z', { dataType: 'date' });
    expect(text).not.toMatch(/:/);
    expect(text).toMatch(/2024/);
  });

  it('datetime shows a time as well', () => {
    expect(show('2024-03-15T13:45:00Z', { dataType: 'datetime' })).toMatch(/:/);
  });

  it('choice shows the option label, not the stored number', () => {
    const choices = [
      { value: 1, label: 'Draft' },
      { value: 2, label: 'Won' },
    ];
    expect(show(2, { dataType: 'choice', choices })).toBe('Won');
  });

  it('choice falls back to the raw value when no option matches', () => {
    expect(show(9, { dataType: 'choice', choices: [{ value: 1, label: 'Draft' }] })).toBe('9');
  });

  it('lookup shows its text', () => {
    expect(show('Contoso Ltd', { dataType: 'lookup' })).toBe('Contoso Ltd');
  });

  it('image formats to nothing', () => {
    // Base64 in a title attribute would put a megabyte in the DOM, and there is
    // nothing meaningful to sort or filter on
    expect(show('data:image/png;base64,AAAA', { dataType: 'image' })).toBe('');
  });

  it('every type renders empty for null and blank', () => {
    for (const dataType of ALL_TYPES) {
      expect(show(null, { dataType })).toBe('');
      expect(show(undefined, { dataType })).toBe('');
      expect(show('', { dataType })).toBe('');
    }
  });

  it('a column format function wins over the type', () => {
    expect(show(5, { dataType: 'money', format: (v) => `~${String(v)}` })).toBe('~5');
  });

  it('an unparseable number falls back to the raw text rather than NaN', () => {
    expect(show('n/a', { dataType: 'money' })).toBe('n/a');
  });

  it('an unparseable date falls back to the raw text', () => {
    expect(show('not-a-date', { dataType: 'date' })).toBe('not-a-date');
  });
});

describe('data types — editing', () => {
  it('integer truncates rather than rounds', () => {
    // Trailing decimals in an integer field are rejected by Dataverse
    expect(parse('42.9', { dataType: 'integer' })).toBe(42);
    expect(parse('-42.9', { dataType: 'integer' })).toBe(-42);
  });

  it('money, decimal and percent come back as numbers', () => {
    expect(parse('1234.56', { dataType: 'money' })).toBe(1234.56);
    expect(parse('3.5', { dataType: 'decimal' })).toBe(3.5);
    expect(parse('9.1', { dataType: 'percent' })).toBe(9.1);
  });

  it('boolean comes back as a boolean, not the string "false"', () => {
    expect(parse('true', { dataType: 'boolean' })).toBe(true);
    expect(parse('false', { dataType: 'boolean' })).toBe(false);
  });

  it('choice comes back as the option value, not the select text', () => {
    const choices = [{ value: 1, label: 'Draft' }];
    expect(parse('1', { dataType: 'choice', choices })).toBe(1);
  });

  it('string and multiline keep whitespace the user typed', () => {
    expect(parse('  padded  ', { dataType: 'string' })).toBe('  padded  ');
    expect(parse('a\nb', { dataType: 'multiline' })).toBe('a\nb');
  });

  it('clearing any type yields null rather than an empty string', () => {
    for (const dataType of ALL_TYPES) {
      expect(parse('   ', { dataType })).toBeNull();
    }
  });
});

describe('data types — alignment', () => {
  it('numbers sit right so their decimal points line up', () => {
    for (const dataType of ['integer', 'decimal', 'money', 'percent'] as const) {
      expect(columnAlign(col({ dataType }))).toBe('right');
    }
  });

  it('booleans and images centre', () => {
    expect(columnAlign(col({ dataType: 'boolean' }))).toBe('center');
    expect(columnAlign(col({ dataType: 'image' }))).toBe('center');
  });

  it('text sits left', () => {
    for (const dataType of ['string', 'multiline', 'choice', 'lookup'] as const) {
      expect(columnAlign(col({ dataType }))).toBe('left');
    }
  });

  it('an explicit align beats the type default', () => {
    expect(columnAlign(col({ dataType: 'money', align: 'left' }))).toBe('left');
  });
});

describe('data types — filling', () => {
  it('lookups and images cannot be dragged down', () => {
    // A lookup carries an id its neighbours' formatted text does not match,
    // and an image is not a value a user means to copy
    for (const dataType of ALL_TYPES) {
      const fillable = isFillable(col({ dataType, editable: true }), true);
      expect(fillable).toBe(!UNFILLABLE_TYPES.has(dataType));
    }
  });

  it('a read-only column never fills', () => {
    expect(isFillable(col({ dataType: 'money' }), true)).toBe(false);
  });

  it('nothing fills when the grid itself is not editable', () => {
    expect(isFillable(col({ dataType: 'money', editable: true }), false)).toBe(false);
  });
});

describe('data types — aggregation', () => {
  it('sums, averages and finds extremes over numbers', () => {
    const values = [1, 2, 3, 4];
    expect(aggregate(values, 'sum')).toBe(10);
    expect(aggregate(values, 'avg')).toBe(2.5);
    expect(aggregate(values, 'min')).toBe(1);
    expect(aggregate(values, 'max')).toBe(4);
  });

  it('counts rows, including ones with no value', () => {
    expect(aggregate([1, null, undefined], 'count')).toBe(3);
  });

  it('ignores values that are not numbers rather than poisoning the total', () => {
    expect(aggregate([1, 'abc', null, 2], 'sum')).toBe(3);
  });

  it('returns null when there is nothing numeric to report', () => {
    expect(aggregate(['a', null], 'sum')).toBeNull();
    expect(aggregate([], 'avg')).toBeNull();
  });
});

describe('roundTo', () => {
  it('clears binary floating point noise', () => {
    expect(roundTo(100 * 1.1, 2)).toBe(110);
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });

  it('rounds half away from zero at the requested place', () => {
    expect(roundTo(2.345, 2)).toBe(2.35);
    expect(roundTo(10 / 3, 4)).toBe(3.3333);
  });
});

describe('type coverage', () => {
  it('lists every type the grid declares', () => {
    // Guards the suite above: a new DataGridDataType must be added here, which
    // forces a decision about how it displays, parses, aligns and fills
    const declared: Record<DataGridDataType, true> = {
      string: true,
      multiline: true,
      integer: true,
      decimal: true,
      money: true,
      percent: true,
      boolean: true,
      date: true,
      datetime: true,
      choice: true,
      lookup: true,
      image: true,
    };
    expect(Object.keys(declared).sort()).toEqual([...ALL_TYPES].sort());
  });
});

// The generic parameter is load-bearing: these helpers must accept any row shape.
const _typeCheck: DataGridColumn<DataGridRow> = { key: 'x' };
void _typeCheck;
