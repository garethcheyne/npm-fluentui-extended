import type {
  DataGridAlign,
  DataGridCellStateStyle,
  DataGridColumn,
  DataGridDataType,
  DataGridRow,
  DataGridRowStateStyle,
  DataGridSummary,
} from './DataGrid.types';

// ─── Value access ────────────────────────────────────────────────────────────

/**
 * Reads a possibly dotted key off a row, so `'product.name'` resolves without
 * an accessor. Returns `undefined` rather than throwing when the path breaks
 * part way — a missing expand is a normal state, not an error.
 */
export function readPath(row: unknown, path: string): unknown {
  if (row == null) return undefined;
  if (!path.includes('.')) return (row as Record<string, unknown>)[path];
  let current: unknown = row;
  for (const segment of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** The value a column shows for a row, honouring a custom accessor. */
export function readColumnValue<T extends DataGridRow>(row: T, column: DataGridColumn<T>): unknown {
  return column.accessor ? column.accessor(row) : readPath(row, column.key);
}

// ─── Data-type behaviour ─────────────────────────────────────────────────────

const NUMERIC_TYPES: ReadonlySet<DataGridDataType> = new Set([
  'integer',
  'decimal',
  'money',
  'percent',
]);

export function isNumericType(dataType: DataGridDataType | undefined): boolean {
  return dataType != null && NUMERIC_TYPES.has(dataType);
}

/** Default alignment: numbers right, booleans centred, everything else left. */
export function defaultAlign(dataType: DataGridDataType | undefined): DataGridAlign {
  if (isNumericType(dataType)) return 'right';
  // Both render a glyph rather than text, and the cell centres it — the header
  // has to agree or it sits off to one side of its own column.
  if (dataType === 'boolean' || dataType === 'image') return 'center';
  return 'left';
}

export function columnAlign<T extends DataGridRow>(column: DataGridColumn<T>): DataGridAlign {
  return column.align ?? defaultAlign(column.dataType);
}

/** Decimal places a type carries when the column does not say. */
function defaultPrecision(dataType: DataGridDataType | undefined): number {
  switch (dataType) {
    case 'money':
    case 'decimal':
      return 2;
    case 'percent':
      return 1;
    default:
      return 0;
  }
}

/** Decimal places a column's values carry, whether shown or written. */
export function columnPrecision<T extends DataGridRow>(column: DataGridColumn<T>): number {
  return column.precision ?? defaultPrecision(column.dataType);
}

/**
 * Rounds to a number of decimal places.
 *
 * Binary floating point cannot hold most decimal fractions, so `100 * 1.1`
 * lands on 110.00000000000001. Display formatting hides it; a value on its way
 * to the record does not get that courtesy.
 */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Coerces to a finite number, or `null`.
 *
 * Empty strings deliberately return `null` rather than `0`: a blank money cell
 * means "not set", and summing it as zero is a different claim from leaving it
 * out of the average.
 */
export function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const parsed = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Coerces Dataverse's several spellings of true to a boolean. */
export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'true' || text === '1' || text === 'yes';
}

/** Parses a date-ish value, returning `null` for anything unusable. */
export function toDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `Date` -> `yyyy-mm-dd` in local time, which is what `<input type="date">` wants. */
export function toDateInputValue(value: unknown): string {
  const date = toDate(value);
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `Date` -> `yyyy-mm-ddThh:mm`, which is what `<input type="datetime-local">` wants. */
export function toDateTimeInputValue(value: unknown): string {
  const date = toDate(value);
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Leading bytes of the formats a Dataverse image column actually returns. */
const BASE64_SIGNATURES: ReadonlyArray<[string, string]> = [
  ['/9j/', 'image/jpeg'],
  ['iVBORw0KGgo', 'image/png'],
  ['R0lGOD', 'image/gif'],
  ['UklGR', 'image/webp'],
  ['PHN2Zw', 'image/svg+xml'],
];

/**
 * Turns whatever an image column holds into something `<img src>` can load.
 *
 * Dataverse returns an image column as bare base64 with no data-URL prefix and
 * no MIME type, so the format is sniffed from the leading bytes — an `<img>`
 * given `data:image/jpeg` for a PNG renders nothing in Safari, and guessing one
 * type for everything is not safe.
 *
 * Returns null for anything unusable, so a caller can draw a placeholder rather
 * than a broken-image icon.
 */
export function toImageSrc(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (text === '') return null;

  // Already addressable: a data URL, an absolute URL, or a site-relative path.
  if (/^(data:|https?:|blob:|\/)/i.test(text)) return text;

  const signature = BASE64_SIGNATURES.find(([prefix]) => text.startsWith(prefix));
  if (signature) return `data:${signature[1]};base64,${text}`;

  // Long and base64-shaped, but of an unrecognised type. A generic image MIME
  // lets the browser sniff it rather than refusing outright.
  if (text.length > 64 && /^[A-Za-z0-9+/]+={0,2}$/.test(text)) {
    return `data:image;base64,${text}`;
  }

  return null;
}

/**
 * Display text for a value, given its column.
 *
 * A column's own `format` wins outright. Otherwise the data type decides, and
 * `null`/`undefined` always render as an empty string rather than as the word
 * "null" — the grid draws its own placeholder for missing values.
 */
export function formatCellValue<T extends DataGridRow>(
  value: unknown,
  column: DataGridColumn<T>,
  row: T,
): string {
  if (column.format) return column.format(value, row);
  if (value == null || value === '') return '';

  switch (column.dataType) {
    // An image has no text to search, sort or filter on, and rendering base64
    // into a title attribute would put a megabyte in the DOM.
    case 'image':
      return '';

    case 'boolean':
      return toBoolean(value) ? 'Yes' : 'No';

    case 'integer':
    case 'decimal':
    case 'money':
    case 'percent': {
      const num = toNumber(value);
      if (num == null) return String(value);
      const digits = column.precision ?? defaultPrecision(column.dataType);
      const text = num.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
      return column.dataType === 'percent' ? `${text}%` : text;
    }

    case 'date': {
      const date = toDate(value);
      return date ? date.toLocaleDateString() : String(value);
    }

    case 'datetime': {
      const date = toDate(value);
      return date ? date.toLocaleString() : String(value);
    }

    case 'choice': {
      const match = column.choices?.find((c) => String(c.value) === String(value));
      return match?.label ?? String(value);
    }

    default:
      return String(value);
  }
}

/**
 * Turns editor output back into a stored value.
 *
 * Editors always hand back strings. Converting here — rather than in each
 * editor — is what keeps `onCellChange` receiving a number for a money column
 * and a boolean for a two-option one, whichever editor produced it.
 */
export function parseEditorValue<T extends DataGridRow>(
  raw: string,
  column: DataGridColumn<T>,
): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  switch (column.dataType) {
    case 'integer': {
      const num = toNumber(trimmed);
      return num == null ? null : Math.trunc(num);
    }
    case 'decimal':
    case 'money':
    case 'percent':
      return toNumber(trimmed);
    case 'boolean':
      return toBoolean(trimmed);
    case 'choice': {
      // Choice values are numeric in Dataverse but arrive from a <select> as
      // text, so hand back the option's own value rather than the string.
      const match = column.choices?.find((c) => String(c.value) === trimmed);
      return match ? match.value : trimmed;
    }
    default:
      return raw;
  }
}

/**
 * Whether an edit actually changes a cell.
 *
 * Blank has several spellings — `null`, `undefined`, `''` — and they all mean
 * the same thing, so clearing a cell that was already empty is not a change.
 * Clearing one that held a value *is*, which the obvious `String(a) === String(b)`
 * test gets wrong: it reads `null` and `''` as equal and quietly throws the
 * clear away, leaving a clear button that appears to do nothing.
 *
 * Consumers deciding whether to stage an edit should use this rather than
 * `Object.is`, which has the opposite failing: it treats `null` and `''` as
 * different and stages a change nobody made.
 */
export function isSameCellValue(a: unknown, b: unknown): boolean {
  const aBlank = a == null || a === '';
  const bBlank = b == null || b === '';
  if (aBlank || bBlank) return aBlank && bBlank;
  if (typeof a === 'number' && typeof b === 'number') return Object.is(a, b);
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a === 'boolean' || typeof b === 'boolean') return toBoolean(a) === toBoolean(b);
  return String(a) === String(b);
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

/** Runs a column's `summary` over a set of raw values. */
export function aggregate(values: unknown[], kind: DataGridSummary): number | null {
  if (kind === 'count') return values.length;
  const numbers = values.map(toNumber).filter((n): n is number => n != null);
  if (numbers.length === 0) return null;
  switch (kind) {
    case 'sum':
      return numbers.reduce((a, b) => a + b, 0);
    case 'avg':
      return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    case 'min':
      return Math.min(...numbers);
    case 'max':
      return Math.max(...numbers);
    default:
      return null;
  }
}

// ─── Row and cell states ─────────────────────────────────────────────────────

/**
 * Joins a row's state names into the one string a row is handed.
 *
 * The unit separator, because it is the one character no state name will ever
 * contain — a space or a comma might.
 */
export const ROW_STATE_SEPARATOR = '';

/** Normalises what `getRowState` returns to a list of names, `default` dropped. */
export function toStateList(value: string | readonly string[] | null | undefined): string[] {
  if (value == null) return [];
  const list = typeof value === 'string' ? [value] : value;
  return list.filter((name) => typeof name === 'string' && name !== '' && name !== 'default');
}

/** Copies only the fields that are actually set, so a gap never erases a layer below. */
function definedFields<S extends object>(style: S | undefined): Partial<S> {
  const out: Partial<S> = {};
  if (!style) return out;
  for (const [key, value] of Object.entries(style)) {
    if (value !== undefined && value !== null && value !== '') {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

/**
 * The look of a row carrying several states, later ones drawn over earlier.
 *
 * Each state is its built-in style with the consumer's override for that name
 * laid over it, so restyling one state leaves the rest alone. A name with no
 * style anywhere is skipped. Returns null when nothing applies.
 */
export function resolveRowStateStyle(
  names: readonly string[],
  builtIn: Readonly<Record<string, DataGridRowStateStyle>>,
  custom?: Readonly<Record<string, DataGridRowStateStyle>>,
): DataGridRowStateStyle | null {
  let merged: DataGridRowStateStyle | null = null;
  for (const name of names) {
    const layer = { ...definedFields(builtIn[name]), ...definedFields(custom?.[name]) };
    if (Object.keys(layer).length === 0) continue;
    merged = { ...(merged ?? {}), ...layer };
  }
  return merged;
}

/** As {@link resolveRowStateStyle}, for the single state a cell carries. */
export function resolveCellStateStyle(
  name: string | null | undefined,
  builtIn: Readonly<Record<string, DataGridCellStateStyle>>,
  custom?: Readonly<Record<string, DataGridCellStateStyle>>,
): DataGridCellStateStyle | null {
  if (!name || name === 'default') return null;
  const style = { ...definedFields(builtIn[name]), ...definedFields(custom?.[name]) };
  return Object.keys(style).length === 0 ? null : style;
}

// ─── Layout persistence ──────────────────────────────────────────────────────

/**
 * Namespaces stored layout by origin as well as by grid.
 *
 * Without the origin, a developer with dev, test and production orgs open in
 * one browser shares one saved layout across all three — and a column that
 * exists in only one of them corrupts the other two.
 */
function originKey(): string {
  if (typeof window === 'undefined') return 'ssr';
  return window.location.origin.replace(/^https?:\/\//, '').replace(/[^a-z0-9]/gi, '_');
}

export function layoutStorageKey(scope: string, facet: string): string {
  return `datagrid:${originKey()}:${scope}:${facet}`;
}

/**
 * Reads stored layout, tolerating anything at all in the slot.
 *
 * Storage can be unavailable (private browsing, a sandboxed iframe with no
 * allow-same-origin), and the stored JSON can be from an older schema. Neither
 * is worth failing a render over, so both fall back to the default.
 */
export function readStored<V>(storage: Storage | null | undefined, key: string, fallback: V): V {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as V;
  } catch {
    return fallback;
  }
}

export function writeStored(storage: Storage | null | undefined, key: string, value: unknown): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage blocked. Layout is a convenience, so losing it
    // is not worth interrupting the user over.
  }
}

export function removeStored(storage: Storage | null | undefined, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // See writeStored.
  }
}

/** `window.localStorage`, or `null` where it is unavailable. */
export function defaultStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Reconciles a stored column order against the columns that exist now.
 *
 * Columns the stored order does not know about are appended where the current
 * definitions put them, and ids that no longer exist are dropped. Without this,
 * adding a column to a config would leave it invisible for every user who had
 * ever reordered the grid.
 */
/**
 * Normalises the several shapes grouping is accepted in to a list.
 *
 * A single key, a list, null and a stored layout written before grouping could
 * nest all have to arrive as the same thing. Blank entries are dropped so a
 * cleared picker does not leave an empty level behind.
 */
export function toGroupList(value: string | string[] | null | undefined): string[] {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter((key): key is string => typeof key === 'string' && key.length > 0);
}

export function mergeColumnOrder(stored: string[], current: string[]): string[] {
  const known = new Set(current);
  const kept = stored.filter((id) => known.has(id));
  const seen = new Set(kept);
  const appended = current.filter((id) => !seen.has(id));
  return [...kept, ...appended];
}

/**
 * Sorts pinned columns to the edges, keeping the given order within each band.
 *
 * Pinning has to beat the stored order rather than merge with it: a column
 * frozen to the left cannot sit in the middle of the scrolling ones, so a
 * dragged position is honoured only against its own band.
 */
export function applyPinOrder<T extends DataGridRow>(
  order: string[],
  columnMap: ReadonlyMap<string, DataGridColumn<T>>,
  reservedIds: readonly string[] = [],
): string[] {
  const reserved = new Set(reservedIds);
  const lead: string[] = [];
  const left: string[] = [];
  const middle: string[] = [];
  const right: string[] = [];

  for (const id of order) {
    if (reserved.has(id)) lead.push(id);
    else {
      const pin = columnMap.get(id)?.pin;
      if (pin === 'left') left.push(id);
      else if (pin === 'right') right.push(id);
      else middle.push(id);
    }
  }

  return [...lead, ...left, ...middle, ...right];
}

/**
 * Where each frozen column sits once the others in front of it are counted.
 *
 * Offsets accumulate inwards from each edge, so the second left-pinned column
 * starts where the first one ends. The reserved checkbox and drag columns
 * freeze too when anything else does — leaving them to scroll away while a
 * pinned column stayed would separate a row from its own checkbox.
 */
export function pinOffsets(
  order: string[],
  widthOf: (id: string) => number,
  pinOf: (id: string) => 'left' | 'right' | undefined,
): Map<string, { side: 'left' | 'right'; offset: number; last: boolean }> {
  const result = new Map<string, { side: 'left' | 'right'; offset: number; last: boolean }>();

  const lefts = order.filter((id) => pinOf(id) === 'left');
  let run = 0;
  lefts.forEach((id, i) => {
    result.set(id, { side: 'left', offset: run, last: i === lefts.length - 1 });
    run += widthOf(id);
  });

  const rights = order.filter((id) => pinOf(id) === 'right');
  run = 0;
  for (let i = rights.length - 1; i >= 0; i -= 1) {
    const id = rights[i];
    result.set(id, { side: 'right', offset: run, last: i === 0 });
    run += widthOf(id);
  }

  return result;
}
