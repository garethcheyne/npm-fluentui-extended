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

/**
 * The rows a double-click on the handle fills: every row below the source, down
 * to the last one shown, overwriting what is there.
 *
 * Not Excel's stop-at-the-next-value. A checkbox or choice column never has an
 * empty cell, so that rule would fill nothing in exactly the columns people most
 * want to set in bulk. Only the rows shown are in the order, so a filter limits
 * the fill to the rows it lets through.
 */
export function rowsToFillDown(rowIdsInOrder: string[], sourceRowId: string): string[] {
  const source = rowIdsInOrder.indexOf(sourceRowId);
  return source < 0 ? [] : rowIdsInOrder.slice(source + 1);
}

/** How close to the top or bottom edge, in pixels, the drag starts scrolling. */
const AUTO_SCROLL_EDGE = 32;
/** The most a drag scrolls per animation frame, in pixels. */
const AUTO_SCROLL_MAX_STEP = 40;

/**
 * How far to scroll this frame for a pointer at `y`: none inside the edges,
 * growing the further the pointer is past one, so overshooting goes faster.
 */
export function autoScrollStep(y: number, top: number, bottom: number): number {
  const speed = (distance: number) =>
    Math.min(AUTO_SCROLL_MAX_STEP, Math.max(2, Math.round(distance / 2)));
  if (y > bottom - AUTO_SCROLL_EDGE) return speed(y - (bottom - AUTO_SCROLL_EDGE));
  if (y < top + AUTO_SCROLL_EDGE) return -speed(top + AUTO_SCROLL_EDGE - y);
  return 0;
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
  /** The grid's scrolling body, scrolled when the drag nears its top or bottom edge. */
  scrollRef?: React.RefObject<HTMLElement | null>;
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
 *
 * Holding the pointer near the top or bottom edge of the grid, or past it,
 * scrolls the grid, so a drag can reach rows that were not on screen when it
 * started.
 */
export function useFillHandle(options: UseFillHandleOptions): UseFillHandleResult {
  const { rowIdsInOrder, onCommit, scrollRef } = options;

  const [preview, setPreview] = React.useState<FillPreview | null>(null);

  const orderRef = React.useRef(rowIdsInOrder);
  orderRef.current = rowIdsInOrder;
  const onCommitRef = React.useRef(onCommit);
  onCommitRef.current = onCommit;
  /** Ends the drag in progress, if any, without committing it. */
  const stopRef = React.useRef<(() => void) | null>(null);

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
      const win = doc.defaultView ?? window;
      const scroller = scrollRef?.current ?? null;

      let lastIndex = anchorIndex;
      let pointer = { x: event.clientX, y: event.clientY };
      let frame = 0;

      /**
       * The part of the scroller rows show in, in client coordinates: below the
       * sticky header, above any sticky footer, inside the scrollbars.
       */
      const rowArea = () => {
        if (!scroller) return null;
        const rect = scroller.getBoundingClientRect();
        const top = Math.max(
          rect.top + scroller.clientTop,
          scroller.querySelector('thead')?.getBoundingClientRect().bottom ?? -Infinity,
        );
        const bottom = Math.min(
          rect.top + scroller.clientTop + scroller.clientHeight,
          scroller.querySelector('tfoot')?.getBoundingClientRect().top ?? Infinity,
        );
        const left = rect.left + scroller.clientLeft;
        const right = left + scroller.clientWidth;
        return { top, bottom, left, right };
      };

      const rowIndexAt = (clientX: number, clientY: number): number => {
        // A pointer past the edge of the grid counts as over the edge row, so
        // overshooting while it scrolls still extends the fill.
        const area = rowArea();
        if (area && area.bottom > area.top && area.right > area.left) {
          clientX = Math.min(Math.max(clientX, area.left + 1), area.right - 1);
          clientY = Math.min(Math.max(clientY, area.top + 1), area.bottom - 1);
        }
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

      /**
       * One frame of auto-scroll. It keeps going while the pointer is held at an
       * edge, since no mousemove arrives then, and stops once the grid can
       * scroll no further that way; the next move starts it again.
       */
      const tick = () => {
        frame = 0;
        const area = rowArea();
        if (!scroller || !area) return;
        const step = autoScrollStep(pointer.y, area.top, area.bottom);
        if (step === 0) return;
        const before = scroller.scrollTop;
        scroller.scrollTop = before + step;
        if (scroller.scrollTop === before) return;
        // Rows virtualise in behind the scroll a frame later, so the row under
        // the pointer is looked up again on every frame rather than once.
        apply(rowIndexAt(pointer.x, pointer.y));
        frame = win.requestAnimationFrame(tick);
      };

      const onMove = (e: MouseEvent) => {
        pointer = { x: e.clientX, y: e.clientY };
        apply(rowIndexAt(e.clientX, e.clientY));
        if (!frame) frame = win.requestAnimationFrame(tick);
      };

      const stop = () => {
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('mouseup', onUp);
        if (frame) win.cancelAnimationFrame(frame);
        frame = 0;
        cursorStyle.remove();
        stopRef.current = null;
      };

      const onUp = (e: MouseEvent) => {
        stop();
        setPreview(null);

        const index = rowIndexAt(e.clientX, e.clientY);
        if (index === anchorIndex) return;
        const [from, to] = anchorIndex <= index ? [anchorIndex, index] : [index, anchorIndex];
        const targets = order.slice(from, to + 1).filter((id) => id !== rowId);
        if (targets.length > 0) onCommitRef.current(columnKey, rowId, targets);
      };

      stopRef.current?.();
      stopRef.current = stop;
      doc.addEventListener('mousemove', onMove);
      doc.addEventListener('mouseup', onUp);
    },
    [scrollRef],
  );

  // A drag that outlives its component would keep painting a preview, and
  // scrolling, a grid that has moved on.
  React.useEffect(
    () => () => {
      stopRef.current?.();
      setPreview(null);
    },
    [],
  );

  return { beginFill, preview };
}
