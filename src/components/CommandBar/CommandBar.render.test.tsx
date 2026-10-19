import * as React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { CommandBar } from './CommandBar';
import type { CommandBarItem } from './CommandBar.types';

/**
 * A bar carrying something that is not a button.
 *
 * `content` exists so a bar can hold a control — a lookup, a filter, a read-out.
 * The rules worth pinning are that it renders as given, that nothing wraps it in
 * a button, and that the two sections put it where it was asked to go.
 */

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

function renderBar(items: CommandBarItem[]) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <CommandBar items={items} />
    </FluentProvider>,
  );
}

function isBefore(first: Element, second: Element): boolean {
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe('a command that is a control', () => {
  it('renders the content it was given', () => {
    renderBar([
      { key: 'picker', content: <input aria-label="Derived Pricing" />, pinned: true },
    ]);

    expect(screen.getByLabelText('Derived Pricing')).toBeInTheDocument();
  });

  it('does not wrap it in a button', () => {
    // A control inside a button is unusable — the button takes the click.
    renderBar([
      { key: 'picker', text: 'Should not render', content: <input aria-label="Picker" />, pinned: true },
    ]);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });

  it('sits where its alignment and order put it', () => {
    renderBar([
      { key: 'save', text: 'Save' },
      { key: 'picker', content: <input aria-label="Picker" />, pinned: true, order: 100, align: 'right' },
    ]);

    expect(isBefore(screen.getByRole('button', { name: /Save/ }), screen.getByLabelText('Picker'))).toBe(true);
  });

  it('renders alongside ordinary commands without disturbing them', () => {
    renderBar([
      { key: 'picker', content: <input aria-label="Picker" />, pinned: true, order: 5 },
      { key: 'save', text: 'Save', order: 10 },
      { key: 'del', text: 'Delete', order: 20 },
    ]);

    expect(screen.getByLabelText('Picker')).toBeInTheDocument();
    expect(
      isBefore(screen.getByRole('button', { name: /Save/ }), screen.getByRole('button', { name: /Delete/ })),
    ).toBe(true);
  });
});
