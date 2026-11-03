import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DateTimeField } from './DateTimeField';

/** Controlled, the way a form or a grid cell holds it. */
function Controlled({ initial }: { initial: string | null }) {
  const [value, setValue] = React.useState<string | null>(initial);
  return (
    <FluentProvider theme={webLightTheme}>
      <DateTimeField behavior="DateOnly" value={value} onChange={setValue} allowFreeType clearable label="Required by" />
      <output data-testid="stored">{value ?? 'null'}</output>
    </FluentProvider>
  );
}

describe('clearing a free-type DateTimeField', () => {
  it('empties the text as well as the value', () => {
    render(<Controlled initial="2026-11-06" />);
    const input = screen.getByLabelText('Required by') as HTMLInputElement;
    expect(input.value).not.toBe('');

    // The clear button takes focus on its way to being clicked, as a pointer does
    const clear = screen.getByLabelText('Clear date');
    fireEvent.focus(clear);
    fireEvent.click(clear);

    expect(screen.getByTestId('stored').textContent).toBe('null');
    expect(input.value).toBe('');
  });

  it('does not bring the old date back when the field is next left', () => {
    // The text used to stay stale, and leaving the input re-parsed it into the old value
    render(<Controlled initial="2026-11-06" />);
    const input = screen.getByLabelText('Required by') as HTMLInputElement;
    const clear = screen.getByLabelText('Clear date');

    fireEvent.focus(clear);
    fireEvent.click(clear);
    fireEvent.blur(clear);
    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(screen.getByTestId('stored').textContent).toBe('null');
  });
});
