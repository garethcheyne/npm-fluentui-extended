import { describe, it, expect } from 'vitest';
import {
  formatMultiSelectValue,
  optionsFromMetadata,
  parseSelectedValues,
  selectedLabels,
} from './OptionSetField.utils';
import type { AttributeMetadata } from '../../api/metadata.types';

describe('parseSelectedValues', () => {
  it('reads the comma-separated string Dynamics stores for a multi-select', () => {
    expect(parseSelectedValues('1,2,3')).toEqual([1, 2, 3]);
    expect(parseSelectedValues('1, 2 , 3')).toEqual([1, 2, 3]);
  });

  it('accepts a single number and an array alike', () => {
    expect(parseSelectedValues(5)).toEqual([5]);
    expect(parseSelectedValues([1, 2])).toEqual([1, 2]);
  });

  it('treats zero as a real option value rather than empty', () => {
    // statecode 0 = Active, so dropping it would silently deselect Active records
    expect(parseSelectedValues(0)).toEqual([0]);
    expect(parseSelectedValues('0')).toEqual([0]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseSelectedValues(null)).toEqual([]);
    expect(parseSelectedValues(undefined)).toEqual([]);
    expect(parseSelectedValues('')).toEqual([]);
  });

  it('discards entries that are not numbers', () => {
    expect(parseSelectedValues('1,nope,3')).toEqual([1, 3]);
    expect(parseSelectedValues([1, Number.NaN, 3])).toEqual([1, 3]);
  });
});

describe('formatMultiSelectValue', () => {
  it('encodes back into the stored representation', () => {
    expect(formatMultiSelectValue([1, 2, 3])).toBe('1,2,3');
    expect(formatMultiSelectValue([])).toBe('');
  });

  it('round-trips through parseSelectedValues', () => {
    expect(parseSelectedValues(formatMultiSelectValue([4, 8, 15]))).toEqual([4, 8, 15]);
  });
});

describe('optionsFromMetadata', () => {
  const withLabel = (value: number, label: string, color?: string) => ({
    Value: value,
    Label: { UserLocalizedLabel: { Label: label } },
    Color: color,
  });

  it('reads options from a local option set', () => {
    const attribute: AttributeMetadata = {
      LogicalName: 'statuscode',
      OptionSet: { Options: [withLabel(1, 'Active'), withLabel(2, 'Inactive')] },
    };

    expect(optionsFromMetadata(attribute)).toEqual([
      { value: 1, label: 'Active', color: undefined },
      { value: 2, label: 'Inactive', color: undefined },
    ]);
  });

  it('falls back to a global option set when the local one is empty', () => {
    // The empty-dropdown bug: global option sets populate a different property
    const attribute: AttributeMetadata = {
      LogicalName: 'industrycode',
      OptionSet: { Options: [] },
      GlobalOptionSet: { Options: [withLabel(10, 'Technology')] },
    };

    expect(optionsFromMetadata(attribute)).toEqual([{ value: 10, label: 'Technology', color: undefined }]);
  });

  it('carries the configured colour through', () => {
    const attribute: AttributeMetadata = {
      LogicalName: 'statuscode',
      OptionSet: { Options: [withLabel(1, 'Active', '#0078d4')] },
    };

    expect(optionsFromMetadata(attribute)[0].color).toBe('#0078d4');
  });

  it('falls back to the numeric value when a label is missing', () => {
    const attribute: AttributeMetadata = {
      LogicalName: 'statuscode',
      OptionSet: { Options: [{ Value: 7 }] },
    };

    expect(optionsFromMetadata(attribute)[0].label).toBe('7');
  });

  it('returns an empty array for an attribute with no options at all', () => {
    expect(optionsFromMetadata(undefined)).toEqual([]);
    expect(optionsFromMetadata({ LogicalName: 'name' })).toEqual([]);
  });
});

describe('selectedLabels', () => {
  const options = [
    { value: 1, label: 'Active' },
    { value: 2, label: 'Inactive' },
  ];

  it('maps values to labels in selection order', () => {
    expect(selectedLabels(options, [2, 1])).toEqual(['Inactive', 'Active']);
  });

  it('skips values with no matching option', () => {
    expect(selectedLabels(options, [1, 99])).toEqual(['Active']);
  });
});
