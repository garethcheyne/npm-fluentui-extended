import { describe, it, expect } from 'vitest';
import { editorText } from './DataGrid.utils';

describe('editorText', () => {
  it('edits a number at the places it is shown at', () => {
    expect(editorText(13.043478, { key: 'gp', dataType: 'percent' })).toBe('13.04');
    expect(editorText(87, { key: 'cost', dataType: 'money' })).toBe('87.00');
  });

  it('honours a column precision', () => {
    expect(editorText(13.043478, { key: 'gp', dataType: 'decimal', precision: 1 })).toBe('13.0');
  });

  it('leaves out grouping, so the text parses back', () => {
    expect(editorText(1234567.891, { key: 'total', dataType: 'money' })).toBe('1234567.89');
  });

  it('shows an integer whole', () => {
    expect(editorText(7, { key: 'qty', dataType: 'integer' })).toBe('7');
  });

  it('is empty for no value, and plain text for anything else', () => {
    expect(editorText(null, { key: 'qty', dataType: 'integer' })).toBe('');
    expect(editorText('SKU-1', { key: 'code', dataType: 'string' })).toBe('SKU-1');
  });
});
