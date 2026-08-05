import * as React from 'react';
import { Dropdown, Field, Option, Spinner, Text, mergeClasses } from '@fluentui/react-components';
import { getAttributeOptions } from '../../api/metadata';
import { DEFAULT_FIELD_APPEARANCE, toListboxAppearance } from '../../types/appearance';
import { useOptionSetFieldStyles } from './OptionSetField.styles';
import {
  formatMultiSelectValue,
  optionsFromMetadata,
  parseSelectedValues,
  selectedLabels,
} from './OptionSetField.utils';
import type { OptionSetFieldProps, OptionSetOption } from './OptionSetField.types';

/**
 * A Dynamics 365 optionset / multi-select picklist field.
 *
 * Fluent's `Dropdown` has no notion of optionset metadata: it does not know that values
 * are numbers, that a global option set stores its options in a different place, or that
 * a multi-select picklist round-trips as a comma-separated string. This wraps that up so
 * callers hand over an entity and attribute name and get the right control back.
 */
export const OptionSetField: React.FC<OptionSetFieldProps> = ({
  options: providedOptions,
  entityName,
  attributeName,
  multiselect = false,
  value,
  onChange,
  showColors = false,
  placeholder = '---',
  disabled,
  appearance = DEFAULT_FIELD_APPEARANCE,
  clearable = true,
  label,
  validationMessage,
  required,
  className,
  onLoadError,
}) => {
  const styles = useOptionSetFieldStyles();
  const [loadedOptions, setLoadedOptions] = React.useState<OptionSetOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const shouldAutoLoad = !providedOptions?.length && Boolean(entityName && attributeName);

  React.useEffect(() => {
    if (!shouldAutoLoad || !entityName || !attributeName) return;

    let disposed = false;
    setLoading(true);
    setLoadError(null);

    getAttributeOptions(entityName, attributeName)
      .then((attribute) => {
        if (disposed) return;
        setLoadedOptions(optionsFromMetadata(attribute));
      })
      .catch((err: Error) => {
        if (disposed) return;
        setLoadError(err.message);
        onLoadError?.(err);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
    // onLoadError is intentionally omitted: callers commonly pass an inline function,
    // which would otherwise refetch metadata on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoLoad, entityName, attributeName]);

  const options = providedOptions?.length ? providedOptions : loadedOptions;
  const selectedValues = React.useMemo(() => parseSelectedValues(value), [value]);
  const displayLabels = React.useMemo(() => selectedLabels(options, selectedValues), [options, selectedValues]);

  const handleOptionSelect = React.useCallback(
    (_: unknown, data: { optionValue?: string; selectedOptions: string[] }) => {
      const parsed = data.selectedOptions
        .map((entry) => Number.parseInt(entry, 10))
        .filter((entry) => Number.isFinite(entry));

      if (multiselect) {
        onChange?.(parsed.length > 0 ? parsed : clearable ? null : []);
        return;
      }

      // Single-select: re-picking the current option clears it when clearable
      const next = parsed[0];
      if (next === undefined || (clearable && next === selectedValues[0] && data.optionValue !== undefined)) {
        onChange?.(clearable ? null : (selectedValues[0] ?? null));
        return;
      }
      onChange?.(next);
    },
    [multiselect, onChange, clearable, selectedValues],
  );

  const control = (
    <>
      <Dropdown
        className={styles.dropdown}
        listbox={{ className: styles.listbox }}
        // Dropdown never supported the deprecated shadow fills, so they are narrowed
        appearance={toListboxAppearance(appearance)}
        multiselect={multiselect}
        placeholder={loading ? 'Loading...' : placeholder}
        disabled={disabled || loading}
        value={displayLabels.join(', ')}
        selectedOptions={selectedValues.map(String)}
        onOptionSelect={handleOptionSelect}
      >
        {options.map((option) => (
          <Option key={option.value} value={String(option.value)} text={option.label} disabled={option.disabled}>
            <span className={styles.optionContent}>
              {showColors && (
                <span
                  className={styles.swatch}
                  style={option.color ? { backgroundColor: option.color } : undefined}
                  aria-hidden
                />
              )}
              <span className={styles.optionLabel}>{option.label}</span>
            </span>
          </Option>
        ))}
      </Dropdown>

      {loading && (
        <div className={styles.loadingRow}>
          <Spinner size="tiny" />
          <Text size={200}>Loading options...</Text>
        </div>
      )}

      {loadError && <Text className={styles.errorText}>{loadError}</Text>}
    </>
  );

  if (!label && !validationMessage) {
    return <div className={mergeClasses(styles.root, className)}>{control}</div>;
  }

  return (
    <Field
      className={mergeClasses(styles.root, className)}
      label={label}
      required={required}
      validationMessage={validationMessage}
    >
      {control}
    </Field>
  );
};

export { formatMultiSelectValue, parseSelectedValues };
