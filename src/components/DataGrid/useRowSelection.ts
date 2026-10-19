import * as React from 'react';
import type { DataGridSelectModifiers } from './DataGrid.types';

export interface UseRowSelectionOptions {
  /** Every selectable row id, in the order they are on screen. */
  rowIdsInOrder: string[];
  /**
   * Every row select-all should take, which is not the same list.
   *
   * A Shift range works down the screen, so it uses what is rendered. Select-all
   * is a statement about the data, so it has to include the rows inside a
   * collapsed group — folding a band away is not a way of deselecting it.
   * Defaults to {@link rowIdsInOrder}.
   */
  selectableRowIds?: string[];
  selectedRowIds: Set<string>;
  setSelectedRowIds: (ids: Set<string>) => void;
  /** Allow more than one row. Defaults to true. */
  multiSelect?: boolean;
}

export interface UseRowSelectionResult {
  /** Apply a click to the selection, honouring Shift and Ctrl. */
  selectRow: (rowId: string, modifiers?: DataGridSelectModifiers) => void;
  /**
   * Move the Shift anchor without touching the selection.
   *
   * A plain click on a cell does not select the row — that would fight cell
   * editing — but it does have to move the anchor, or a Shift-click afterwards
   * extends from wherever the user last happened to select something, which is
   * rarely where they are looking.
   */
  anchorRow: (rowId: string) => void;
  /** Select every row, or clear if they already all are. */
  toggleAll: () => void;
  /** True when every selectable row is selected. */
  allSelected: boolean;
}

/**
 * Row selection with the modifiers people already know from a file list.
 *
 * The rules are worth stating because they are easy to get subtly wrong:
 *
 * - A plain click replaces the selection with the row clicked.
 * - Ctrl (or Cmd) adds it, or removes it if it was already in.
 * - Shift takes everything between the last row clicked and this one.
 *
 * The anchor for a Shift range is the last row clicked *without* Shift, not the
 * last row selected. Using the latter makes a second Shift-click grow the range
 * from wherever the first one ended, so a range can only ever get bigger — which
 * is not how any other list behaves.
 */
export function useRowSelection(options: UseRowSelectionOptions): UseRowSelectionResult {
  const {
    rowIdsInOrder,
    selectableRowIds,
    selectedRowIds,
    setSelectedRowIds,
    multiSelect = true,
  } = options;

  const anchorRef = React.useRef<string | null>(null);

  // Read through a ref so the callbacks stay stable across renders: they are
  // handed to every row, and a new identity each render defeats the row memo.
  const orderRef = React.useRef(rowIdsInOrder);
  orderRef.current = rowIdsInOrder;
  const selectedRef = React.useRef(selectedRowIds);
  selectedRef.current = selectedRowIds;
  const selectableRef = React.useRef(selectableRowIds ?? rowIdsInOrder);
  selectableRef.current = selectableRowIds ?? rowIdsInOrder;

  const selectRow = React.useCallback(
    (rowId: string, modifiers: DataGridSelectModifiers = {}) => {
      const order = orderRef.current;
      const current = selectedRef.current;

      if (!multiSelect) {
        setSelectedRowIds(new Set([rowId]));
        anchorRef.current = rowId;
        return;
      }

      if (modifiers.shift && anchorRef.current) {
        const from = order.indexOf(anchorRef.current);
        const to = order.indexOf(rowId);
        if (from >= 0 && to >= 0) {
          const [start, end] = from <= to ? [from, to] : [to, from];
          // The range replaces the selection rather than adding to it, so
          // dragging a Shift-click back and forth shrinks it as well as grows
          // it. The anchor deliberately stays where it was.
          setSelectedRowIds(new Set(order.slice(start, end + 1)));
          return;
        }
      }

      if (modifiers.ctrl) {
        const next = new Set(current);
        if (next.has(rowId)) next.delete(rowId);
        else next.add(rowId);
        setSelectedRowIds(next);
        anchorRef.current = rowId;
        return;
      }

      setSelectedRowIds(new Set([rowId]));
      anchorRef.current = rowId;
    },
    [multiSelect, setSelectedRowIds],
  );

  const anchorRow = React.useCallback((rowId: string) => {
    anchorRef.current = rowId;
  }, []);

  const selectable = selectableRowIds ?? rowIdsInOrder;
  const allSelected = selectable.length > 0 && selectable.every((id) => selectedRowIds.has(id));

  const toggleAll = React.useCallback(() => {
    const ids = selectableRef.current;
    const everySelected = ids.length > 0 && ids.every((id) => selectedRef.current.has(id));
    setSelectedRowIds(everySelected ? new Set() : new Set(ids));
    anchorRef.current = null;
  }, [setSelectedRowIds]);

  return { selectRow, anchorRow, toggleAll, allSelected };
}
