import * as React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Lookup } from './Lookup';
import type { LookupOption } from './Lookup.types';

/**
 * The Lookup's first tests.
 *
 * Deliberately nothing about *where* the list appears: jsdom answers every
 * measurement with the same stubbed rectangle, so a positioning assertion here
 * would check the stub rather than the layout and would pass while the list sat
 * in the wrong place on screen. What is worth pinning is that the list renders
 * what it was handed, says so when it has nothing, and reports what was picked.
 */

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 200 });
  HTMLElement.prototype.getBoundingClientRect = function getRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 300, bottom: 32, width: 300, height: 32, toJSON: () => '' };
  } as never;
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const OPTIONS: LookupOption[] = [
  { key: 'p1', text: 'Tap, Chrome', secondaryText: '(TAP-001)' },
  { key: 'p2', text: 'Sink, Steel', secondaryText: '(SNK-002)' },
];

/** Held open, so the tests do not depend on focus behaviour to see the list. */
function renderLookup(props: Partial<React.ComponentProps<typeof Lookup>> = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <Lookup open options={OPTIONS} aria-label="Product" {...props} />
    </FluentProvider>,
  );
}

describe('the list a Lookup shows', () => {
  it('renders every option it was given', () => {
    renderLookup();

    expect(screen.getByText('Tap, Chrome')).toBeInTheDocument();
    expect(screen.getByText('Sink, Steel')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('says when it has nothing to show', () => {
    renderLookup({ options: [], noResultsMessage: 'No matches' });

    expect(screen.getByText('No matches')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('renders a heading above the options when given one', () => {
    renderLookup({ header: <span>Products</span> });

    expect(screen.getByText('Products')).toBeInTheDocument();
  });

  it('shows an option’s secondary line', () => {
    renderLookup();

    expect(screen.getByText('(TAP-001)')).toBeInTheDocument();
  });

  it('reports what was typed, for a caller that searches server-side', async () => {
    // Every async lookup in this library is driven this way: the caller runs the
    // query and hands back options, rather than the list filtering what it has.
    const onSearchChange = vi.fn();
    renderLookup({ onSearchChange, searchDebounceMs: 0, disableClientFilter: true });

    fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'sink' } });

    await waitFor(() => expect(onSearchChange).toHaveBeenCalledWith('sink'));
  });

  it('reports the option that was picked', () => {
    const onOptionSelect = vi.fn();
    renderLookup({ onOptionSelect });

    fireEvent.click(screen.getByText('Sink, Steel'));

    expect(onOptionSelect).toHaveBeenCalledTimes(1);
    expect(onOptionSelect.mock.calls[0][0]).toMatchObject({ key: 'p2', text: 'Sink, Steel' });
  });

  it('shows a spinner instead of an empty list while loading', () => {
    // Without this a search still in flight reads as a search that found
    // nothing, which is what sent people looking for a bug that was not there.
    renderLookup({ options: [], loading: true, noResultsMessage: 'No matches' });

    expect(screen.queryByText('No matches')).not.toBeInTheDocument();
  });
});

describe('editSelectionOnBackspace', () => {
  // Not held open: the badge and the edit both depend on the list opening and closing
  const renderSelected = (props: Partial<React.ComponentProps<typeof Lookup>> = {}) => {
    const onSearchChange = vi.fn();
    const onOptionSelect = vi.fn();
    render(
      <FluentProvider theme={webLightTheme}>
        <Lookup
          options={OPTIONS}
          selectedOption={OPTIONS[0]}
          onSearchChange={onSearchChange}
          onOptionSelect={onOptionSelect}
          searchDebounceMs={0}
          editSelectionOnBackspace
          {...props}
        />
      </FluentProvider>,
    );
    return { onSearchChange, onOptionSelect };
  };

  const openInput = () => {
    fireEvent.click(screen.getByText('Tap, Chrome'));
    return screen.getByRole('textbox') as HTMLInputElement;
  };

  it('hands the selected value back as search text on Backspace', async () => {
    const { onSearchChange, onOptionSelect } = renderSelected();
    const input = openInput();

    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(input.value).toBe('Tap, Chrome');
    await waitFor(() => expect(onSearchChange).toHaveBeenCalledWith('Tap, Chrome'));
    // Editing is not clearing - the record keeps its value until a new choice
    expect(onOptionSelect).not.toHaveBeenCalled();
  });

  it('puts the badge back when the edit is abandoned', () => {
    renderSelected();
    const input = openInput();

    fireEvent.keyDown(input, { key: 'Backspace' });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.getByText('Tap, Chrome')).toBeInTheDocument();
  });

  it('leaves Backspace alone when the option is off', () => {
    renderSelected({ editSelectionOnBackspace: false });
    const input = openInput();

    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(input.value).toBe('');
  });
});
