import * as React from 'react';
import { UNFILLABLE_TYPES } from './DataGrid.tokens';
import type { DataGridColumn, DataGridRow } from './DataGrid.types';

/** Whether a column offers the fill handle. */
export function isFillable<T extends DataGridRow>(
  column: DataGridColumn<T> | undefined,
  gridEditable: boolean,
): boolean {
  if (!column) return false;
  if (column.fillable !== undefined) return column.fillable;
  if (!gridEditable || column.editable !== true) return false;
  // Dragging a calculated value would write the result, not the inputs that
  // produced it, so the filled rows would disagree with their own maths.
  if (column.computed && !column.computed.onEdit) return false;
  return !UNFILLABLE_TYPES.has(column.dataType ?? 'string');
}

/** The rows the drag is currently over, as the grid needs to draw them. */
export interface FillPreview {
  columnKey: string;
  /** Row ids covered, source included, so the whole block can be outlined. */
  rowIds: Set<string>;
}

export interface UseFillHandleOptions {
  /** Row ids in visual order. Group headers and subtotals are not in here. */
  rowIdsInOrder: string[];
  /** Called on release with the rows covered, source excluded. */
  onCommit: (columnKey: string, sourceRowId: string, targetRowIds: string[]) => void;
}

export interface UseFillHandleResult {
  /**
   * Attach to the handle's `onMouseDown`.
   *
   * The anchor is passed in rather than read back from the active cell: the
   * handle is rendered by the very cell it belongs to, so that cell already
   * knows, and taking it from there cannot go stale the way a shared ref can.
   */
  beginFill: (event: React.MouseEvent, rowId: string, columnKey: string) => void;
  /** Non-null while a drag is in progress. */
  preview: FillPreview | null;
}

/**
 * Excel's fill handle: grab the corner of a cell and drag to copy its value
 * over the rows you cross.
 *
 * The pointer is tracked on `document` rather than through React handlers on the
 * rows. Two reasons: the drag routinely leaves the grid entirely — people
 * overshoot, and the pointer ends up over the page around it — and rows unmount
 * as they virtualise out from under a long drag, taking their handlers with
 * them. A document listener survives both.
 *
 * The row under the pointer is found by hit-testing rather than by arithmetic on
 * the scroll offset, so it stays correct with grouped rows, subtotal rows and
 * per-row heights in play, none of which divide evenly.
 */
export function useFillHandle(options: UseFillHandleOptions): UseFillHandleResult {
  const { rowIdsInOrder, onCommit } = options;

  const [preview, setPreview] = React.useState<FillPreview | null>(null);

  const orderRef = React.useRef(rowIdsInOrder);
  orderRef.current = rowIdsInOrder;
  const onCommitRef = React.useRef(onCommit);
  onCommitRef.current = onCommit;

  const beginFill = React.useCallback(
    (event: React.MouseEvent, rowId: string, columnKey: string) => {
      const order = orderRef.current;
      const anchorIndex = order.indexOf(rowId);
      if (anchorIndex < 0) return;

      // Stops the mousedown also landing on the cell underneath, which would
      // move the active cell out from under the drag that is starting.
      event.preventDefault();
      event.stopPropagation();

      /**
       * The document the grid is actually in, which is not always the one this
       * module was loaded into.
       *
       * A grid portalled into an iframe — which is how a Dynamics web resource
       * and this library's own `ParentPortal` both work — renders into the
       * frame's document while the code runs in the parent's. Listening on the
       * module's `document` puts the listeners on a page the pointer never
       * visits, and the drag silently does nothing.
       */
      const doc = event.currentTarget.ownerDocument;

      let lastIndex = anchorIndex;

      const rowIndexAt = (clientX: number, clientY: number): number => {
        const element = doc.elementFromPoint(clientX, clientY);
        const rowEl = element?.closest<HTMLElement>('[data-row-id]');
        const id = rowEl?.dataset.rowId;
        if (!id) return lastIndex;
        const index = order.indexOf(id);
        return index < 0 ? lastIndex : index;
      };

      const apply = (index: number) => {
        lastIndex = index;
        const [from, to] = anchorIndex <= index ? [anchorIndex, index] : [index, anchorIndex];
        setPreview({ columnKey, rowIds: new Set(order.slice(from, to + 1)) });
      };

      apply(anchorIndex);

      // The pointer is over other cells, inputs and the page around the grid for
      // most of the drag, each with its own cursor, so `grabbing` is forced on
      // everything until release rather than set on the handle.
      const cursorStyle = doc.createElement('style');
      cursorStyle.textContent = '* { cursor: grabbing !important; }';
      doc.head.appendChild(cursorStyle);

      const onMove = (e: MouseEvent) => apply(rowIndexAt(e.clientX, e.clientY));

      const onUp = (e: MouseEvent) => {
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('mouseup', onUp);
        cursorStyle.remove();
        setPreview(null);

        const index = rowIndexAt(e.clientX, e.clientY);
        if (index === anchorIndex) return;
        const [from, to] = anchorIndex <= index ? [anchorIndex, index] : [index, anchorIndex];
        const targets = order.slice(from, to + 1).filter((id) => id !== rowId);
        if (targets.length > 0) onCommitRef.current(columnKey, rowId, targets);
      };

      doc.addEventListener('mousemove', onMove);
      doc.addEventListener('mouseup', onUp);
    },
    [],
  );

  // A drag that outlives its component would keep painting a preview over a grid
  // that has moved on.
  React.useEffect(() => () => setPreview(null), []);

  return { beginFill, preview };
}
