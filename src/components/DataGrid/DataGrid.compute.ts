import type { DataGridColumn, DataGridComputeContext, DataGridRow } from './DataGrid.types';
import { columnPrecision, readColumnValue, roundTo, toNumber } from './DataGrid.utils';

/**
 * Resolves a column's value, running any calculation against *effective*
 * values rather than stored ones.
 *
 * The distinction is the whole point. A margin column reading `row.sellEx`
 * directly reports the saved price, so typing a new price leaves the margin
 * stale until a round trip. Calculations therefore read through the same
 * layering the cells do, and a grid holding unsaved edits recalculates as
 * the user types.
 */
export function resolveCellValue<T extends DataGridRow>(
  row: T,
  columnKey: string,
  rowId: string,
  columnMap: ReadonlyMap<string, DataGridColumn<T>>,
  overlay?: (row: T, key: string, rowId: string, base: unknown) => unknown,
  /** Columns already being resolved on this path, to stop a cycle recursing forever. */
  visiting?: ReadonlySet<string>,
): unknown {
  const column = columnMap.get(columnKey);
  if (!column) return overlay ? overlay(row, columnKey, rowId, undefined) : undefined;

  if (column.computed) {
    // A calculation that reaches back to its own column — directly or through
    // another calculation — would recurse until the stack gives out.
    if (visiting?.has(columnKey)) return undefined;
    const path = new Set(visiting ?? []);
    path.add(columnKey);

    const get = (key: string) => resolveCellValue(row, key, rowId, columnMap, overlay, path);
    const ctx: DataGridComputeContext<T> = {
      row,
      rowId,
      column,
      get,
      num: (key) => toNumber(get(key)) ?? 0,
    };
    // The calculation is the value, and the overlay deliberately does not get
    // to override it. A persisted calculated column is staged for saving, and
    // letting that staged copy win would freeze the cell at whatever it read
    // when it was first written while its inputs carried on moving.
    return column.computed.value(ctx);
  }

  const base = readColumnValue(row, column);
  return overlay ? overlay(row, columnKey, rowId, base) : base;
}

/**
 * The writes a single cell edit implies.
 *
 * Editing a plain field can move calculated fields that are persisted, and
 * editing a calculated field can push values back into the fields it derives
 * from — a GP% column that sets the sell price. Both are returned as one patch
 * so the consumer stages a single coherent change.
 */
export function computeEditPatch<T extends DataGridRow>(
  row: T,
  rowId: string,
  columnKey: string,
  nextValue: unknown,
  columns: readonly DataGridColumn<T>[],
  columnMap: ReadonlyMap<string, DataGridColumn<T>>,
  overlay?: (row: T, key: string, rowId: string, base: unknown) => unknown,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const edited = columnMap.get(columnKey);

  // Values the cascade should see: the row as it stands, plus this edit.
  const staged = (r: T, key: string, id: string, base: unknown): unknown => {
    if (key === columnKey && id === rowId) return nextValue;
    const layered = overlay ? overlay(r, key, id, base) : base;
    return patch[key] !== undefined && id === rowId ? patch[key] : layered;
  };

  if (edited?.computed?.onEdit) {
    // A calculated column that writes back: the column itself usually is not
    // stored, so what lands on the record is whatever onEdit hands back.
    const back = edited.computed.onEdit(nextValue, {
      row,
      rowId,
      column: edited,
      get: (key) => resolveCellValue(row, key, rowId, columnMap, staged),
      num: (key) => toNumber(resolveCellValue(row, key, rowId, columnMap, staged)) ?? 0,
    });
    if (back) Object.assign(patch, back);
  } else if (!edited?.computed || edited.computed.persist) {
    patch[edited?.computed?.persistAs ?? columnKey] = nextValue;
  }

  for (const column of columns) {
    if (!column.computed?.persist || column.key === columnKey) continue;
    const value = resolveCellValue(row, column.key, rowId, columnMap, staged);
    patch[column.computed.persistAs ?? column.key] = roundPersisted(value, column);
  }

  return patch;
}

/** Numbers on their way to a record are rounded to the precision they display at. */
function roundPersisted<T extends DataGridRow>(value: unknown, column: DataGridColumn<T>): unknown {
  return typeof value === 'number' && Number.isFinite(value)
    ? roundTo(value, columnPrecision(column))
    : value;
}

/** The subset of a TanStack row the group-path walk needs. */
export interface GroupPathRow {
  id: string;
  depth: number;
  getIsGrouped: () => boolean;
  groupingColumnId?: string;
  groupingValue?: unknown;
}

export type GroupPath = Array<{ columnKey: string; value: unknown }>;

/**
 * The group values each row sits under, outermost first, keyed by row id.
 *
 * Covers group rows as well as data rows, which is what lets a drop on either
 * report where it landed. Walked from the model rather than read back off each
 * row's own values, so a band with no rows in it still has a path.
 */
export function groupPaths<R extends GroupPathRow>(modelRows: readonly R[]): Map<string, GroupPath> {
  const paths = new Map<string, GroupPath>();
  const stack: GroupPath = [];
  for (const row of modelRows) {
    if (row.getIsGrouped()) {
      stack.length = Math.min(stack.length, row.depth);
      stack.push({ columnKey: row.groupingColumnId ?? '', value: row.groupingValue });
      paths.set(row.id, [...stack]);
    } else {
      paths.set(row.id, [...stack]);
    }
  }
  return paths;
}

/** The subset of a TanStack row the display walk needs. */
export interface DisplayWalkRow {
  id: string;
  depth: number;
  getIsGrouped: () => boolean;
  getIsExpanded: () => boolean;
}

/**
 * Interleaves group banners, data rows and subtotals into one flat list.
 *
 * The virtualiser measures a single sequence, so the three kinds have to be
 * woven together before it sees them.
 *
 * Open groups are a stack rather than one slot, which is what makes nesting
 * work: a band starting at depth 1 ends every deeper band still open beneath
 * it, and their subtotals emit innermost-first so each total sits directly
 * under the rows it covers.
 *
 * The expanded row model already returns each group followed by its visible
 * children, so this only inserts subtotals — reading `subRows` as well would
 * render every row twice.
 */
export function buildDisplayItems<R extends DisplayWalkRow>(
  modelRows: R[],
  grouped: boolean,
  hasSubtotals: boolean,
  subtotalLevels: 'all' | 'innermost' = 'all',
): Array<{ type: 'group' | 'row' | 'subtotal'; key: string; row: R }> {
  if (!grouped) return modelRows.map((row) => ({ type: 'row' as const, key: row.id, row }));

  const items: Array<{ type: 'group' | 'row' | 'subtotal'; key: string; row: R }> = [];
  // `nested` marks a band that had another band open inside it, which is what
  // makes it an outer level rather than one holding rows of its own.
  const open: Array<{ row: R; nested: boolean }> = [];

  const closeTo = (depth: number) => {
    while (open.length > depth) {
      const entry = open.pop();
      if (!entry || !hasSubtotals || !entry.row.getIsExpanded()) continue;
      if (subtotalLevels === 'innermost' && entry.nested) continue;
      items.push({ type: 'subtotal', key: `s:${entry.row.id}`, row: entry.row });
    }
  };

  for (const row of modelRows) {
    if (row.getIsGrouped()) {
      closeTo(row.depth);
      const parent = open[open.length - 1];
      if (parent) parent.nested = true;
      items.push({ type: 'group', key: `g:${row.id}`, row });
      open.push({ row, nested: false });
    } else {
      items.push({ type: 'row', key: row.id, row });
    }
  }
  closeTo(0);

  return items;
}
