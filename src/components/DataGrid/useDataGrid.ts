import * as React from 'react';
import {
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnSizingState,
  type ExpandedState,
  type GroupingState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  DEFAULT_COLUMN_WIDTH,
  DENSITY_METRICS,
  DRAG_COLUMN_ID,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  SELECT_COLUMN_ID,
} from './DataGrid.tokens';
import {
  applyPinOrder,
  defaultStorage,
  formatCellValue,
  layoutStorageKey,
  mergeColumnOrder,
  readStored,
  removeStored,
  toGroupList,
  writeStored,
} from './DataGrid.utils';
import { resolveCellValue } from './DataGrid.compute';
import type {
  DataGridColumn,
  DataGridDensity,
  DataGridLayout,
  DataGridRow,
  UseDataGridOptions,
  UseDataGridResult,
} from './DataGrid.types';

const ALL_FACETS = ['order', 'sizing', 'visibility', 'density', 'sorting', 'grouping'] as const;
type Facet = (typeof ALL_FACETS)[number];

/**
 * A piece of grid state that restores from storage on mount and writes back on
 * change.
 *
 * The initial read runs inside the `useState` initialiser rather than in an
 * effect, so the first paint is already the restored layout. Restoring in an
 * effect makes the grid visibly reflow one frame after it appears.
 *
 * A change of key — a grid whose `persist.scope` follows the record type it is
 * showing — reloads from the new key during render, for the same reason. The
 * write that change would otherwise trigger is skipped: it would copy the old
 * scope's layout over whatever the new scope had saved.
 */
function usePersistedState<V>(
  enabled: boolean,
  storage: Storage | null,
  key: string,
  initial: V,
  hydrate?: (stored: V) => V,
): [V, React.Dispatch<React.SetStateAction<V>>] {
  const load = (from: string): V => {
    if (!enabled) return initial;
    const stored = readStored<V | null>(storage, from, null);
    if (stored == null) return initial;
    return hydrate ? hydrate(stored) : stored;
  };

  const [value, setValue] = React.useState<V>(() => load(key));
  const [loadedKey, setLoadedKey] = React.useState(key);

  // Skips the write the mount would otherwise do, which would persist the
  // defaults over a layout the user has not touched yet — and, after a key
  // change, the write that would copy the old layout into the new key.
  const skipWriteFor = React.useRef<string | null>(key);

  if (loadedKey !== key) {
    skipWriteFor.current = key;
    setLoadedKey(key);
    setValue(load(key));
  }

  React.useEffect(() => {
    if (!enabled) return;
    if (skipWriteFor.current === key) {
      skipWriteFor.current = null;
      return;
    }
    writeStored(storage, key, value);
  }, [enabled, storage, key, value]);

  return [value, setValue];
}

/**
 * Owns every piece of grid state — column layout, sorting, filtering, grouping,
 * selection, density — and builds the TanStack table from it.
 *
 * Exported so a consumer who needs a render the shipped `DataGrid` does not
 * offer can keep the state machine and write their own markup, instead of
 * forking the component.
 */
export function useDataGrid<T extends DataGridRow>(
  options: UseDataGridOptions<T>,
): UseDataGridResult<T> {
  const {
    data,
    columns,
    getRowId,
    getCellValue,
    selectable = false,
    selectedRowIds: controlledSelection,
    onSelectionChange,
    defaultSorting,
    onSortingChange,
    globalFilter,
    searchColumns,
    groupBy: controlledGroupBy,
    defaultGroupBy = null,
    onGroupByChange,
    density: controlledDensity,
    defaultDensity = 'comfortable',
    onDensityChange,
    persist,
    columnVisibility: controlledVisibility,
    onColumnVisibilityChange,
    forceHiddenColumns,
    rowDragEnabled = false,
    tanstack,
  } = options;

  const storage = persist ? (persist.storage === undefined ? defaultStorage() : persist.storage) : null;
  const facets = React.useMemo(
    () => new Set<Facet>(persist?.facets ?? ALL_FACETS),
    [persist?.facets],
  );
  const on = (facet: Facet) => Boolean(persist) && facets.has(facet);
  const scope = persist?.scope;
  const keyFor = React.useCallback(
    (facet: Facet) => (scope ? layoutStorageKey(scope, facet) : facet),
    [scope],
  );

  const visibleColumns = React.useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  const columnMap = React.useMemo(() => {
    const map = new Map<string, DataGridColumn<T>>();
    for (const column of visibleColumns) map.set(column.key, column);
    return map;
  }, [visibleColumns]);

  const readValue = React.useCallback(
    (row: T, columnKey: string, rowId: string): unknown =>
      resolveCellValue(row, columnKey, rowId, columnMap, getCellValue),
    [getCellValue, columnMap],
  );

  const rowIdOf = React.useCallback(
    (row: T, index: number): string => (getRowId ? getRowId(row, index) : String(index)),
    [getRowId],
  );

  /**
   * Row object to row id.
   *
   * `accessorFn` is handed the row but not its index, and it runs once per cell
   * per render — so resolving the index by searching `data` would make sorting a
   * ten-thousand-row grid quadratic. This costs one pass per data change instead.
   */
  const rowIdByRow = React.useMemo(() => {
    const map = new Map<T, string>();
    data.forEach((row, index) => map.set(row, rowIdOf(row, index)));
    return map;
  }, [data, rowIdOf]);

  // ── Column definitions ────────────────────────────────────────────────────

  const columnDefs = React.useMemo<ColumnDef<T, unknown>[]>(() => {
    const defs: ColumnDef<T, unknown>[] = [];

    // The reserved columns carry no value of their own — the body renders their
    // contents directly — but they must exist as columns so they take part in
    // sizing, ordering and the header row's colSpan arithmetic.
    if (rowDragEnabled) {
      defs.push({
        id: DRAG_COLUMN_ID,
        header: '',
        size: 24,
        minSize: 24,
        maxSize: 24,
        enableSorting: false,
        enableColumnFilter: false,
        enableGrouping: false,
        enableResizing: false,
        enableHiding: false,
      });
    }

    if (selectable) {
      defs.push({
        id: SELECT_COLUMN_ID,
        header: '',
        size: 32,
        minSize: 32,
        maxSize: 32,
        enableSorting: false,
        enableColumnFilter: false,
        enableGrouping: false,
        enableResizing: false,
        enableHiding: false,
      });
    }

    for (const column of visibleColumns) {
      defs.push({
        id: column.key,
        header: column.label ?? column.key,
        // TanStack sorts, filters and groups on this, so it has to be the
        // effective value — not the stored one — or a grid showing unsaved edits
        // would sort by what the server last returned.
        accessorFn: (row: T) => readValue(row, column.key, rowIdByRow.get(row) ?? ''),
        size: column.width ?? DEFAULT_COLUMN_WIDTH,
        minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
        maxSize: column.maxWidth ?? MAX_COLUMN_WIDTH,
        enableSorting: column.sortable !== false,
        // TanStack descends first on numeric columns. Every D365 grid ascends
        // first whatever the type, and a column that jumps to its largest value
        // on the first click reads as a bug.
        sortDescFirst: false,
        enableColumnFilter: column.filterable !== false,
        enableGrouping: column.groupable === true,
        enableResizing: column.resizable !== false,
        enableHiding: true,
        // Filtering compares against what the user can see, so "1,250" matches a
        // money column that stores 1250 and a choice column matches its label.
        filterFn: (row, columnId, filterValue) => {
          const needle = String(filterValue ?? '').trim().toLowerCase();
          if (!needle) return true;
          const raw = row.getValue(columnId);
          return formatCellValue(raw, column, row.original).toLowerCase().includes(needle);
        },
        // Last, so a consumer reaching for TanStack directly can override any
        // of the defaults above rather than being boxed in by them.
        ...column.tanstack,
      });
    }

    return defs;
  }, [visibleColumns, readValue, rowIdByRow, rowDragEnabled, selectable]);

  // Reserved ids always lead, whatever a stored order says — a checkbox column
  // dragged into the middle of the grid is not a layout anyone wants restored.
  const defaultOrder = React.useMemo(
    () => [DRAG_COLUMN_ID, SELECT_COLUMN_ID, ...visibleColumns.map((c) => c.key)],
    [visibleColumns],
  );

  const defaultVisibility = React.useMemo<VisibilityState>(() => {
    const state: VisibilityState = {};
    for (const column of visibleColumns) {
      if (column.defaultVisible === false) state[column.key] = false;
    }
    return state;
  }, [visibleColumns]);

  // ── State ─────────────────────────────────────────────────────────────────

  const [columnOrder, setColumnOrder] = usePersistedState<ColumnOrderState>(
    on('order'),
    storage,
    keyFor('order'),
    defaultOrder,
    (stored) => mergeColumnOrder(stored, defaultOrder),
  );

  // A column added to the config after a layout was stored would otherwise
  // never appear, because the stored order does not mention it.
  React.useEffect(() => {
    setColumnOrder((current) => {
      const merged = mergeColumnOrder(current, defaultOrder);
      return merged.length === current.length && merged.every((id, i) => id === current[i])
        ? current
        : merged;
    });
  }, [defaultOrder, setColumnOrder]);

  const [columnSizing, setColumnSizing] = usePersistedState<ColumnSizingState>(
    on('sizing'),
    storage,
    keyFor('sizing'),
    {},
  );

  const [storedVisibility, setStoredVisibility] = usePersistedState<VisibilityState>(
    on('visibility'),
    storage,
    keyFor('visibility'),
    defaultVisibility,
  );
  const columnVisibility = controlledVisibility ?? storedVisibility;

  const visibilityRef = React.useRef(columnVisibility);
  visibilityRef.current = columnVisibility;

  /**
   * Updates visibility from the user's own choices, never from what is on screen.
   *
   * TanStack hands its updaters whatever this passes as the old state, so this
   * resolves them against the stored visibility. Resolving against the table's
   * state instead would write forced-hidden and grouped columns back as hidden
   * by choice, and they would stay hidden once the reason had gone.
   */
  const setColumnVisibility = React.useCallback<React.Dispatch<React.SetStateAction<VisibilityState>>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(visibilityRef.current) : updater;
      visibilityRef.current = next;
      if (controlledVisibility === undefined) setStoredVisibility(next);
      onColumnVisibilityChange?.(next);
    },
    [controlledVisibility, setStoredVisibility, onColumnVisibilityChange],
  );

  const [sorting, setSorting] = usePersistedState<SortingState>(
    on('sorting'),
    storage,
    keyFor('sorting'),
    defaultSorting ?? [],
  );

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [expanded, setExpanded] = React.useState<ExpandedState>(true);

  const [uncontrolledDensity, setUncontrolledDensity] = usePersistedState<DataGridDensity>(
    on('density'),
    storage,
    keyFor('density'),
    defaultDensity,
  );
  const density = controlledDensity ?? uncontrolledDensity;
  const setDensity = React.useCallback(
    (next: DataGridDensity) => {
      if (controlledDensity === undefined) setUncontrolledDensity(next);
      onDensityChange?.(next);
    },
    [controlledDensity, setUncontrolledDensity, onDensityChange],
  );

  const [uncontrolledGroupBy, setUncontrolledGroupBy] = usePersistedState<string[]>(
    on('grouping'),
    storage,
    keyFor('grouping'),
    toGroupList(defaultGroupBy),
    // Stored layouts predate nesting and hold a bare string or null.
    (stored) => toGroupList(stored as string | string[] | null),
  );
  const groupBy = React.useMemo(
    () => toGroupList(controlledGroupBy === undefined ? uncontrolledGroupBy : controlledGroupBy),
    [controlledGroupBy, uncontrolledGroupBy],
  );
  const setGroupBy = React.useCallback(
    (next: string | string[] | null) => {
      const list = toGroupList(next);
      if (controlledGroupBy === undefined) setUncontrolledGroupBy(list);
      onGroupByChange?.(list);
    },
    [controlledGroupBy, setUncontrolledGroupBy, onGroupByChange],
  );

  const [uncontrolledSelection, setUncontrolledSelection] = React.useState<Set<string>>(
    () => new Set(),
  );
  const selectedRowIds = React.useMemo(() => {
    if (controlledSelection === undefined) return uncontrolledSelection;
    return controlledSelection instanceof Set ? controlledSelection : new Set(controlledSelection);
  }, [controlledSelection, uncontrolledSelection]);

  const setSelectedRowIds = React.useCallback(
    (next: Set<string>) => {
      if (controlledSelection === undefined) setUncontrolledSelection(next);
      onSelectionChange?.(next);
    },
    [controlledSelection, onSelectionChange],
  );

  // ── Table ─────────────────────────────────────────────────────────────────

  const grouping = React.useMemo<GroupingState>(() => groupBy, [groupBy]);

  /**
   * The search, scoped to the columns worth searching.
   *
   * Compares against what the cell displays rather than what it stores, so
   * "Active" matches a choice column holding `2` and "1,250" matches a money
   * column holding `1250`. Matching the raw value instead makes the box useless
   * on exactly the columns people search hardest.
   *
   * TanStack calls a global filter once per column per row, so this returns as
   * soon as a column is not in scope rather than formatting a value it is about
   * to discard.
   */
  const searchScope = React.useMemo(
    () => (searchColumns && searchColumns.length > 0 ? new Set(searchColumns) : null),
    [searchColumns],
  );

  const searchFn = React.useCallback(
    (row: { getValue: (id: string) => unknown; original: T }, columnId: string, value: unknown) => {
      if (searchScope && !searchScope.has(columnId)) return false;
      const needle = String(value ?? '').trim().toLowerCase();
      if (!needle) return true;
      const column = columnMap.get(columnId);
      if (!column) return false;
      return formatCellValue(row.getValue(columnId), column, row.original)
        .toLowerCase()
        .includes(needle);
    },
    [searchScope, columnMap],
  );

  // Joined so a consumer passing a fresh array each render does not rebuild the
  // table state every time.
  const forceHiddenKey = (forceHiddenColumns ?? []).join('');

  // A grouped column is hidden as a column of its own: its value is already in
  // the banner above every group, so a column repeating it wastes width. Forced
  // columns are layered on here too, never into the stored state, so lifting the
  // force brings back exactly what was showing before.
  const effectiveVisibility = React.useMemo<VisibilityState>(() => {
    const forced = forceHiddenKey === '' ? [] : forceHiddenKey.split('');
    if (groupBy.length === 0 && forced.length === 0) return columnVisibility;
    const next = { ...columnVisibility };
    for (const key of groupBy) next[key] = false;
    for (const key of forced) next[key] = false;
    return next;
  }, [columnVisibility, groupBy, forceHiddenKey]);

  // Pinning outranks the stored order, but is applied on the way to the table
  // rather than folded into it — unpinning a column then restores where the
  // user had dragged it.
  const effectiveOrder = React.useMemo(
    () => applyPinOrder(columnOrder, columnMap, [DRAG_COLUMN_ID, SELECT_COLUMN_ID]),
    [columnOrder, columnMap],
  );

  const handleSortingChange = React.useCallback(
    (updater: React.SetStateAction<SortingState>) => {
      setSorting((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        onSortingChange?.(next);
        return next;
      });
    },
    [setSorting, onSortingChange],
  );

  const table = useReactTable<T>({
    data,
    columns: columnDefs,
    state: {
      columnOrder: effectiveOrder,
      columnSizing,
      columnVisibility: effectiveVisibility,
      columnFilters,
      sorting,
      grouping,
      expanded,
      globalFilter,
    },
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: handleSortingChange,
    onExpandedChange: setExpanded,
    onGroupingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(grouping) : updater;
      setGroupBy(next);
    },
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableGrouping: true,
    groupedColumnMode: false,
    // Rows arriving from a query would otherwise reset `expanded` to {}, so
    // every group collapses the moment the data loads.
    autoResetExpanded: false,
    globalFilterFn: searchFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: rowIdOf,
    ...tanstack,
  });

  // ── Selection helpers ─────────────────────────────────────────────────────

  const toggleRowSelected = React.useCallback(
    (rowId: string, additive = true) => {
      const next = additive ? new Set(selectedRowIds) : new Set<string>();
      if (additive && selectedRowIds.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      setSelectedRowIds(next);
    },
    [selectedRowIds, setSelectedRowIds],
  );

  const toggleAllSelected = React.useCallback(() => {
    const ids = table
      .getRowModel()
      .rows.filter((r) => !r.getIsGrouped())
      .map((r) => r.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedRowIds.has(id));
    setSelectedRowIds(allSelected ? new Set() : new Set(ids));
  }, [table, selectedRowIds, setSelectedRowIds]);

  // ── Layout resets ─────────────────────────────────────────────────────────

  const resetColumnWidths = React.useCallback(() => setColumnSizing({}), [setColumnSizing]);

  const resetLayout = React.useCallback(() => {
    setColumnOrder(defaultOrder);
    setColumnSizing({});
    setColumnVisibility(defaultVisibility);
    setSorting(defaultSorting ?? []);
    setColumnFilters([]);
    if (controlledDensity === undefined) setUncontrolledDensity(defaultDensity);
    if (persist) for (const facet of ALL_FACETS) removeStored(storage, keyFor(facet));
  }, [
    setColumnOrder,
    defaultOrder,
    setColumnSizing,
    setColumnVisibility,
    defaultVisibility,
    setSorting,
    defaultSorting,
    controlledDensity,
    setUncontrolledDensity,
    defaultDensity,
    persist,
    storage,
    keyFor,
  ]);

  const getLayout = React.useCallback(
    (): DataGridLayout => ({
      order: columnOrder.filter((id) => id !== DRAG_COLUMN_ID && id !== SELECT_COLUMN_ID),
      sizing: { ...columnSizing },
      visibility: { ...columnVisibility },
      density,
      sorting: [...sorting],
      grouping: [...groupBy],
    }),
    [columnOrder, columnSizing, columnVisibility, density, sorting, groupBy],
  );

  /**
   * Applies a stored layout, or any part of one.
   *
   * The order goes through the same merge a restored layout does, so a view
   * saved before a column was added still shows that column rather than
   * dropping it.
   */
  const applyLayout = React.useCallback(
    (layout: Partial<DataGridLayout>) => {
      if (layout.order) setColumnOrder(mergeColumnOrder(layout.order, defaultOrder));
      if (layout.sizing) setColumnSizing(layout.sizing);
      if (layout.visibility) setColumnVisibility(layout.visibility);
      if (layout.density) setDensity(layout.density);
      if (layout.sorting) handleSortingChange(layout.sorting);
      if (layout.grouping) setGroupBy(layout.grouping);
    },
    [
      setColumnOrder,
      defaultOrder,
      setColumnSizing,
      setColumnVisibility,
      setDensity,
      handleSortingChange,
      setGroupBy,
    ],
  );

  return {
    table,
    headers: table.getFlatHeaders(),
    density,
    setDensity,
    metrics: DENSITY_METRICS[density],
    selectedRowIds,
    setSelectedRowIds,
    toggleRowSelected,
    toggleAllSelected,
    groupBy,
    setGroupBy,
    // The order as rendered, so drag-and-drop indices line up with the header row.
    columnOrder: effectiveOrder,
    setColumnOrder,
    columnSizing,
    setColumnSizing,
    columnVisibility,
    setColumnVisibility,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    grouping,
    expanded,
    setExpanded,
    columnMap,
    readCellValue: readValue,
    resetColumnWidths,
    resetLayout,
    getLayout,
    applyLayout,
  };
}

/** Reserved so callers can check a key will not clash before defining a column. */
export const RESERVED_COLUMN_IDS: ReadonlySet<string> = new Set([
  SELECT_COLUMN_ID,
  DRAG_COLUMN_ID,
]);
