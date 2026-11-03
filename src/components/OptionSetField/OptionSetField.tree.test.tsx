import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { OptionSetField } from './OptionSetField';
import type { OptionSetOption } from './OptionSetField.types';

const OPTIONS: OptionSetOption[] = [
  { value: 1, label: 'Electrical' },
  { value: 10, label: 'Lighting', parentValue: 1 },
  { value: 2, label: 'Plumbing' },
  { value: 20, label: 'Taps', parentValue: 2 },
];

const renderField = (props: Partial<React.ComponentProps<typeof OptionSetField>> = {}) =>
  render(
    <FluentProvider theme={webLightTheme}>
      <OptionSetField open hierarchical options={OPTIONS} {...props} />
    </FluentProvider>,
  );

const optionNames = () => screen.getAllByRole('option').map((option) => option.textContent);

describe('a hierarchical OptionSetField', () => {
  it('lists each child under its parent', () => {
    renderField();

    expect(optionNames()).toEqual(['Electrical', 'Lighting', 'Plumbing', 'Taps']);
  });

  it('works out parents for options that carry none, through getParentValue', () => {
    // Metadata-loaded choices have no parent; a value range is a common convention
    renderField({
      options: OPTIONS.map(({ parentValue: _parentValue, ...option }) => option),
      getParentValue: (option) => (option.value >= 10 ? Math.floor(option.value / 10) : null),
    });

    expect(optionNames()).toEqual(['Electrical', 'Lighting', 'Plumbing', 'Taps']);
  });

  it('makes a parent a heading when parents are not selectable', () => {
    renderField({ selectableParents: false });

    expect(screen.getByRole('option', { name: 'Electrical' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('option', { name: 'Lighting' })).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the chosen value with its path', () => {
    renderField({ open: false, value: 20, showPath: true });

    expect(screen.getByRole('combobox')).toHaveValue('Plumbing › Taps');
  });
});
