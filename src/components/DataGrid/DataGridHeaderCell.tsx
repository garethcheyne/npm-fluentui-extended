import * as React from 'react';
import { Tooltip, mergeClasses } from '@fluentui/react-components';
import { ChevronDownRegular } from '@fluentui/react-icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender, type Header, type Table } from '@tanstack/react-table';
import { useDataGridStyles } from './DataGrid.styles';
import { DataGridColumnMenu } from './DataGridColumnMenu';
import type { DataGridColumn, DataGridRow } from './DataGrid.types';

export interface DataGridHeaderCellProps<T extends DataGridRow> {
  table: Table<T>;
  header: Header<T, unknown>;
  column: DataGridColumn<T> | undefined;
  /** Rendered width, which is the column's own plus its share of any surplus. */
  width: number;
  /** Header height for the active density. */
  height: number;
  align: 'left' | 'center' | 'right';
  groupBy: string[];
  onGroupBy: (groupBy: string[]) => void;
  onShowFilter: (columnKey: string) => void;
  onResetWidths: () => void;
  /** Drag-to-reorder. Off for pinned or immovable columns. */
  draggable: boolean;
  /** Right-click menu. */
  menuEnabled: boolean;
  /** Set when the column is frozen; carries the sticky class and edge offset. */
  pinClassName?: string;
  pinStyle?: React.CSSProperties;
}

/**
 * One header cell: sortable on click, draggable to reorder, resizable from its
 * right edge, and right-clickable for the column menu.
 *
 * The resize handle stops propagation on pointer down. Without that, dnd-kit
 * claims the gesture and the column is dragged to a new position instead of
 * being widened — the two interactions start identically, so only the target
 * tells them apart.
 */
export function DataGridHeaderCell<T extends DataGridRow>(props: DataGridHeaderCellProps<T>) {
  const {
    table,
    header,
    column,
    width,
    height,
    align,
    groupBy,
    onGroupBy,
    onShowFilter,
    onResetWidths,
    draggable,
    menuEnabled,
    pinClassName,
    pinStyle,
  } = props;
  const styles = useDataGridStyles();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuAt, setMenuAt] = React.useState<{ x: number; y: number } | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: header.column.id,
    disabled: !draggable,
  });

  const sorted = header.column.getIsSorted();
  const isGrouped = groupBy.includes(header.column.id);

  const style: React.CSSProperties = {
    width,
    minWidth: width,
    maxWidth: width,
    height,
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : 'transform 150ms ease',
    ...pinStyle,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      colSpan={header.colSpan}
      className={mergeClasses(
        styles.headerCell,
        header.column.getCanSort() && styles.headerCellSortable,
        isGrouped && styles.headerCellGrouped,
        isDragging && styles.headerCellDragging,
        align === 'center' && styles.alignCenter,
        align === 'right' && styles.alignRight,
        pinClassName,
      )}
      onContextMenu={(e) => {
        if (!menuEnabled) return;
        e.preventDefault();
        setMenuAt({ x: e.clientX, y: e.clientY });
        setMenuOpen(true);
      }}
    >
      <Tooltip
        content={column?.description ?? column?.label ?? header.column.id}
        relationship="description"
        withArrow
        positioning="above"
      >
        <span
          {...attributes}
          {...listeners}
          className={styles.headerLabel}
          onClick={header.column.getToggleSortingHandler()}
        >
          <span className={styles.headerLabelText}>
            {column?.renderHeader
              ? column.renderHeader(header.column)
              : flexRender(header.column.columnDef.header, header.getContext())}
          </span>
          {sorted && (
            <span className={styles.headerIcon} aria-hidden>
              {sorted === 'asc' ? '\u2191' : '\u2193'}
            </span>
          )}
        </span>
      </Tooltip>

      {/* The chevron Dynamics puts on every column header. A right-click opens
          the same menu, but nobody discovers that without the affordance. */}
      {menuEnabled && (
        <button
          type="button"
          className={styles.headerMenuButton}
          aria-label={`${column?.label ?? header.column.id} column options`}
          aria-haspopup="menu"
          // Keeps the press off the label underneath, which would sort instead.
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuAt({ x: rect.left, y: rect.bottom });
            setMenuOpen(true);
          }}
        >
          <ChevronDownRegular />
        </button>
      )}

      {header.column.getCanResize() && (
        <span
          role="separator"
          aria-orientation="vertical"
          className={mergeClasses(
            styles.resizer,
            header.column.getIsResizing() && styles.resizerActive,
          )}
          onDoubleClick={() => header.column.resetSize()}
          onMouseDown={(e) => {
            e.stopPropagation();
            // The drag is tracked on the document the grid is actually in.
            // Left to its own devices TanStack listens on the module's global
            // `document`, so inside an iframe — a D365 web resource — the
            // handle grabs but never moves.
            header.getResizeHandler(e.currentTarget.ownerDocument)(e);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            header.getResizeHandler(e.currentTarget.ownerDocument)(e);
          }}
        />
      )}

      {menuEnabled && menuOpen && (
        <DataGridColumnMenu
          table={table}
          header={header}
          column={column}
          groupBy={groupBy}
          onGroupBy={onGroupBy}
          onShowFilter={onShowFilter}
          onResetWidths={onResetWidths}
          position={menuAt}
          open={menuOpen}
          onOpenChange={setMenuOpen}
        />
      )}
    </th>
  );
}
