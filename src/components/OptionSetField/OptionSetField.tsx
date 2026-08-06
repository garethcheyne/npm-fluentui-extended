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
 * Calculate relative luminance from a hex colour and return the appropriate
 * text class for contrast (light text on dark backgrounds, dark text on light).
 */
function getBadgeTextClass(
  hex: string,
  styles: { badgeLightText: string; badgeDarkText: string },
): string {
  // Parse hex colour (supports #RGB and #RRGGBB)
  const cleanHex = hex.replace('#', '');
  const r =
    cleanHex.length === 3
      ? parseInt(cleanHex[0] + cleanHex[0], 16)
      : parseInt(cleanHex.slice(0, 2), 16);
  const g =
    cleanHex.length === 3
      ? parseInt(cleanHex[1] + cleanHex[1], 16)
      : parseInt(cleanHex.slice(2, 4), 16);
  const b =
    cleanHex.length === 3
      ? parseInt(cleanHex[2] + cleanHex[2], 16)
      : parseInt(cleanHex.slice(4, 6), 16);

  // Relative luminance formula (WCAG 2.0)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? styles.badgeDarkText : styles.badgeLightText;
}

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
  asBadge = false,
  placeholder = '---',
  disabled,
  appearance = DEFAULT_FIELD_APPEARANCE,
  clearable = true,
  open,
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

  // Get full selected option objects for badge rendering
  const selectedOptions = React.useMemo(
    () => options.filter((opt) => selectedValues.includes(opt.value)),
    [options, selectedValues],
  );

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

  // Build the button content when asBadge is enabled
  const badgeButtonContent =
    asBadge && selectedOptions.length > 0 ? (
      <span className={styles.badgeContainer}>
        {selectedOptions.map((opt) =>
          opt.color ? (
            <span
              key={opt.value}
              className={mergeClasses(styles.badge, getBadgeTextClass(opt.color, styles))}
              style={{ backgroundColor: opt.color }}
            >
              {opt.label}
            </span>
          ) : (
            <span key={opt.value} className={styles.badgeNoColor}>
              {opt.label}
            </span>
          ),
        )}
      </span>
    ) : undefined;

  const control = (
    <>
      <Dropdown
        className={styles.dropdown}
        listbox={{ className: styles.listbox }}
        open={open}
        // Dropdown never supported the deprecated shadow fills, so they are narrowed
        appearance={toListboxAppearance(appearance)}
        multiselect={multiselect}
        placeholder={loading ? 'Loading...' : placeholder}
        disabled={disabled || loading}
        value={badgeButtonContent ? '' : displayLabels.join(', ')}
        selectedOptions={selectedValues.map(String)}
        onOptionSelect={handleOptionSelect}
        button={badgeButtonContent ? { children: badgeButtonContent } : undefined}
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
