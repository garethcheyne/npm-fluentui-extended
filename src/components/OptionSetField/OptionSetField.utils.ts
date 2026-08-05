import { labelOf } from '../../api/metadata.types';
import type { AttributeMetadata } from '../../api/metadata.types';
import type { OptionSetOption } from './OptionSetField.types';

/**
 * Normalize the many shapes a caller (or Dynamics) may supply for a selection.
 *
 * Dynamics stores a multi-select picklist as a comma-separated string of numbers,
 * so "1,2" and [1, 2] have to mean the same thing here.
 */
export const parseSelectedValues = (value: number | number[] | string | null | undefined): number[] => {
  if (value === null || value === undefined || value === '') return [];

  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'number' && Number.isFinite(entry));
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? [value] : [];
  }

  return value
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((parsed) => Number.isFinite(parsed));
};

/** Encode a selection the way Dynamics stores a multi-select picklist. */
export const formatMultiSelectValue = (values: number[]): string => values.join(',');

/**
 * Pull renderable options off attribute metadata.
 *
 * A global option set leaves `OptionSet` empty and puts the values on
 * `GlobalOptionSet` instead - reading only the former is why a dropdown that should
 * be populated comes back empty.
 */
export const optionsFromMetadata = (attribute: AttributeMetadata | undefined): OptionSetOption[] => {
  if (!attribute) return [];

  const raw = attribute.OptionSet?.Options?.length
    ? attribute.OptionSet.Options
    : attribute.GlobalOptionSet?.Options || [];

  return raw.map((option) => ({
    value: option.Value,
    label: labelOf(option.Label, String(option.Value)),
    color: option.Color ?? undefined,
  }));
};

/** Join the labels of the selected options for display in a collapsed control. */
export const selectedLabels = (options: OptionSetOption[], values: number[]): string[] =>
  values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label));
