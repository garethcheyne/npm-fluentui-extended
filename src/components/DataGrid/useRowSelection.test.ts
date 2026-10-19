import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRowSelection } from './useRowSelection';

const ORDER = ['a', 'b', 'c', 'd', 'e'];

/** Drives the hook with the selection held outside it, as the grid does. */
function setup(multiSelect = true) {
  let selected = new Set<string>();
  const view = renderHook(
    (props: { selected: Set<string> }) =>
      useRowSelection({
        rowIdsInOrder: ORDER,
        selectedRowIds: props.selected,
        setSelectedRowIds: (next) => {
          selected = next;
        },
        multiSelect,
      }),
    { initialProps: { selected } },
  );

  return {
    result: view.result,
    click(rowId: string, modifiers?: { ctrl?: boolean; shift?: boolean }) {
      act(() => view.result.current.selectRow(rowId, modifiers));
      view.rerender({ selected });
      return [...selected];
    },
    toggleAll() {
      act(() => view.result.current.toggleAll());
      view.rerender({ selected });
      return [...selected];
    },
  };
}

describe('useRowSelection', () => {
  it('replaces the selection on a plain click', () => {
    const grid = setup();
    expect(grid.click('b')).toEqual(['b']);
    expect(grid.click('d')).toEqual(['d']);
  });

  it('adds and removes with Ctrl', () => {
    const grid = setup();
    grid.click('b');
    expect(grid.click('d', { ctrl: true })).toEqual(['b', 'd']);
    expect(grid.click('b', { ctrl: true })).toEqual(['d']);
  });

  it('takes the range between the anchor and the click with Shift', () => {
    const grid = setup();
    grid.click('b');
    expect(grid.click('d', { shift: true })).toEqual(['b', 'c', 'd']);
  });

  it('extends a range backwards', () => {
    const grid = setup();
    grid.click('d');
    expect(grid.click('b', { shift: true })).toEqual(['b', 'c', 'd']);
  });

  it('shrinks a range on a second Shift-click, rather than only growing it', () => {
    // The anchor stays where the last plain click was. Moving it to the end of
    // the previous range would make every Shift-click grow the selection, which
    // is not how any other list behaves.
    const grid = setup();
    grid.click('a');
    expect(grid.click('e', { shift: true })).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(grid.click('c', { shift: true })).toEqual(['a', 'b', 'c']);
  });

  it('falls back to a plain click when Shift is held with no anchor', () => {
    const grid = setup();
    expect(grid.click('c', { shift: true })).toEqual(['c']);
  });

  it('ignores the modifiers entirely when multi-select is off', () => {
    const grid = setup(false);
    grid.click('b');
    expect(grid.click('d', { ctrl: true })).toEqual(['d']);
    expect(grid.click('a', { shift: true })).toEqual(['a']);
  });

  it('selects everything, then clears on a second call', () => {
    const grid = setup();
    expect(grid.toggleAll()).toEqual(ORDER);
    expect(grid.toggleAll()).toEqual([]);
  });

  it('reports allSelected only when every row is in', () => {
    const grid = setup();
    expect(grid.result.current.allSelected).toBe(false);
    grid.toggleAll();
    expect(grid.result.current.allSelected).toBe(true);
  });
});
