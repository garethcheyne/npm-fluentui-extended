import * as React from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { useDroppable } from '@dnd-kit/core';
import { useDataGridStyles } from './DataGrid.styles';

export interface DataGridGroupRowProps {
  label: React.ReactNode;
  count: number;
  /** Nesting level, 0 for the outermost band. */
  depth?: number;
  expanded: boolean;
  onToggle: () => void;
  colSpan: number;
  height: number;
  /** Replaces the label and count. The chevron and checkbox stay. */
  content?: React.ReactNode;
  /** Shows the select-all checkbox when set. */
  selection?: 'none' | 'some' | 'all';
  onToggleSelection?: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  /**
   * Taking a double-click means a single click on the banner can no longer
   * collapse it, or every double-click would collapse and re-open the group on
   * the way. The chevron still does.
   */
  onDoubleClick?: (event: React.MouseEvent) => void;
  /** Makes the banner a drop target for dragged rows, under this id. */
  dropId?: string;
}

/**
 * The banner above each group.
 *
 * It spans every column and is pinned to the left edge of the scroll container,
 * so a wide grid scrolled sideways still shows which group the rows on screen
 * belong to.
 */
export function DataGridGroupRow({
  label,
  count,
  depth = 0,
  expanded,
  onToggle,
  colSpan,
  height,
  content,
  selection,
  onToggleSelection,
  onContextMenu,
  onDoubleClick,
  dropId,
}: DataGridGroupRowProps) {
  const styles = useDataGridStyles();
  const { setNodeRef, isOver } = useDroppable({
    id: dropId ?? '__group-drop-disabled__',
    disabled: dropId == null,
  });

  const checkboxRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    // `indeterminate` has no attribute, so it can only be set on the element.
    if (checkboxRef.current) checkboxRef.current.indeterminate = selection === 'some';
  }, [selection]);

  const bannerToggles = onDoubleClick == null;

  return (
    <tr
      ref={dropId ? setNodeRef : undefined}
      className={styles.groupRow}
      style={{ height }}
      data-group-depth={depth}
    >
      <td
        colSpan={colSpan}
        className={mergeClasses(
          styles.groupCell,
          !bannerToggles && styles.groupCellStatic,
          isOver && styles.groupCellDropTarget,
        )}
        style={{ height }}
        onClick={bannerToggles ? onToggle : undefined}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        role={bannerToggles ? 'button' : undefined}
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {/* The banner is sticky, so the indent goes inside it rather than on the
            cell, which would slide out of view when scrolled sideways. */}
        <span className={styles.groupInner} style={{ paddingInlineStart: depth * 16 }}>
          {bannerToggles ? (
            <span aria-hidden>{expanded ? '▾' : '▸'}</span>
          ) : (
            <button
              type="button"
              className={styles.groupChevron}
              aria-label={expanded ? 'Collapse group' : 'Expand group'}
              aria-expanded={expanded}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {expanded ? '▾' : '▸'}
            </button>
          )}
          {selection && onToggleSelection && (
            <input
              ref={checkboxRef}
              type="checkbox"
              className={styles.editorCheckbox}
              checked={selection === 'all'}
              aria-label="Select rows in group"
              // The banner collapses on click, and ticking a box is not a request
              // to hide the rows being ticked.
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onChange={onToggleSelection}
            />
          )}
          {content !== undefined ? (
            <span className={styles.groupContent}>{content}</span>
          ) : (
            <>
              <span>{label}</span>
              <span className={styles.groupCount}>{`(${count})`}</span>
            </>
          )}
        </span>
      </td>
    </tr>
  );
}

export interface DataGridSubtotalCell {
  key: string;
  width: number;
  align: 'left' | 'center' | 'right';
  content: React.ReactNode;
  pinClassName?: string;
  pinStyle?: React.CSSProperties;
}

export interface DataGridSubtotalRowProps {
  cells: DataGridSubtotalCell[];
  height: number;
  className?: string;
}

/** A per-group or grand-total aggregate row. */
export function DataGridSubtotalRow({ cells, height, className }: DataGridSubtotalRowProps) {
  const styles = useDataGridStyles();
  return (
    <tr className={mergeClasses(styles.subtotalRow, className)} style={{ height }}>
      {cells.map((cell) => (
        <td
          key={cell.key}
          className={mergeClasses(
            styles.subtotalCell,
            cell.align === 'center' && styles.alignCenter,
            cell.align === 'right' && styles.alignRight,
            cell.pinClassName,
          )}
          style={{
            width: cell.width,
            minWidth: cell.width,
            maxWidth: cell.width,
            height,
            ...cell.pinStyle,
          }}
        >
          {cell.content}
        </td>
      ))}
    </tr>
  );
}
