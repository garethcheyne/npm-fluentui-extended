import * as React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Lookup } from './Lookup';
import type { LookupOption } from './Lookup.types';

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 200 });
  HTMLElement.prototype.getBoundingClientRect = function getRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 300, bottom: 32, width: 300, height: 32, toJSON: () => '' };
  } as never;
  HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
});

const CATEGORIES: LookupOption[] = [
  { key: 'elec', text: 'Electrical' },
  { key: 'light', text: 'Lighting', parentKey: 'elec' },
  { key: 'led', text: 'LED downlights', parentKey: 'light' },
  { key: 'plumb', text: 'Plumbing' },
  { key: 'taps', text: 'Taps', parentKey: 'plumb' },
];

function renderTree(props: Partial<React.ComponentProps<typeof Lookup>> = {}) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <Lookup open hierarchical options={CATEGORIES} aria-label="Category" {...props} />
    </FluentProvider>,
  );
}

const visibleNames = () => screen.getAllByRole('treeitem').map((row) => row.textContent);

describe('a hierarchical Lookup', () => {
  it('renders a tree, each row knowing its level', () => {
    renderTree();

    expect(screen.getByRole('tree')).toBeInTheDocument();
    const led = screen.getByText('LED downlights').closest('[role="treeitem"]');
    expect(led).toHaveAttribute('aria-level', '3');
    expect(screen.getByText('Electrical').closest('[role="treeitem"]')).toHaveAttribute('aria-expanded', 'true');
  });

  it('leaves parentKey alone when hierarchical is off', () => {
    renderTree({ hierarchical: false });

    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  it('opens only the levels defaultExpanded asks for', () => {
    renderTree({ defaultExpanded: 1 });

    expect(visibleNames()).toEqual(['Electrical', 'Lighting', 'Plumbing', 'Taps']);
  });

  it('folds a node from its chevron without choosing it', () => {
    const onOptionSelect = vi.fn();
    renderTree({ onOptionSelect });

    const electrical = screen.getByText('Electrical').closest('[role="treeitem"]')!;
    fireEvent.click(electrical.querySelector('[aria-hidden]')!);

    expect(visibleNames()).toEqual(['Electrical', 'Plumbing', 'Taps']);
    expect(onOptionSelect).not.toHaveBeenCalled();
  });

  it('keeps each search match with its ancestors', () => {
    renderTree({ defaultExpanded: 'none' });

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'led' } });

    expect(visibleNames()).toEqual(['Electrical', 'Lighting', 'LED downlights']);
  });

  it('only opens and closes a parent when parents are not selectable', () => {
    const onOptionSelect = vi.fn();
    renderTree({ selectableParents: false, onOptionSelect });

    fireEvent.click(screen.getByText('Plumbing'));
    expect(onOptionSelect).not.toHaveBeenCalled();
    expect(visibleNames()).not.toContain('Taps');

    fireEvent.click(screen.getByText('LED downlights'));
    expect(onOptionSelect.mock.calls[0][0]).toMatchObject({ key: 'led' });
  });

  it('opens and closes with the arrow keys once a row is highlighted', () => {
    renderTree({ defaultExpanded: 'none' });
    const input = screen.getByLabelText('Category');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(visibleNames()).toEqual(['Electrical', 'Lighting', 'Plumbing']);

    // Right again moves into the first child; Left from there goes back up
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('light'));
    fireEvent.keyDown(input, { key: 'ArrowLeft' });
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('elec'));

    fireEvent.keyDown(input, { key: 'ArrowLeft' });
    expect(visibleNames()).toEqual(['Electrical', 'Plumbing']);
  });

  it('loads a node’s children the first time it opens', async () => {
    const onLoadChildren = vi.fn(async (option: LookupOption) => [
      { key: `${option.key}-1`, text: 'Loaded child' },
    ]);
    renderTree({ options: [{ key: 'root', text: 'Root', hasChildren: true }], onLoadChildren });

    const root = screen.getByText('Root').closest('[role="treeitem"]')!;
    expect(root).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(root.querySelector('[aria-hidden]')!);

    await waitFor(() => expect(screen.getByText('Loaded child')).toBeInTheDocument());
    expect(onLoadChildren).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Loaded child').closest('[role="treeitem"]')).toHaveAttribute('aria-level', '2');
  });

  it('shows the chosen value with its path', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <Lookup hierarchical showPath options={CATEGORIES} selectedKey="led" aria-label="Category" />
      </FluentProvider>,
    );

    expect(screen.getByText('Electrical › Lighting › LED downlights')).toBeInTheDocument();
  });
});
