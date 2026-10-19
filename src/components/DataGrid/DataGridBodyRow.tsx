import * as React from 'react';
import { Tooltip, mergeClasses } from '@fluentui/react-components';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Row } from '@tanstack/react-table';
import { useDataGridStyles } from './DataGrid.styles';
import { DataGridCell, cellStateProps } from './DataGridCell';
import { ROW_STATE_SEPARATOR, columnAlign, resolveRowStateStyle } from './DataGrid.utils';
import { BUILTIN_ROW_STATES, DRAG_COLUMN_ID, SELECT_COLUMN_ID } from './DataGrid.tokens';
import type {
  DataGridCellContext,
  DataGridCellStateStyle,
  DataGridColumn,
  DataGridRow as GridRow,
  DataGridRowStateStyle,
  DataGridSelectModifiers,
} from './DataGrid.types';

export interface DataGridBodyRowProps<T extends GridRow> {
  tableRow: Row<T>;
  rowId: string;
  height: number;
  alt: boolean;
  selected: boolean;
  /**
   * The row's states, joined on {@link ROW_STATE_SEPARATOR}.
   *
   * A string rather than the list `getRowState` returns, because a fresh array
   * every render would defeat the row memo for every row on screen.
   */
  rowState: string | null | undefined;
  /** The grid's `rowStates`, laid over the built-in ones. */
  rowStates?: Readonly<Record<string, DataGridRowStateStyle>>;
  /** The grid's `cellStates`, laid over the built-in ones. */
  cellStates?: Readonly<Record<string, DataGridCellStateStyle>>;
  columnMap: Map<string, DataGridColumn<T>>;
  /** A column's rendered width, including its share of any surplus. */
  widthOf: (columnId: string, ownWidth: number) => number;
  /** Sticky class and edge offset for a frozen column. */
  pinProps?: (columnId: string) => {
    className: string | undefined;
    style: React.CSSProperties | undefined;
  };
  readOnly: boolean;
  draggable: boolean;
  /** Content for the leading column, drawn in place of the drag grip. */
  renderRowIndicator?: (row: T, rowId: string) => React.ReactNode;
  /** Underline the cells that can be edited. */
  editableHints?: boolean;
  /** Outline the row, while `highlightRow` has it. */
  flash?: boolean;
  /**
   * The active column on this row, or null when the active cell is elsewhere.
   *
   * Passed as a key rather than as the whole active-cell object so that moving
   * the active cell re-renders two rows instead of every row on screen — the row
   * is memoised, and an object prop with a fresh identity each render defeats
   * that.
   */
  activeColumnKey: string | null;
  /** The column being filled, when this row is under the drag. Otherwise null. */
  fillColumnKey: string | null;
  /** Renders the fill grip. Null when the active cell's column cannot be filled. */
  onFillStart: ((event: React.MouseEvent, rowId: string, columnKey: string) => void) | null;
  getCellValue: (row: T, columnKey: string, rowId: string) => unknown;
  onCellChange?: (row: T, columnKey: string, value: unknown, rowId: string) => void;
  onSelect: (rowId: string, modifiers: DataGridSelectModifiers) => void;
  /** Moves the Shift anchor without changing the selection. */
  onAnchor: (rowId: string) => void;
  onActivateCell: (rowId: string, columnKey: string) => void;
  /**
   * Focus arriving in a cell, so a grid reached by Tab has an active cell
   * without needing a click first.
   */
  onFocusCell?: (rowId: string, columnKey: string) => void;
  onClick?: (row: T, rowId: string, event: React.MouseEvent) => void;
  onDoubleClick?: (row: T, rowId: string, event: React.MouseEvent) => void;
  onContextMenu?: (row: T, rowId: string, event: React.MouseEvent) => void;
  /** The column the right-click landed in, so a cell menu knows its context. */
  onCellContextMenu?: (rowId: string, columnKey: string, event: React.MouseEvent) => void;
}

/**
 * One data row.
 *
 * Memoised because the virtualiser re-renders the whole visible window whenever
 * the scroll position moves by a row, and a grid with thirty columns of editors
 * is expensive enough that re-rendering rows whose data has not changed is
 * visible as scroll judder.
 */
function DataGridBodyRowInner<T extends GridRow>(props: DataGridBodyRowProps<T>) {
  const {
    tableRow,
    rowId,
    height,
    alt,
    selected,
    rowState,
    rowStates,
    cellStates,
    columnMap,
    widthOf,
    pinProps,
    readOnly,
    draggable,
    renderRowIndicator,
    editableHints = false,
    flash = false,
    activeColumnKey,
    fillColumnKey,
    onFillStart,
    getCellValue,
    onCellChange,
    onSelect,
    onAnchor,
    onActivateCell,
    onFocusCell,
    onClick,
    onDoubleClick,
    onContextMenu,
    onCellContextMenu,
  } = props;
  const styles = useDataGridStyles();
  const row = tableRow.original;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: rowId,
    disabled: !draggable,
  });

  // Selection goes on last, because it is the state the user just caused and
  // expects to see reflected immediately. Anything it does not set — a deleted
  // row's strike-through — carries on showing beneath it.
  const stateStyle = React.useMemo(() => {
    const names = rowState ? rowState.split(ROW_STATE_SEPARATOR) : [];
    if (selected) names.push('selected');
    return resolveRowStateStyle(names, BUILTIN_ROW_STATES, rowStates);
  }, [rowState, selected, rowStates]);

  const stateVars: Record<string, string> = {};
  if (stateStyle?.background) {
    stateVars['--fue-row-bg'] = stateStyle.background;
    if (stateStyle.backgroundHover) stateVars['--fue-row-bg-hover'] = stateStyle.backgroundHover;
  }
  if (stateStyle?.accent) stateVars['--fue-row-accent'] = stateStyle.accent;
  if (stateStyle?.color) stateVars['--fue-row-color'] = stateStyle.color;
  if (stateStyle?.textDecoration) stateVars['--fue-row-text-decoration'] = stateStyle.textDecoration;
  if (stateStyle?.opacity != null) stateVars['--fue-row-opacity'] = String(stateStyle.opacity);

  const handleRowMouseDown = (event: React.MouseEvent) => {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      // Shift-clicking two rows apart otherwise text-selects everything between
      // them, over the top of the row highlight the gesture is there to produce.
      event.preventDefault();
      onSelect(rowId, { shift: event.shiftKey, ctrl: event.ctrlKey || event.metaKey });
    } else {
      // A plain click does not select — that would fight cell editing — but it
      // does move the anchor, so a Shift-click next extends from here.
      onAnchor(rowId);
    }
  };

  return (
    <tr
      ref={draggable ? setNodeRef : undefined}
      data-row-id={rowId}
      aria-selected={selected}
      style={{
        height,
        transform: draggable ? CSS.Translate.toString(transform) : undefined,
        ...(stateVars as React.CSSProperties),
      }}
      className={mergeClasses(
        alt ? styles.rowAlt : styles.row,
        stateStyle?.background && styles.rowStateBg,
        stateStyle?.accent && styles.rowStateAccent,
        stateStyle?.color && styles.rowStateColor,
        stateStyle?.textDecoration && styles.rowStateDecoration,
        stateStyle?.opacity != null && styles.rowStateOpacity,
        onClick && styles.rowClickable,
        isDragging && styles.rowDragging,
        flash && styles.rowFlash,
      )}
      onMouseDown={handleRowMouseDown}
      onClick={onClick ? (e) => onClick(row, rowId, e) : undefined}
      onDoubleClick={onDoubleClick ? (e) => onDoubleClick(row, rowId, e) : undefined}
      onContextMenu={onContextMenu ? (e) => onContextMenu(row, rowId, e) : undefined}
    >
      {tableRow.getVisibleCells().map((cell) => {
        const width = widthOf(cell.column.id, cell.column.getSize());
        const pin = pinProps?.(cell.column.id);
        const sizing: React.CSSProperties = {
          width,
          minWidth: width,
          maxWidth: width,
          height,
          ...pin?.style,
        };

        if (cell.column.id === DRAG_COLUMN_ID) {
          const indicator = renderRowIndicator?.(row, rowId);
          return (
            <td
              key={cell.id}
              className={mergeClasses(styles.cell, styles.dragCell, pin?.className)}
              style={sizing}
            >
              {draggable ? (
                <span
                  {...attributes}
                  {...listeners}
                  className={styles.dragHandle}
                  aria-label="Reorder row"
                  role="button"
                >
                  {indicator ?? <>&#8942;&#8942;</>}
                </span>
              ) : (
                indicator != null && <span className={styles.rowIndicator}>{indicator}</span>
              )}
            </td>
          );
        }

        if (cell.column.id === SELECT_COLUMN_ID) {
          return (
            <td
              key={cell.id}
              className={mergeClasses(styles.cell, styles.selectCell, pin?.className)}
              style={sizing}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                className={styles.editorCheckbox}
                checked={selected}
                aria-label="Select row"
                // A checkbox is an explicit add-or-remove whatever is held, so it
                // always behaves the way a Ctrl-click does.
                onChange={() => onSelect(rowId, { ctrl: true })}
                onClick={(e) => {
                  if (e.shiftKey) {
                    e.preventDefault();
                    onSelect(rowId, { shift: true });
                  }
                }}
              />
            </td>
          );
        }

        const column = columnMap.get(cell.column.id);
        if (!column) return null;

        const value = getCellValue(row, column.key, rowId);
        const cellReadOnly =
          readOnly ||
          !onCellChange ||
          (column.isCellReadOnly?.({
            value,
            row,
            rowId,
            column,
            tableRow,
            readOnly,
          }) ?? false);

        const ctx: DataGridCellContext<T> = {
          value,
          row,
          rowId,
          column,
          tableRow,
          readOnly: cellReadOnly,
        };
        const align = columnAlign(column);
        const isActive = activeColumnKey === column.key;
        const inFillPreview = fillColumnKey === column.key;
        const state = cellStateProps(styles, column.getCellState?.(ctx), cellStates);
        const canEdit =
          editableHints &&
          column.editable === true &&
          !cellReadOnly &&
          (!column.computed || column.computed.onEdit != null);

        return (
          <td
            key={cell.id}
            data-column-key={column.key}
            className={mergeClasses(
              styles.cell,
              align === 'center' && styles.alignCenter,
              align === 'right' && styles.alignRight,
              cellReadOnly && column.editable === true && styles.cellReadOnly,
              state.className,
              canEdit && styles.cellEditableHint,
              inFillPreview && styles.cellFillPreview,
              isActive && styles.cellActive,
              pin?.className,
            )}
            style={state.style ? { ...sizing, ...state.style } : sizing}
            onMouseDown={() => onActivateCell(rowId, column.key)}
            onFocus={onFocusCell ? () => onFocusCell(rowId, column.key) : undefined}
            onContextMenu={
              onCellContextMenu ? (e) => onCellContextMenu(rowId, column.key, e) : undefined
            }
          >
            <DataGridCell
              ctx={ctx}
              onCommit={(next) => onCellChange?.(row, column.key, next, rowId)}
            />
            {isActive && onFillStart && (
              <Tooltip content="Drag to fill down" relationship="label" withArrow>
                <span
                  className={styles.fillHandle}
                  role="presentation"
                  onMouseDown={(e) => onFillStart(e, rowId, column.key)}
                />
              </Tooltip>
            )}
          </td>
        );
      })}
    </tr>
  );
}

export const DataGridBodyRow = React.memo(DataGridBodyRowInner) as typeof DataGridBodyRowInner;
