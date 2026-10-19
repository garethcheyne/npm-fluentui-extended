import { describe, it, expect } from 'vitest';
import {
  aggregate,
  columnAlign,
  formatCellValue,
  mergeColumnOrder,
  parseEditorValue,
  readPath,
  toBoolean,
  toDate,
  toNumber,
} from './DataGrid.utils';
import type { DataGridColumn } from './DataGrid.types';

type Row = Record<string, unknown>;

const money: DataGridColumn<Row> = { key: 'price', dataType: 'money' };
const choice: DataGridColumn<Row> = {
  key: 'status',
  dataType: 'choice',
  choices: [
    { value: 1, label: 'Draft' },
    { value: 2, label: 'Active' },
  ],
};

describe('readPath', () => {
  it('reads a plain key', () => {
    expect(readPath({ name: 'Contoso' }, 'name')).toBe('Contoso');
  });

  it('walks a dotted path into an expanded record', () => {
    expect(readPath({ product: { name: 'Widget' } }, 'product.name')).toBe('Widget');
  });

  it('returns undefined rather than throwing when the path breaks', () => {
    // A missing $expand is a normal state, not an error worth failing a render over
    expect(readPath({ product: null }, 'product.name')).toBeUndefined();
    expect(readPath(null, 'product.name')).toBeUndefined();
  });
});

describe('toNumber', () => {
  it('treats an empty value as unset rather than as zero', () => {
    // Summing a blank money cell as zero is a different claim from omitting it
    expect(toNumber('')).toBeNull();
    expect(toNumber(null)).toBeNull();
  });

  it('strips currency formatting', () => {
    expect(toNumber('$1,250.50')).toBe(1250.5);
  });

  it('rejects text that is not a number', () => {
    expect(toNumber('n/a')).toBeNull();
  });
});

describe('toBoolean', () => {
  it('accepts the several spellings Dataverse returns', () => {
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean('true')).toBe(true);
    expect(toBoolean('Yes')).toBe(true);
    expect(toBoolean(1)).toBe(true);
    expect(toBoolean('false')).toBe(false);
    expect(toBoolean(null)).toBe(false);
  });
});

describe('toDate', () => {
  it('returns null for an unparseable value instead of an Invalid Date', () => {
    expect(toDate('not a date')).toBeNull();
    expect(toDate('')).toBeNull();
  });
});

describe('formatCellValue', () => {
  it('formats money to two places by default', () => {
    expect(formatCellValue(1250.5, money, {})).toBe('1,250.50');
  });

  it('resolves a choice to its label', () => {
    expect(formatCellValue(2, choice, {})).toBe('Active');
  });

  it('falls back to the raw value for an unknown choice', () => {
    expect(formatCellValue(99, choice, {})).toBe('99');
  });

  it('renders null as empty, so the grid can draw its own placeholder', () => {
    expect(formatCellValue(null, money, {})).toBe('');
  });

  it('lets a column formatter win outright', () => {
    const column: DataGridColumn<Row> = {
      key: 'price',
      dataType: 'money',
      format: () => 'POA',
    };
    expect(formatCellValue(10, column, {})).toBe('POA');
  });
});

describe('parseEditorValue', () => {
  it('hands back a number for a numeric column', () => {
    expect(parseEditorValue('1250.5', money)).toBe(1250.5);
  });

  it('truncates for an integer column', () => {
    expect(parseEditorValue('7.9', { key: 'qty', dataType: 'integer' })).toBe(7);
  });

  it('hands back the option value, not the string the select produced', () => {
    expect(parseEditorValue('2', choice)).toBe(2);
  });

  it('treats a cleared editor as null rather than as an empty string', () => {
    expect(parseEditorValue('   ', money)).toBeNull();
  });
});

describe('aggregate', () => {
  it('sums, skipping unset values', () => {
    expect(aggregate([10, null, 20, ''], 'sum')).toBe(30);
  });

  it('averages over the values present, not over every row', () => {
    expect(aggregate([10, null, 20], 'avg')).toBe(15);
  });

  it('counts every row, including the unset ones', () => {
    expect(aggregate([10, null, 20], 'count')).toBe(3);
  });

  it('returns null when nothing is numeric', () => {
    expect(aggregate([null, ''], 'sum')).toBeNull();
  });
});

describe('columnAlign', () => {
  it('right-aligns numbers and centres booleans by default', () => {
    expect(columnAlign({ key: 'a', dataType: 'money' })).toBe('right');
    expect(columnAlign({ key: 'b', dataType: 'boolean' })).toBe('center');
    expect(columnAlign({ key: 'c', dataType: 'string' })).toBe('left');
  });

  it('lets an explicit alignment win', () => {
    expect(columnAlign({ key: 'a', dataType: 'money', align: 'left' })).toBe('left');
  });
});

describe('mergeColumnOrder', () => {
  it('appends columns the stored order has never seen', () => {
    // Otherwise a newly added column stays invisible for every user who has
    // ever reordered the grid
    expect(mergeColumnOrder(['b', 'a'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c']);
  });

  it('drops ids for columns that no longer exist', () => {
    expect(mergeColumnOrder(['b', 'gone', 'a'], ['a', 'b'])).toEqual(['b', 'a']);
  });

  it('keeps the stored order when nothing has changed', () => {
    expect(mergeColumnOrder(['b', 'a'], ['a', 'b'])).toEqual(['b', 'a']);
  });
});
