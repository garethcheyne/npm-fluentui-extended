import { toBoolean, toDate, toNumber } from './DataGrid.utils';
import type { DataGridColumn, DataGridDataType, DataGridRow } from './DataGrid.types';

/**
 * Column filters, as Dynamics' own grid offers them: an operator chosen to suit
 * the column's type, and a value.
 *
 * A filter is stored on the TanStack column as either a plain string — what the
 * filter row types, read as "contains" — or a {@link DataGridFilterValue} from
 * the Filter by panel. Both go through {@link matchesFilter}.
 */

export type DataGridFilterOperator =
  | 'eq'
  | 'ne'
  | 'contains'
  | 'notContains'
  | 'beginsWith'
  | 'notBeginsWith'
  | 'endsWith'
  | 'notEndsWith'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'on'
  | 'onOrAfter'
  | 'onOrBefore'
  | 'notNull'
  | 'null';

export interface DataGridFilterValue {
  operator: DataGridFilterOperator;
  /** Absent for the operators that take none — "contains data" and its opposite. */
  value?: string;
}

/** The label Dynamics uses for each operator. */
export const FILTER_OPERATOR_LABELS: Record<DataGridFilterOperator, string> = {
  eq: 'Equals',
  ne: 'Does not equal',
  contains: 'Contains',
  notContains: 'Does not contain',
  beginsWith: 'Begins with',
  notBeginsWith: 'Does not begin with',
  endsWith: 'Ends with',
  notEndsWith: 'Does not end with',
  gt: 'Greater than',
  ge: 'Greater than or equal to',
  lt: 'Less than',
  le: 'Less than or equal to',
  on: 'On',
  onOrAfter: 'On or after',
  onOrBefore: 'On or before',
  notNull: 'Contains data',
  null: 'Does not contain data',
};

/** Operators that need no value. */
export const VALUELESS_OPERATORS: ReadonlySet<DataGridFilterOperator> = new Set(['notNull', 'null']);

export type FilterKind = 'text' | 'number' | 'date' | 'boolean' | 'choice';

/** How a column of a given type is filtered. */
export function filterKindOf(dataType: DataGridDataType | undefined): FilterKind {
  switch (dataType) {
    case 'integer':
    case 'decimal':
    case 'money':
    case 'percent':
      return 'number';
    case 'date':
    case 'datetime':
      return 'date';
    case 'boolean':
      return 'boolean';
    case 'choice':
      return 'choice';
    default:
      return 'text';
  }
}

const OPERATORS_BY_KIND: Record<FilterKind, DataGridFilterOperator[]> = {
  text: [
    'eq', 'ne', 'contains', 'notContains', 'beginsWith', 'notBeginsWith',
    'endsWith', 'notEndsWith', 'notNull', 'null',
  ],
  number: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'notNull', 'null'],
  date: ['on', 'onOrAfter', 'onOrBefore', 'notNull', 'null'],
  boolean: ['eq', 'notNull', 'null'],
  choice: ['eq', 'ne', 'notNull', 'null'],
};

/** The operators offered for a column, in the order Dynamics lists them. */
export function filterOperatorsFor(dataType: DataGridDataType | undefined): DataGridFilterOperator[] {
  return OPERATORS_BY_KIND[filterKindOf(dataType)];
}

/**
 * The operator a new filter starts on. "Contains" for text, because a partial
 * name is what people type; equality for everything else.
 */
export function defaultFilterOperator(dataType: DataGridDataType | undefined): DataGridFilterOperator {
  const kind = filterKindOf(dataType);
  if (kind === 'text') return 'contains';
  if (kind === 'date') return 'on';
  return 'eq';
}

/** A stored filter in its structured form; a plain string is the filter row's "contains". */
export function toFilterValue(stored: unknown): DataGridFilterValue | null {
  if (stored == null || stored === '') return null;
  if (typeof stored === 'string') return { operator: 'contains', value: stored };
  if (typeof stored === 'object' && 'operator' in stored) return stored as DataGridFilterValue;
  return null;
}

/** Whether a filter does anything — an operator that needs a value and has none does not. */
export function isActiveFilter(filter: DataGridFilterValue | null): filter is DataGridFilterValue {
  if (!filter) return false;
  if (VALUELESS_OPERATORS.has(filter.operator)) return true;
  return String(filter.value ?? '').trim() !== '';
}

/** Lenient number parsing, so "1,250" and "$1,250" read as 1250. */
function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[\s,$%]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** A date as its local calendar day, `YYYY-MM-DD`, so times within a day compare equal. */
function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Whether a cell passes a column's filter.
 *
 * Text is compared against what the cell shows, not what it stores, so a money
 * column matches "1,250.00" and a lookup matches its name — `shownText` gives
 * that, and is only called when a text comparison needs it. Numbers, dates,
 * booleans and choices compare on the stored value.
 */
export function matchesFilter<T extends DataGridRow>(
  raw: unknown,
  column: DataGridColumn<T>,
  shownText: () => string,
  stored: unknown,
): boolean {
  const filter = toFilterValue(stored);
  if (!isActiveFilter(filter)) return true;

  const empty = raw == null || raw === '';
  if (filter.operator === 'null') return empty;
  if (filter.operator === 'notNull') return !empty;

  const value = String(filter.value ?? '').trim();
  const kind = filterKindOf(column.dataType);

  if (kind === 'number') {
    const target = parseNumber(value);
    const n = toNumber(raw);
    if (target == null) return true;
    if (n == null) return filter.operator === 'ne';
    switch (filter.operator) {
      case 'eq': return n === target;
      case 'ne': return n !== target;
      case 'gt': return n > target;
      case 'ge': return n >= target;
      case 'lt': return n < target;
      case 'le': return n <= target;
      default: break;
    }
  }

  if (kind === 'date') {
    const date = toDate(raw);
    if (!date) return false;
    const day = dayKey(date);
    switch (filter.operator) {
      case 'on': return day === value;
      case 'onOrAfter': return day >= value;
      case 'onOrBefore': return day <= value;
      default: break;
    }
  }

  if (kind === 'boolean') {
    return toBoolean(raw) === (value === 'true');
  }

  if (kind === 'choice' && (filter.operator === 'eq' || filter.operator === 'ne')) {
    const same = String(raw) === value;
    return filter.operator === 'eq' ? same : !same;
  }

  // Text, and any operator above that fell through.
  const shown = shownText().toLowerCase();
  const needle = value.toLowerCase();
  switch (filter.operator) {
    case 'eq': return shown === needle;
    case 'ne': return shown !== needle;
    case 'contains': return shown.includes(needle);
    case 'notContains': return !shown.includes(needle);
    case 'beginsWith': return shown.startsWith(needle);
    case 'notBeginsWith': return !shown.startsWith(needle);
    case 'endsWith': return shown.endsWith(needle);
    case 'notEndsWith': return !shown.endsWith(needle);
    default: return shown.includes(needle);
  }
}
