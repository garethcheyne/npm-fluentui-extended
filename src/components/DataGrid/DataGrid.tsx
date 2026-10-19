import * as React from 'react';
import { mergeClasses, Spinner } from '@fluentui/react-components';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Row } from '@tanstack/react-table';

import { useDataGridStyles } from './DataGrid.styles';
import { DRAG_COLUMN_ID, OVERSCAN, SELECT_COLUMN_ID } from './DataGrid.tokens';
import {
  ROW_STATE_SEPARATOR,
  aggregate,
  columnAlign,
  formatCellValue,
  pinOffsets,
  toStateList,
} from './DataGrid.utils';
import { computeEditPatch, buildDisplayItems, groupPaths } from './DataGrid.compute';
import { useDataGrid } from './useDataGrid';
import { useRowSelection } from './useRowSelection';
import { isFillable, useFillHandle } from './useFillHandle';
import { DataGridToolbar } from './DataGridToolbar';
import { DataGridContextMenu } from './DataGridContextMenu';
import { DataGridHeaderCell } from './DataGridHeaderCell';
import { DataGridBodyRow } from './DataGridBodyRow';
import { DataGridGroupRow, DataGridSubtotalRow } from './DataGridGroupRow';
import type {
  DataGridAffix,
  DataGridCellRef,
  DataGridColumn,
  DataGridDisplayItem,
  DataGridGroupContext,
  DataGridHandle,
  DataGridProps,
  DataGridRow,
} from './DataGrid.types';
import type { CommandBarItem } from '../CommandBar';

/**
 * Prefix on a group banner's drop id. Row ids and column ids share the drag
 * context, so a banner needs an id neither of them can ever be.
 */
const GROUP_DROP_PREFIX = '__group__:';

/**
 * A virtualised, editable data grid built on TanStack Table and TanStack
 * Virtual, styled to match Dynamics 365's read-only grids closely enough to sit
 * beside one on a form.
 *
 * The grid is deliberately unopinionated about where rows come from. It takes an
 * array and a column config and handles everything a spreadsheet-style grid
 * needs — virtualisation, column drag, resize, grouping, filtering, density,
 * inline editors and layout persistence — leaving fetching, saving and the
 * toolbar to the consumer. Pass a `toolbar` node to fill the strip above the
 * header.
 *
 * Two things are worth knowing before wiring one up:
 *
 * - `data` and `columns` must be referentially stable. A new array each render
 *   re-creates the table and throws away scroll position, sort and selection.
 * - For unsaved-edit workflows, override `getCellValue` to layer pending changes
 *   over the stored record. The grid then sorts, filters and groups on what the
 *   user sees rather than on what the server last returned.
 */
function DataGridInner<T extends DataGridRow>(
  props: DataGridProps<T>,
  ref: React.ForwardedRef<DataGridHandle<T>>,
) {
  const {
    data,
    columns,
    getRowId,
    getCellValue,
    onCellChange,
    readOnly = false,
    getRowState,
    rowStates,
    cellStates,
    renderRowIndicator,
    showEditableHints = false,
    striped = true,
    density: densityProp,
    defaultDensity,
    onDensityChange,
    selectable = false,
    multiSelect = true,
    selectedRowIds: selectionProp,
    onSelectionChange,
    fillHandle = true,
    onFill,
    keyboardNavigation = true,
    onActiveCellChange,
    defaultSorting,
    onSortingChange,
    showFilters: showFiltersProp,
    defaultShowFilters = false,
    onShowFiltersChange,
    globalFilter,
    searchColumns,
    searchable,
    searchPlaceholder,
    renderToolbarSearch,
    groupBy: groupByProp,
    defaultGroupBy,
    onGroupByChange,
    renderGroupLabel,
    renderGroupHeader,
    groupContextMenu,
    onGroupDoubleClick,
    groupSelection = false,
    groupSubtotals = false,
    groupSubtotalsMinGroups = 1,
    groupSubtotalLevels = 'all',
    includeInSummary,
    reorderableColumns = true,
    onRowReorder,
    columnMenu = true,
    autoFit = true,
    persist,
    columnVisibility,
    onColumnVisibilityChange,
    forceHiddenColumns,
    toolbar,
    toolbarItems,
    toolbarItemsPlacement = 'end',
    toolbarSearchOrder,
    toolbarSearchAlign,
    statusBar = true,
    statusBarExtra,
    footerSummary,
    loading = false,
    loadingMessage = 'Loading\u2026',
    error,
    emptyMessage = 'No rows to show.',
    onRowClick,
    onRowDoubleClick,
    onRowContextMenu,
    rowContextMenu,
    cellContextMenu,
    className,
    style,
    tanstack,
    ...nativeProps
  } = props;

  const styles = useDataGridStyles();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // The built-in toolbar owns the search box, so the grid holds the term unless
  // the consumer is driving it from their own.
  const [ownSearch, setOwnSearch] = React.useState('');
  const showToolbar =
    searchable ?? ((searchColumns != null || renderToolbarSearch != null) && toolbar === undefined);
  const effectiveFilter = globalFilter ?? (showToolbar ? ownSearch : undefined);

  const grid = useDataGrid<T>({
    data,
    columns,
    getRowId,
    getCellValue,
    onCellChange,
    readOnly,
    tanstack,
    selectable,
    selectedRowIds: selectionProp,
    onSelectionChange,
    defaultSorting,
    onSortingChange,
    globalFilter: effectiveFilter,
    searchColumns,
    groupBy: groupByProp,
    defaultGroupBy,
    onGroupByChange,
    density: densityProp,
    defaultDensity,
    onDensityChange,
    persist,
    columnVisibility,
    onColumnVisibilityChange,
    forceHiddenColumns,
    // The indicator lives in the drag column, so it needs one even where rows
    // cannot be dragged.
    rowDragEnabled: Boolean(onRowReorder) || renderRowIndicator != null,
  });

  const forceHiddenSet = React.useMemo(() => new Set(forceHiddenColumns ?? []), [forceHiddenColumns]);

  const { table, metrics, columnMap, selectedRowIds, groupBy } = grid;

  const [uncontrolledFilters, setUncontrolledFilters] = React.useState(defaultShowFilters);
  const showFilters = showFiltersProp ?? uncontrolledFilters;
  const setShowFilters = React.useCallback(
    (next: boolean) => {
      if (showFiltersProp === undefined) setUncontrolledFilters(next);
      onShowFiltersChange?.(next);
    },
    [showFiltersProp, onShowFiltersChange],
  );

  // ── Display items ─────────────────────────────────────────────────────────

  const modelRows = table.getRowModel().rows;

  /**
   * Which columns get a subtotal under each group, and how each is aggregated.
   *
   * A named list wins over the columns' own `summary`, so a grid can total two
   * columns in the footer but repeat only one of them per group. A named column
   * with no `summary` sums, which is what is wanted often enough to be worth
   * assuming rather than requiring.
   */
  const subtotals = React.useMemo<Map<string, ColumnSummary<T>> | null>(() => {
    if (groupSubtotals === false) return null;
    const map = new Map<string, ColumnSummary<T>>();
    if (groupSubtotals === true) {
      for (const column of columns) if (column.summary) map.set(column.key, column.summary);
    } else {
      for (const key of groupSubtotals) {
        map.set(key, columnMap.get(key)?.summary ?? 'sum');
      }
    }
    return map;
  }, [groupSubtotals, columns, columnMap]);

  // With one group a subtotal only repeats the footer, which is why a grid can
  // ask for a minimum before any appear.
  const outermostGroupCount = React.useMemo(
    () => modelRows.filter((r) => r.depth === 0 && r.getIsGrouped()).length,
    [modelRows],
  );
  const hasSubtotals =
    subtotals != null && subtotals.size > 0 && outermostGroupCount >= groupSubtotalsMinGroups;

  /** The group values above every row and banner, for drops and the group hooks. */
  const paths = React.useMemo(() => groupPaths(modelRows), [modelRows]);

  /**
   * Group headers, data rows and subtotals flattened into one list.
   *
   * The virtualiser measures a single sequence, so the three row kinds have to
   * be interleaved before it sees them rather than rendered from nested loops.
   *
   * The expanded row model already returns each group followed by its visible
   * children, so this walks that list and only inserts the subtotals. Reading
   * `subRows` here as well would render every row twice.
   */
  const displayItems = React.useMemo<DataGridDisplayItem<T>[]>(
    () =>
      buildDisplayItems(
        modelRows,
        groupBy.length > 0,
        hasSubtotals,
        groupSubtotalLevels,
      ) as DataGridDisplayItem<T>[],
    [modelRows, groupBy, hasSubtotals, groupSubtotalLevels],
  );

  const virtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      displayItems[index]?.type === 'row' ? metrics.row : metrics.group,
    overscan: OVERSCAN,
    // Density is part of the key so a change forces a re-measure; without it the
    // virtualiser keeps the old heights and the rows overlap.
    getItemKey: (index) => `${grid.density}:${displayItems[index]?.key ?? index}`,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const headers = table.getFlatHeaders();
  const leafCount = table.getVisibleLeafColumns().length;

  // ── Width fill ────────────────────────────────────────────────────────────

  const availableWidth = useElementWidth(scrollRef);
  const totalColumnWidth = table.getTotalSize();
  const visibleLeafIds = table.getVisibleLeafColumns().map((c) => c.id);

  /**
   * Extra pixels handed to each column so the grid fills its container.
   *
   * Columns keep their own width and only ever share what is left over, so this
   * cannot shrink a column below what the user dragged it to — once the columns
   * no longer fit, the surplus is zero and the grid scrolls sideways as before.
   */
  const flexExtra = React.useMemo<Record<string, number>>(() => {
    if (!autoFit || availableWidth === 0) return {};
    const surplus = availableWidth - totalColumnWidth;
    if (surplus <= 1) return {};

    const weights = visibleLeafIds
      .map((id) => ({ id, weight: columnMap.get(id)?.flex ?? 0 }))
      .filter((entry) => entry.weight > 0);

    // Nothing declared: the last column absorbs it, which is how a grid is
    // expected to behave and stops a band of dead space down the right.
    if (weights.length === 0) {
      const last = visibleLeafIds[visibleLeafIds.length - 1];
      return last ? { [last]: surplus } : {};
    }

    const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
    const extra: Record<string, number> = {};
    let handed = 0;
    weights.forEach((entry, index) => {
      // The last one takes the remainder rather than its own rounded share, so
      // the parts always add back up to the surplus and no gap is left over.
      const share =
        index === weights.length - 1
          ? surplus - handed
          : Math.floor((surplus * entry.weight) / total);
      extra[entry.id] = share;
      handed += share;
    });
    return extra;
  }, [autoFit, availableWidth, totalColumnWidth, visibleLeafIds, columnMap]);

  /** A column's rendered width, own width plus its share of any surplus. */
  const widthOf = React.useCallback(
    (columnId: string, ownWidth: number) => ownWidth + (flexExtra[columnId] ?? 0),
    [flexExtra],
  );

  /**
   * Where each frozen column sits, once those in front of it are measured.
   *
   * The reserved drag and checkbox columns freeze alongside the first pinned
   * column: leaving them to scroll away would part a row from its own handle.
   */
  const pinned = React.useMemo(() => {
    const anyPinned = visibleLeafIds.some((id) => columnMap.get(id)?.pin);
    if (!anyPinned) return null;

    const sizeById = new Map(headers.map((h) => [h.column.id, widthOf(h.column.id, h.getSize())]));
    return pinOffsets(
      visibleLeafIds,
      (id) => sizeById.get(id) ?? 0,
      (id) =>
        id === DRAG_COLUMN_ID || id === SELECT_COLUMN_ID ? 'left' : columnMap.get(id)?.pin,
    );
  }, [visibleLeafIds, columnMap, headers, widthOf]);

  /** Class and offset for a cell in a frozen column, or nothing for a normal one. */
  const pinProps = React.useCallback(
    (columnId: string, isHeader = false) => {
      const at = pinned?.get(columnId);
      if (!at) return { className: undefined, style: undefined };
      return {
        className: mergeClasses(
          styles.pinned,
          isHeader && styles.pinnedHeader,
          at.last && (at.side === 'left' ? styles.pinnedLeftEdge : styles.pinnedRightEdge),
        ),
        style: { [at.side]: at.offset } as React.CSSProperties,
      };
    },
    [pinned, styles],
  );

  const tableWidth = Math.max(totalColumnWidth, autoFit ? availableWidth : 0);

  // ── Drag and drop ─────────────────────────────────────────────────────────

  // A short distance threshold, so a click on a header still sorts rather than
  // being swallowed as the start of a drag.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const rowIdsInOrder = React.useMemo(
    () => displayItems.filter((i) => i.type === 'row').map((i) => i.row.id),
    [displayItems],
  );

  const rowsById = React.useMemo(() => {
    const map = new Map<string, Row<T>>();
    for (const item of displayItems) if (item.type === 'row') map.set(item.row.id, item.row);
    return map;
  }, [displayItems]);

  // ── Selection ─────────────────────────────────────────────────────────────

  /**
   * Every row the filter left in, the ones inside collapsed groups included.
   *
   * The display list holds only what is on screen. Counting or totalling from it
   * quietly drops the rows in a folded band — a total that changes when a group
   * is collapsed is simply wrong — and a select-all built on it skips them too.
   */
  const filteredLeafRows = React.useMemo(
    // `modelRows` stands in for "the table recomputed": the filtered model is
    // rebuilt in the same pass, so it is the honest dependency to watch.
    () => table.getFilteredRowModel().rows.filter((r) => !r.getIsGrouped()),
    [table, modelRows],
  );

  const selectableRowIds = React.useMemo(
    () => filteredLeafRows.map((r) => r.id),
    [filteredLeafRows],
  );

  const { selectRow, anchorRow, toggleAll, allSelected } = useRowSelection({
    // Shift-ranges and the fill handle work down the screen; select-all works on
    // the data.
    rowIdsInOrder,
    selectableRowIds,
    selectedRowIds,
    setSelectedRowIds: grid.setSelectedRowIds,
    multiSelect,
  });

  // ── Active cell, keyboard and fill ────────────────────────────────────────

  const [activeCell, setActiveCell] = React.useState<DataGridCellRef | null>(null);

  const activateCell = React.useCallback(
    (rowId: string, columnKey: string) => {
      setActiveCell((current) => {
        if (current?.rowId === rowId && current.columnKey === columnKey) return current;
        const next = { rowId, columnKey };
        onActiveCellChange?.(next);
        return next;
      });
    },
    [onActiveCellChange],
  );

  /**
   * Whether the keyboard, rather than the pointer, put the user in this cell.
   *
   * It decides what left and right do inside a text field. Clicked into, the
   * caret is being placed and the arrows move it. Arrived at by keyboard, the
   * whole value is selected ready to be typed over, and the arrows carry on
   * moving between cells — which is how a spreadsheet behaves.
   */
  const navigatedRef = React.useRef(false);

  const activateCellFromPointer = React.useCallback(
    (rowId: string, columnKey: string) => {
      navigatedRef.current = false;
      activateCell(rowId, columnKey);
    },
    [activateCell],
  );

  /**
   * Focus landing in a cell makes it the active one, so a grid reached by Tab
   * answers the arrows straight away instead of waiting for a click. The
   * navigated flag is deliberately left alone — whoever moved the focus has
   * already said whether this was a keyboard move or a pointer one.
   */
  const activateCellFromFocus = React.useCallback(
    (rowId: string, columnKey: string) => activateCell(rowId, columnKey),
    [activateCell],
  );

  /** Editable columns in render order, which is what the arrow keys walk. */
  const navigableColumnKeys = React.useMemo(
    () =>
      table
        .getVisibleLeafColumns()
        .map((c) => c.id)
        .filter((id) => columnMap.has(id)),
    [table, columnMap],
  );

  const gridEditable = Boolean(onCellChange) && !readOnly;
  const activeColumn = activeCell ? columnMap.get(activeCell.columnKey) : undefined;
  const canFillActive =
    fillHandle && isFillable(activeColumn, gridEditable) && rowIdsInOrder.length > 1;

  /**
   * Applies an edit along with everything it implies.
   *
   * One keystroke can be several writes: a calculated column that is persisted
   * moves with its inputs, and a calculated column that accepts input writes
   * back to the fields it derives from. The consumer sees them as separate
   * changes on the same row, so a single save carries the lot.
   */
  const handleCellChange = React.useCallback(
    (row: T, columnKey: string, value: unknown, rowId: string) => {
      if (!onCellChange) return;
      const patch = computeEditPatch(row, rowId, columnKey, value, columns, columnMap, getCellValue);
      for (const [key, next] of Object.entries(patch)) onCellChange(row, key, next, rowId);
    },
    [onCellChange, columns, columnMap, getCellValue],
  );

  /**
   * Writes a dragged value down the rows it covered.
   *
   * `onFill` takes the whole block at once where a consumer supplies it; without
   * one this falls back to a change per row, which is correct but costs a render
   * each — a thousand-row drag is a thousand of them.
   */
  const commitFill = React.useCallback(
    (columnKey: string, sourceRowId: string, targetRowIds: string[]) => {
      const sourceRow = rowsById.get(sourceRowId);
      if (!sourceRow) return;
      const value = grid.readCellValue(sourceRow.original, columnKey, sourceRowId);

      const column = columnMap.get(columnKey);
      const targets = targetRowIds
        .map((id) => ({ id, row: rowsById.get(id) }))
        .filter((entry): entry is { id: string; row: Row<T> } => entry.row != null)
        // A cell the consumer has locked stays locked: a fill is an edit like
        // any other, and dragging over a read-only row must not write to it.
        .filter(
          (entry) =>
            !(
              column?.isCellReadOnly?.({
                value: grid.readCellValue(entry.row.original, columnKey, entry.id),
                row: entry.row.original,
                rowId: entry.id,
                column,
                tableRow: entry.row,
                readOnly,
              }) ?? false
            ),
        );

      if (targets.length === 0) return;

      if (onFill) {
        onFill({
          columnKey,
          sourceRowId,
          sourceRow: sourceRow.original,
          value,
          targetRowIds: targets.map((t) => t.id),
          targetRows: targets.map((t) => t.row.original),
        });
        return;
      }

      for (const target of targets) {
        handleCellChange(target.row.original, columnKey, value, target.id);
      }
    },
    [rowsById, grid, columnMap, readOnly, onFill, handleCellChange],
  );

  const { beginFill, preview: fillPreview } = useFillHandle({
    rowIdsInOrder,
    onCommit: commitFill,
  });

  /**
   * Whether a cell takes typing. Tab walks only these, so it never stops on a
   * value the user cannot change.
   */
  const isCellEditable = React.useCallback(
    (rowId: string, columnKey: string): boolean => {
      if (!gridEditable) return false;
      const column = columnMap.get(columnKey);
      const tableRow = rowsById.get(rowId);
      if (!column || !tableRow || column.editable !== true) return false;
      if (column.computed && !column.computed.onEdit) return false;
      return !(
        column.isCellReadOnly?.({
          value: grid.readCellValue(tableRow.original, columnKey, rowId),
          row: tableRow.original,
          rowId,
          column,
          tableRow,
          readOnly,
        }) ?? false
      );
    },
    [gridEditable, columnMap, rowsById, grid, readOnly],
  );

  /**
   * Focuses a cell's control, after the row it is in has been mounted.
   *
   * With `selectAll`, a text field's value is selected so the next key typed
   * replaces it rather than inserting into it.
   */
  const focusCell = React.useCallback((rowId: string, columnKey: string, selectAll: boolean) => {
    requestAnimationFrame(() => {
      const target = scrollRef.current?.querySelector<HTMLElement>(
        `[data-row-id="${rowId}"] [data-column-key="${columnKey}"] :is(input, select, [tabindex="0"])`,
      );
      target?.focus();
      if (selectAll && target instanceof HTMLInputElement && target.type === 'text') target.select();
    });
  }, []);

  /**
   * Spreadsheet keys: arrows, Enter, Tab, F2, and typing over a cell.
   *
   * Keys from inside a cell's own popup — a calendar, a lookup's results — are
   * left alone, since those controls use the arrows themselves. React bubbles
   * them here through the portal all the same, so they are told apart by where
   * they are in the document. The one exception is Ctrl+arrow in the memo
   * editor, which saves the note and then moves.
   */
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!keyboardNavigation || event.defaultPrevented || event.altKey) return;

      const target = event.target as HTMLElement;

      /**
       * The cell the key belongs to.
       *
       * Normally that is the active cell, set when the user clicked or moved
       * into it. Where the key arrives before the state does — focus landing in
       * a cell and a key pressed in the same tick, which is what tabbing into
       * the grid looks like — it is read back off the element the event came
       * from, so the first key is answered rather than swallowed.
       */
      const cell =
        activeCell ??
        (() => {
          const rowId = target.closest<HTMLElement>('[data-row-id]')?.dataset.rowId;
          const columnKey = target.closest<HTMLElement>('[data-column-key]')?.dataset.columnKey;
          return rowId && columnKey ? { rowId, columnKey } : null;
        })();
      if (!cell) return;
      const { key } = event;
      const arrow = key.startsWith('Arrow');
      const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
      const inMemoEditor = target.tagName === 'TEXTAREA';

      if (inMemoEditor) {
        if (!(arrow && (event.ctrlKey || event.metaKey))) return;
      } else if (!scrollRef.current?.contains(target) || !target.closest('[data-row-id]')) {
        // Only keys pressed inside a body row drive the grid. The filter row and
        // the header sit in the same scroll container, and taking their arrows,
        // Enter and Tab moves the active cell out from under someone who is
        // typing a filter.
        return;
      }

      const combobox = target.getAttribute('role') === 'combobox';
      // An open list owns the arrows and Enter.
      if (combobox && target.getAttribute('aria-expanded') === 'true') return;

      const textInput =
        target instanceof HTMLInputElement && target.type === 'text' && !combobox ? target : null;

      if (horizontal && target.tagName === 'SELECT') return;
      if (horizontal && textInput && !navigatedRef.current) {
        // Clicked into: the arrows move the caret until it reaches the end it
        // is heading for, and only then leave the cell.
        const length = textInput.value.length;
        const start = textInput.selectionStart ?? 0;
        const end = textInput.selectionEnd ?? 0;
        const atEdge =
          key === 'ArrowLeft' ? start === 0 && end === 0 : start === length && end === length;
        if (!atEdge) return;
      }

      const rowIndex = rowIdsInOrder.indexOf(cell.rowId);
      const colIndex = navigableColumnKeys.indexOf(cell.columnKey);
      if (rowIndex < 0 || colIndex < 0) return;

      const go = (nextRow: string, nextCol: string) => {
        event.preventDefault();
        navigatedRef.current = true;
        activateCell(nextRow, nextCol);
        // The target may be virtualised out, so scroll first and focus after the
        // row it lands on has actually been mounted.
        const index = displayItems.findIndex((i) => i.type === 'row' && i.row.id === nextRow);
        if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' });
        focusCell(nextRow, nextCol, true);
      };

      const move = (rowDelta: number, colDelta: number) => {
        const nextRow = rowIdsInOrder[rowIndex + rowDelta];
        const nextCol = navigableColumnKeys[colIndex + colDelta];
        if (nextRow && nextCol) go(nextRow, nextCol);
      };

      // Walks cells in reading order to the next one that takes input. Running
      // off either end of the grid is left to the browser, so Tab still leaves.
      const tab = (direction: 1 | -1) => {
        const columnCount = navigableColumnKeys.length;
        const total = rowIdsInOrder.length * columnCount;
        let position = rowIndex * columnCount + colIndex;
        for (let step = 1; step < total; step += 1) {
          position += direction;
          if (position < 0 || position >= total) return;
          const nextRow = rowIdsInOrder[Math.floor(position / columnCount)];
          const nextCol = navigableColumnKeys[position % columnCount];
          if (isCellEditable(nextRow, nextCol)) {
            go(nextRow, nextCol);
            return;
          }
        }
      };

      switch (key) {
        case 'ArrowDown':
          return move(1, 0);
        case 'ArrowUp':
          return move(-1, 0);
        case 'ArrowLeft':
          return move(0, -1);
        case 'ArrowRight':
          return move(0, 1);
        case 'Enter':
          // A choice or a lookup opens on Enter rather than being stepped over,
          // and a link or button inside a cell does its own thing.
          if (combobox || target.tagName === 'BUTTON' || target.tagName === 'A') return;
          return move(event.shiftKey ? -1 : 1, 0);
        case 'Tab':
          return tab(event.shiftKey ? -1 : 1);
        case 'F2':
          // Editing in place: the value is selected, and the arrows go back to
          // moving the caret within it.
          event.preventDefault();
          navigatedRef.current = false;
          focusCell(cell.rowId, cell.columnKey, true);
          return;
        case 'Escape':
          setActiveCell(null);
          onActiveCellChange?.(null);
          return;
        default: {
          // Typing on a cell whose editor does not have focus starts an edit over
          // its value. Focus moves while the key is still being handled, so the
          // character lands in the field, over the selection.
          if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || inMemoEditor) return;
          if (event.ctrlKey || event.metaKey) return;
          if (key.length !== 1 && key !== 'Backspace' && key !== 'Delete') return;
          const input = scrollRef.current?.querySelector<HTMLInputElement>(
            `[data-row-id="${cell.rowId}"] [data-column-key="${cell.columnKey}"] ` +
              'input[type="text"]:not([role="combobox"])',
          );
          if (!input) return;
          navigatedRef.current = true;
          input.focus();
          input.select();
        }
      }
    },
    [
      keyboardNavigation,
      activeCell,
      rowIdsInOrder,
      navigableColumnKeys,
      activateCell,
      displayItems,
      virtualizer,
      focusCell,
      isCellEditable,
      onActiveCellChange,
    ],
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeId = String(active.id);
      const overId = String(over.id);

      // One DndContext serves both axes, so the id decides which handler runs.
      // Asking TanStack would log "Column with id ... does not exist" on every
      // row drag, since a row id is never a column id.
      if (columnMap.has(activeId)) {
        grid.setColumnOrder((order) => {
          const from = order.indexOf(activeId);
          const to = order.indexOf(overId);
          return from < 0 || to < 0 ? order : arrayMove(order, from, to);
        });
        return;
      }

      if (!onRowReorder) return;

      // A banner takes drops so rows can be moved into a group — including a
      // collapsed one, whose rows are not on screen to be dropped beside.
      const droppedOnGroupHeader = overId.startsWith(GROUP_DROP_PREFIX);
      const overTargetId = droppedOnGroupHeader ? overId.slice(GROUP_DROP_PREFIX.length) : overId;

      let toIndex: number;
      if (droppedOnGroupHeader) {
        const at = displayItems.findIndex((i) => i.type === 'group' && i.row.id === overTargetId);
        if (at < 0) return;
        toIndex = displayItems.slice(0, at).filter((i) => i.type === 'row').length;
      } else {
        toIndex = rowIdsInOrder.indexOf(overId);
        if (toIndex < 0) return;
      }

      // A drag that starts on a selected row moves the whole selection, which is
      // how every spreadsheet behaves and what people try first.
      const moving =
        selectedRowIds.has(activeId) && selectedRowIds.size > 1
          ? rowIdsInOrder.filter((id) => selectedRowIds.has(id))
          : [activeId];

      const byId = new Map(displayItems.filter((i) => i.type === 'row').map((i) => [i.row.id, i.row]));
      onRowReorder({
        rowIds: moving,
        rows: moving.map((id) => byId.get(id)!.original).filter(Boolean),
        overRowId: overTargetId,
        toIndex,
        toGroup: paths.get(overTargetId) ?? [],
        droppedOnGroupHeader,
      });
    },
    [columnMap, grid, onRowReorder, rowIdsInOrder, selectedRowIds, displayItems, paths],
  );

  // ── Context menu ──────────────────────────────────────────────────────────

  const [menuState, setMenuState] = React.useState<{
    position: { x: number; y: number };
    items: CommandBarItem[];
  } | null>(null);

  const hasContextMenu = rowContextMenu != null || cellContextMenu != null;

  /**
   * Builds the menu for a right-click, cell commands first.
   *
   * Right-clicking a row that is not in the selection replaces the selection
   * with it, which is what every file list does — otherwise a command fires
   * against rows the user cannot see and did not mean.
   */
  const openContextMenu = React.useCallback(
    (rowId: string, columnKey: string | null, event: React.MouseEvent) => {
      if (!hasContextMenu) return;
      const tableRow = rowsById.get(rowId);
      if (!tableRow) return;

      event.preventDefault();

      if (selectable && !selectedRowIds.has(rowId)) selectRow(rowId);

      const items: CommandBarItem[] = [];

      if (cellContextMenu && columnKey) {
        const column = columnMap.get(columnKey);
        if (column) {
          const value = grid.readCellValue(tableRow.original, columnKey, rowId);
          const cellItems = cellContextMenu({
            value,
            row: tableRow.original,
            rowId,
            column,
            tableRow,
            readOnly:
              readOnly ||
              !onCellChange ||
              (column.isCellReadOnly?.({
                value,
                row: tableRow.original,
                rowId,
                column,
                tableRow,
                readOnly,
              }) ?? false),
          });
          if (cellItems?.length) items.push(...cellItems);
        }
      }

      if (rowContextMenu) {
        const rowItems =
          typeof rowContextMenu === 'function'
            ? rowContextMenu(tableRow.original, rowId, selectedRowIds)
            : rowContextMenu;
        if (rowItems.length > 0) {
          // A divider only where there is something above it to divide from.
          if (items.length > 0) items.push({ ...rowItems[0], dividerBefore: true }, ...rowItems.slice(1));
          else items.push(...rowItems);
        }
      }

      if (items.length === 0) return;
      setMenuState({ position: { x: event.clientX, y: event.clientY }, items });
    },
    [
      hasContextMenu,
      rowsById,
      selectable,
      selectedRowIds,
      selectRow,
      cellContextMenu,
      columnMap,
      grid,
      readOnly,
      onCellChange,
      rowContextMenu,
    ],
  );

  const handleRowContextMenu = React.useCallback(
    (row: T, rowId: string, event: React.MouseEvent) => {
      onRowContextMenu?.(row, rowId, event);
      openContextMenu(rowId, null, event);
    },
    [onRowContextMenu, openContextMenu],
  );

  const handleCellContextMenu = React.useCallback(
    (rowId: string, columnKey: string, event: React.MouseEvent) => {
      // The row handler runs too, on the way up, so only the cell's own commands
      // are added here.
      openContextMenu(rowId, columnKey, event);
      event.stopPropagation();
      const tableRow = rowsById.get(rowId);
      if (tableRow) onRowContextMenu?.(tableRow.original, rowId, event);
    },
    [openContextMenu, rowsById, onRowContextMenu],
  );

  // ── Groups ────────────────────────────────────────────────────────────────

  /** Everything the group hooks are handed about one banner. */
  const groupContext = React.useCallback(
    (groupRow: Row<T>): DataGridGroupContext<T> => {
      // A grouped row is keyed by the column its own level groups on, not the
      // outermost one.
      const columnKey = groupRow.groupingColumnId ?? groupBy[groupRow.depth] ?? '';
      const value =
        groupRow.groupingValue !== undefined
          ? groupRow.groupingValue
          : columnKey
            ? groupRow.getValue(columnKey)
            : null;
      // Leaf rows only: at an outer level the descendants include the inner
      // banners too, which are not rows anyone can select or count.
      const rows = groupRow.getLeafRows().filter((r) => !r.getIsGrouped());
      const rowIds = rows.map((r) => r.id);
      const selectedCount = rowIds.filter((id) => selectedRowIds.has(id)).length;
      const selection =
        selectedCount === 0 ? 'none' : selectedCount === rowIds.length ? 'all' : 'some';

      return {
        value,
        columnKey,
        depth: groupRow.depth,
        path: paths.get(groupRow.id) ?? [],
        rows,
        rowIds,
        label: renderGroupLabel
          ? renderGroupLabel(value, groupRow.subRows, groupRow.depth)
          : groupLabel(value, columnMap.get(columnKey), groupRow, readOnly),
        count: includeInSummary
          ? rows.filter((r) => includeInSummary(r.original, r.id)).length
          : rows.length,
        expanded: groupRow.getIsExpanded(),
        toggle: () => groupRow.toggleExpanded(),
        selection,
        toggleSelection: () => {
          const next = new Set(selectedRowIds);
          for (const id of rowIds) {
            if (selection === 'all') next.delete(id);
            else next.add(id);
          }
          grid.setSelectedRowIds(next);
        },
      };
    },
    [groupBy, selectedRowIds, paths, renderGroupLabel, columnMap, readOnly, includeInSummary, grid],
  );

  // ── Imperative handle ─────────────────────────────────────────────────────

  const [flashRowId, setFlashRowId] = React.useState<string | null>(null);
  const flashTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const focusColumnFilter = React.useCallback(
    (columnKey: string) => {
      setShowFilters(true);
      // After paint, so the filter row the click just revealed actually exists.
      requestAnimationFrame(() => {
        scrollRef.current
          ?.querySelector<HTMLInputElement>(`[data-filter-for="${columnKey}"]`)
          ?.focus();
      });
    },
    [setShowFilters],
  );

  React.useImperativeHandle(
    ref,
    (): DataGridHandle<T> => ({
      table,
      scrollToRow: (rowId, align = 'auto') => {
        const index = displayItems.findIndex((i) => i.type === 'row' && i.row.id === rowId);
        if (index >= 0) virtualizer.scrollToIndex(index, { align });
      },
      scrollToTop: () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }),
      resetColumnWidths: grid.resetColumnWidths,
      resetLayout: grid.resetLayout,
      focusColumnFilter,
      getLayout: grid.getLayout,
      applyLayout: grid.applyLayout,
      highlightRow: (rowId, options) => {
        const index = displayItems.findIndex((i) => i.type === 'row' && i.row.id === rowId);
        if (index >= 0) virtualizer.scrollToIndex(index, { align: 'center' });
        setFlashRowId(rowId);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(
          () => setFlashRowId(null),
          options?.durationMs ?? 1500,
        );
      },
    }),
    [
      table,
      displayItems,
      virtualizer,
      grid.resetColumnWidths,
      grid.resetLayout,
      grid.getLayout,
      grid.applyLayout,
      focusColumnFilter,
    ],
  );

  // ── Footer aggregates ─────────────────────────────────────────────────────

  const summaryColumns = React.useMemo(
    () => columns.filter((c) => c.summary != null),
    [columns],
  );
  const showFooter = footerSummary ?? summaryColumns.length > 0;

  /**
   * The affix an aggregate should carry, or null.
   *
   * A total is in the same unit as the values under it, so it wears the same
   * `$` or `%` — a column of dollars totalling to a bare number reads as a
   * different quantity. Two exceptions:
   *
   * - `count` is a number of rows, not an amount, so it carries no unit.
   * - A function affix is resolved against every row and only used if they all
   *   agree. Where the unit is decided per row — a GP % line beside an RRP $
   *   line — the group has no single unit, and picking one of them would label
   *   the total wrongly.
   */
  const aggregateAffix = React.useCallback(
    (
      affix: DataGridAffix<T> | undefined,
      column: DataGridColumn<T>,
      rows: Row<T>[],
      isCount: boolean,
    ): React.ReactNode => {
      if (affix == null || isCount || rows.length === 0) return null;
      if (typeof affix !== 'function') return affix;

      const resolve = (row: Row<T>) =>
        affix({
          value: grid.readCellValue(row.original, column.key, row.id),
          row: row.original,
          rowId: row.id,
          column,
          tableRow: row,
          readOnly: true,
        });

      const first = resolve(rows[0]);
      // Only primitives can be compared meaningfully; an element affix is
      // assumed uniform, which it is whenever it is not data-driven.
      if (typeof first !== 'string' && typeof first !== 'number') return first;
      return rows.every((row) => resolve(row) === first) ? first : null;
    },
    [grid],
  );

  const aggregateFor = React.useCallback(
    (column: DataGridColumn<T>, allRows: Row<T>[], kind: ColumnSummary<T>): React.ReactNode => {
      const rows = includeInSummary
        ? allRows.filter((r) => includeInSummary(r.original, r.id))
        : allRows;

      let result: unknown;
      if (typeof kind === 'function') {
        const idByRow = new Map(rows.map((r) => [r.original, r.id]));
        result = kind(
          rows.map((r) => r.original),
          {
            readValue: (row, columnKey) =>
              grid.readCellValue(row, columnKey, idByRow.get(row) ?? ''),
            rowIds: rows.map((r) => r.id),
          },
        );
        if (result == null || result === '') return null;
        // A node is the consumer's own rendering, so it is used as it comes.
        if (typeof result !== 'number' && typeof result !== 'string') {
          return result as React.ReactNode;
        }
      } else {
        result = aggregate(
          rows.map((r) => r.getValue(column.key)),
          kind,
        );
        if (result == null) return null;
        if (kind === 'count') return String(result);
      }

      const text =
        typeof result === 'number'
          ? formatCellValue(result, column, rows[0]?.original ?? ({} as T))
          : String(result);
      const prefix = aggregateAffix(column.prefix, column, rows, false);
      const suffix = aggregateAffix(column.suffix, column, rows, false);
      if (prefix == null && suffix == null) return text;

      return (
        <span className={styles.affixWrap}>
          {prefix != null && <span className={styles.affix}>{prefix}</span>}
          <span className={styles.affixControl}>{text}</span>
          {suffix != null && <span className={styles.affix}>{suffix}</span>}
        </span>
      );
    },
    [aggregateAffix, includeInSummary, grid, styles.affixWrap, styles.affix, styles.affixControl],
  );

  const dataRowCount = filteredLeafRows.length;

  // ── Render ─────────────────────────────────────────────────────────────

  const tableStyle = {
    width: tableWidth,
    '--fue-grid-font-size': `${metrics.fontSize}px`,
    '--fue-grid-line-height': `${metrics.lineHeight}px`,
    '--fue-grid-header-height': `${metrics.header}px`,
    '--fue-grid-control-height': `${metrics.control}px`,
  } as React.CSSProperties;

  const body = (() => {
    if (loading) {
      return (
        <div className={styles.centered}>
          <Spinner size="small" />
          <span>{loadingMessage}</span>
        </div>
      );
    }
    if (error) return <div className={styles.errorText}>{error}</div>;

    return (
      <div
        ref={scrollRef}
        className={styles.scroller}
        // The grid takes focus so the arrow keys reach it even before a cell's
        // own editor has been focused.
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className={styles.table} style={tableStyle}>
            <thead className={styles.thead}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  <SortableContext
                    items={grid.columnOrder}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => {
                      const id = header.column.id;

                      if (id === DRAG_COLUMN_ID) {
                        return (
                          <th
                            key={header.id}
                            className={mergeClasses(
                              styles.headerCell,
                              styles.dragCell,
                              pinProps(id, true).className,
                            )}
                            style={{
                              width: 24,
                              minWidth: 24,
                              maxWidth: 24,
                              height: metrics.header,
                              ...pinProps(id, true).style,
                            }}
                          />
                        );
                      }

                      if (id === SELECT_COLUMN_ID) {
                        const pin = pinProps(id, true);
                        return (
                          <th
                            key={header.id}
                            className={mergeClasses(
                              styles.headerCell,
                              styles.selectCell,
                              pin.className,
                            )}
                            style={{
                              width: 32,
                              minWidth: 32,
                              maxWidth: 32,
                              height: metrics.header,
                              ...pin.style,
                            }}
                          >
                            <input
                              type="checkbox"
                              className={styles.editorCheckbox}
                              checked={allSelected}
                              aria-label="Select all rows"
                              onChange={toggleAll}
                            />
                          </th>
                        );
                      }

                      const column = columnMap.get(id);
                      return (
                        <DataGridHeaderCell
                          key={header.id}
                          table={table}
                          header={header}
                          column={column}
                          width={widthOf(id, header.getSize())}
                          height={metrics.header}
                          align={column ? columnAlign(column) : 'left'}
                          groupBy={groupBy}
                          onGroupBy={grid.setGroupBy}
                          onShowFilter={focusColumnFilter}
                          onResetWidths={grid.resetColumnWidths}
                          draggable={reorderableColumns && column?.movable !== false}
                          menuEnabled={columnMenu}
                          pinClassName={pinProps(id, true).className}
                          pinStyle={pinProps(id, true).style}
                        />
                      );
                    })}
                  </SortableContext>
                </tr>
              ))}

              {showFilters && (
                <tr className={styles.filterRow} style={{ height: metrics.filter }}>
                  {headers.map((header) => {
                    const width = widthOf(header.column.id, header.getSize());
                    const pin = pinProps(header.column.id, true);
                    return (
                      <td
                        key={`${header.id}:filter`}
                        className={mergeClasses(styles.filterCell, pin.className)}
                        style={{
                          width,
                          minWidth: width,
                          maxWidth: width,
                          height: metrics.filter,
                          ...pin.style,
                        }}
                      >
                        {header.column.getCanFilter() && (
                          <input
                            data-filter-for={header.column.id}
                            className={styles.filterInput}
                            value={(header.column.getFilterValue() as string) ?? ''}
                            placeholder={'Filter\u2026'}
                            aria-label={`Filter ${columnMap.get(header.column.id)?.label ?? header.column.id}`}
                            onChange={(e) =>
                              header.column.setFilterValue(e.currentTarget.value || undefined)
                            }
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              )}
            </thead>

            <tbody>
              {/* Spacers stand in for the rows scrolled past, so the scrollbar
                  reflects the whole set rather than only what is mounted. */}
              {virtualItems.length > 0 && (
                <tr style={{ height: virtualItems[0].start }}>
                  <td colSpan={leafCount} />
                </tr>
              )}

              <SortableContext items={rowIdsInOrder} strategy={verticalListSortingStrategy}>
                {virtualItems.map((virtualItem) => {
                  const item = displayItems[virtualItem.index];
                  if (!item) return null;

                  if (item.type === 'group') {
                    const ctx = groupContext(item.row);
                    return (
                      <DataGridGroupRow
                        key={item.key}
                        label={ctx.label}
                        count={ctx.count}
                        depth={ctx.depth}
                        expanded={ctx.expanded}
                        onToggle={item.row.getToggleExpandedHandler()}
                        colSpan={leafCount}
                        height={metrics.group}
                        content={renderGroupHeader ? renderGroupHeader(ctx) : undefined}
                        selection={groupSelection ? ctx.selection : undefined}
                        onToggleSelection={groupSelection ? ctx.toggleSelection : undefined}
                        onContextMenu={
                          groupContextMenu
                            ? (event) => {
                                const items = groupContextMenu(ctx);
                                if (!items?.length) return;
                                event.preventDefault();
                                setMenuState({
                                  position: { x: event.clientX, y: event.clientY },
                                  items,
                                });
                              }
                            : undefined
                        }
                        onDoubleClick={onGroupDoubleClick ? () => onGroupDoubleClick(ctx) : undefined}
                        dropId={onRowReorder ? `${GROUP_DROP_PREFIX}${item.row.id}` : undefined}
                      />
                    );
                  }

                  if (item.type === 'subtotal') {
                    return (
                      <DataGridSubtotalRow
                        key={item.key}
                        height={metrics.group}
                        cells={headers.map((header) => {
                          const column = columnMap.get(header.column.id);
                          const kind = subtotals?.get(header.column.id);
                          const pin = pinProps(header.column.id);
                          return {
                            key: header.id,
                            width: widthOf(header.column.id, header.getSize()),
                            align: column ? columnAlign(column) : 'left',
                            pinClassName: pin.className,
                            pinStyle: pin.style,
                            // Leaf rows rather than `subRows`, which at an outer
                            // level are the inner banners and hold no values.
                            content:
                              column && kind
                                ? aggregateFor(
                                    column,
                                    item.row.getLeafRows().filter((r) => !r.getIsGrouped()),
                                    kind,
                                  )
                                : null,
                          };
                        })}
                      />
                    );
                  }

                  const row = item.row;
                  return (
                    <DataGridBodyRow
                      key={item.key}
                      tableRow={row}
                      rowId={row.id}
                      height={metrics.row}
                      alt={striped && virtualItem.index % 2 === 1}
                      selected={selectedRowIds.has(row.id)}
                      rowState={rowStateKey(getRowState?.(row.original, row.id))}
                      rowStates={rowStates}
                      cellStates={cellStates}
                      columnMap={columnMap}
                      widthOf={widthOf}
                      pinProps={pinProps}
                      readOnly={readOnly}
                      draggable={Boolean(onRowReorder)}
                      renderRowIndicator={renderRowIndicator}
                      editableHints={showEditableHints}
                      flash={flashRowId === row.id}
                      activeColumnKey={
                        activeCell?.rowId === row.id ? activeCell.columnKey : null
                      }
                      fillColumnKey={
                        fillPreview?.rowIds.has(row.id) ? fillPreview.columnKey : null
                      }
                      onFillStart={canFillActive ? beginFill : null}
                      getCellValue={grid.readCellValue}
                      onCellChange={onCellChange ? handleCellChange : undefined}
                      onSelect={selectRow}
                      onAnchor={anchorRow}
                      onActivateCell={activateCellFromPointer}
                      onFocusCell={activateCellFromFocus}
                      onClick={onRowClick}
                      onDoubleClick={onRowDoubleClick}
                      onContextMenu={
                        onRowContextMenu || rowContextMenu ? handleRowContextMenu : undefined
                      }
                      onCellContextMenu={cellContextMenu ? handleCellContextMenu : undefined}
                    />
                  );
                })}
              </SortableContext>

              {virtualItems.length > 0 && (
                <tr
                  style={{
                    height:
                      virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0),
                  }}
                >
                  <td colSpan={leafCount} />
                </tr>
              )}
            </tbody>

            {showFooter && (
              <tfoot className={styles.tfoot}>
                <tr>
                  {headers.map((header) => {
                    const column = columnMap.get(header.column.id);
                    const width = widthOf(header.column.id, header.getSize());
                    const align = column ? columnAlign(column) : 'left';
                    const pin = pinProps(header.column.id);
                    return (
                      <td
                        key={`${header.id}:footer`}
                        className={mergeClasses(
                          styles.footerCell,
                          align === 'center' && styles.alignCenter,
                          align === 'right' && styles.alignRight,
                          pin.className,
                        )}
                        style={{ width, minWidth: width, maxWidth: width, ...pin.style }}
                      >
                        {column?.summary
                          ? aggregateFor(column, filteredLeafRows, column.summary)
                          : null}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </DndContext>

        {displayItems.length === 0 && <div className={styles.centered}>{emptyMessage}</div>}
      </div>
    );
  })();

  return (
    <div {...nativeProps} className={mergeClasses(styles.root, className)} style={style}>
      {toolbar ??
        (showToolbar ? (
          <DataGridToolbar
            table={table}
            columns={columns}
            search={ownSearch}
            onSearchChange={setOwnSearch}
            searchPlaceholder={searchPlaceholder}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            density={grid.density}
            onDensityChange={grid.setDensity}
            groupBy={groupBy}
            onGroupByChange={grid.setGroupBy}
            onResetLayout={grid.resetLayout}
            extraItems={toolbarItems}
            extraItemsPlacement={toolbarItemsPlacement}
            searchOrder={toolbarSearchOrder}
            searchAlign={toolbarSearchAlign}
            renderSearch={renderToolbarSearch}
            forceHidden={forceHiddenSet}
          />
        ) : null)}
      {body}
      {statusBar && (
        <div className={styles.statusBar}>
          <span>{`${dataRowCount} row${dataRowCount === 1 ? '' : 's'}`}</span>
          {selectedRowIds.size > 0 && <span>{`${selectedRowIds.size} selected`}</span>}
          {groupBy.length > 0 && (
            <span>
              {`grouped by ${groupBy.map((k) => columnMap.get(k)?.label ?? k).join(' \u203A ')}`}
            </span>
          )}
          <span className={styles.statusSpacer} />
          {statusBarExtra}
        </div>
      )}
      {menuState && (
        <DataGridContextMenu
          position={menuState.position}
          items={menuState.items}
          onDismiss={() => setMenuState(null)}
        />
      )}
    </div>
  );
}

/**
 * `forwardRef` erases the generic, so it is restored by assertion. The cast is
 * to the exact signature of the function above, which keeps `DataGrid<Row>`
 * inferring row types at every call site.
 */
export const DataGrid = React.forwardRef(DataGridInner) as <T extends DataGridRow>(
  props: DataGridProps<T> & { ref?: React.ForwardedRef<DataGridHandle<T>> },
) => React.ReactElement;

/** A column's summary, whichever form it takes. */
type ColumnSummary<T extends DataGridRow> = NonNullable<DataGridColumn<T>['summary']>;

/**
 * What `getRowState` returned, as the one string a row is handed.
 *
 * A string keeps the row memo working: a list rebuilt every render would count
 * as a change on every row on screen.
 */
function rowStateKey(value: string | readonly string[] | null | undefined): string | null {
  const names = toStateList(value);
  return names.length > 0 ? names.join(ROW_STATE_SEPARATOR) : null;
}

/**
 * The text on a group banner.
 *
 * Runs through whatever the column uses to display a cell, so a band reads the
 * way its rows do — "Draft" rather than the 1 behind it, and a person's name
 * rather than their guid. Lookups need a row to resolve against, so the first
 * one in the group stands in for the band.
 */
function groupLabel<T extends DataGridRow>(
  value: unknown,
  column: DataGridColumn<T> | undefined,
  groupRow: Row<T>,
  readOnly: boolean,
): React.ReactNode {
  if (!column || value == null || value === '') return String(value ?? '(blank)');

  if (column.getLookupValue) {
    const leaf = groupRow.getLeafRows()[0];
    const resolved = leaf
      ? column.getLookupValue({
          value,
          row: leaf.original,
          rowId: leaf.id,
          column,
          tableRow: leaf,
          readOnly,
        })
      : null;
    if (resolved?.text) return resolved.text;
  }

  return formatCellValue(value, column, groupRow.original) || String(value);
}

/**
 * The element's content width, tracked as it changes.
 *
 * A resize observer rather than a one-off measurement: the grid is usually in a
 * pane the user can drag, or an iframe the host resizes, and a width measured
 * only at mount leaves the columns stretched to a container that is no longer
 * that size.
 */
function useElementWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    setWidth(element.clientWidth);
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
