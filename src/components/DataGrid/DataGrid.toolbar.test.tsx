import * as React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DataGrid } from './DataGrid';
import type { DataGridColumn } from './DataGrid.types';
import type { CommandBarItem } from '../CommandBar';

/**
 * Where the toolbar's commands actually end up.
 *
 * `orderCommandBarItems` is unit-tested on its own, but the thing consumers
 * care about is the rendered result — and the search box is the part that makes
 * it interesting, because it is not a command at all. It travels through the
 * ordering as a placeholder and is swapped for the real control afterwards, so
 * only a rendered test can show that a command numbered above it truly lands
 * after it.
 */

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 600 });
  HTMLElement.prototype.getBoundingClientRect = function getRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 600, width: 1000, height: 600, toJSON: () => '' };
  } as never;
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

interface Line extends Record<string, unknown> {
  id: string;
  code: string;
  category: string;
}

const ROWS: Line[] = [{ id: 'r1', code: 'AAA', category: 'Alpha' }];

const COLUMNS: DataGridColumn<Line>[] = [
  { key: 'code', label: 'Code' },
  { key: 'category', label: 'Category', groupable: true },
];

function renderToolbar(
  toolbarItems: CommandBarItem[],
  props: Partial<React.ComponentProps<typeof DataGrid<Line>>> = {},
) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <DataGrid<Line>
        data={ROWS}
        columns={COLUMNS}
        getRowId={(row) => row.id}
        searchColumns={['code']}
        searchPlaceholder="Find"
        toolbarItems={toolbarItems}
        {...props}
      />
    </FluentProvider>,
  );
}

/** Whether `first` comes before `second` in the document. */
function isBefore(first: Element, second: Element): boolean {
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

const search = () => screen.getByPlaceholderText('Find');
const command = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

describe('ordering the toolbar', () => {
  it('puts a right-aligned command numbered above the search after it', () => {
    // The case from the brief: search sits at 100 right, so 101 lands beyond it.
    renderToolbar([{ key: 'mine', text: 'Mine', order: 101, align: 'right' }]);

    expect(isBefore(search(), command('Mine'))).toBe(true);
  });

  it('puts a right-aligned command numbered below the search before it', () => {
    renderToolbar([{ key: 'mine', text: 'Mine', order: 90, align: 'right' }]);

    expect(isBefore(command('Mine'), search())).toBe(true);
  });

  it('drops a numbered command between two built-ins', () => {
    // Filters is 10 and Group is 20; the gaps exist so this needs no renumbering.
    renderToolbar([{ key: 'mine', text: 'Mine', order: 15 }]);

    expect(isBefore(command('Filters'), command('Mine'))).toBe(true);
    expect(isBefore(command('Mine'), command('Group'))).toBe(true);
  });

  it('leaves unnumbered commands in the order they were given', () => {
    // Ordering is opt-in: a consumer that numbers nothing must get its list back
    // unchanged, or every existing toolbar quietly rearranges itself.
    renderToolbar([
      { key: 'a', text: 'Alpha' },
      { key: 'b', text: 'Bravo' },
      { key: 'c', text: 'Charlie' },
    ]);

    expect(isBefore(command('Alpha'), command('Bravo'))).toBe(true);
    expect(isBefore(command('Bravo'), command('Charlie'))).toBe(true);
  });

  it('still leads with the app’s commands when placement is `start`', () => {
    // The shorthand PricelistGrid relies on. Numbering the built-ins must not
    // have quietly promoted them above a consumer that never numbered anything.
    renderToolbar([{ key: 'save', text: 'Save' }], { toolbarItemsPlacement: 'start' });

    expect(isBefore(command('Save'), command('Filters'))).toBe(true);
  });

  it('keeps the search at the far end by default', () => {
    renderToolbar([{ key: 'mine', text: 'Mine' }]);

    expect(isBefore(command('Mine'), search())).toBe(true);
    expect(isBefore(command('Reset layout'), search())).toBe(true);
  });
});
