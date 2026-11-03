import * as React from 'react';
import { Combobox, Field, Option, Spinner, Text, mergeClasses } from '@fluentui/react-components';
import { getAttributeOptions } from '../../api/metadata';
import { buildHierarchy, flattenHierarchy, pathOf } from '../Lookup/Lookup.hierarchy';
import { DEFAULT_FIELD_APPEARANCE, toListboxAppearance } from '../../types/appearance';
import { useOptionSetFieldStyles } from './OptionSetField.styles';
import {
  formatMultiSelectValue,
  optionsFromMetadata,
  parseSelectedValues,
  selectedLabels,
} from './OptionSetField.utils';
import type { OptionSetFieldProps, OptionSetOption } from './OptionSetField.types';

/** Indent per level of a hierarchical list, in px - the Lookup's too. */
const TREE_INDENT = 16;

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
  size,
  appearance = DEFAULT_FIELD_APPEARANCE,
  clearable = true,
  inline = false,
  hierarchical = false,
  getParentValue,
  selectableParents = true,
  showPath = false,
  pathSeparator = ' › ',
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
  const [filterText, setFilterText] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(Boolean(open));

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

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const sourceOptions = providedOptions?.length ? providedOptions : loadedOptions;
  // getParentValue is usually an inline function, so it is read at call time rather than memoised on
  const getParentValueRef = React.useRef(getParentValue);
  getParentValueRef.current = getParentValue;
  const options = React.useMemo(() => {
    const resolve = getParentValueRef.current;
    if (!hierarchical || !resolve) return sourceOptions;
    return sourceOptions.map((option) => ({ ...option, parentValue: resolve(option, sourceOptions) ?? null }));
  }, [hierarchical, sourceOptions]);

  const tree = React.useMemo(
    () =>
      hierarchical
        ? buildHierarchy(options, (option) => String(option.value), (option) =>
            option.parentValue == null ? null : String(option.parentValue),
          )
        : null,
    [hierarchical, options],
  );

  const selectedValues = React.useMemo(() => parseSelectedValues(value), [value]);
  const displayLabels = React.useMemo(() => {
    if (!tree || !showPath) return selectedLabels(options, selectedValues);
    return selectedValues
      .map((selected) => pathOf(tree, String(selected)).map((option) => option.label).join(pathSeparator))
      .filter(Boolean);
  }, [tree, showPath, pathSeparator, options, selectedValues]);

  // Every level open: an option set is small enough to show whole, and the
  // Combobox has no way to fold a row without choosing it
  const treeRows = React.useMemo(() => {
    if (!tree) return null;
    const query = filterText.trim().toLowerCase();
    const matches = query
      ? new Set(options.filter((option) => option.label.toLowerCase().includes(query)).map((option) => String(option.value)))
      : null;
    return flattenHierarchy(tree, { isExpanded: () => true, matches });
  }, [tree, options, filterText]);

  const filteredOptions = React.useMemo(() => {
    if (treeRows) return treeRows.map((row) => row.item);
    const query = filterText.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [treeRows, options, filterText]);

  // Get full selected option objects for badge rendering
  const selectedOptions = React.useMemo(
    () => options.filter((opt) => selectedValues.includes(opt.value)),
    [options, selectedValues],
  );
  const showBadgeValueOverlay = asBadge && selectedOptions.length > 0 && !isOpen;

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
      setFilterText('');
    },
    [multiselect, onChange, clearable, selectedValues],
  );
  const handleInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(event.target.value);
  }, []);

  const handleOpenChange = React.useCallback((_: unknown, data: { open: boolean }) => {
    setIsOpen(data.open);
    if (!data.open) {
      setFilterText('');
    }
  }, []);

  const displayValue = isOpen ? filterText : showBadgeValueOverlay ? '' : displayLabels.join(', ');

  const control = (
    <>
      <div className={styles.controlShell}>
        <Combobox
          className={mergeClasses(styles.dropdown, showBadgeValueOverlay && styles.comboboxWithBadgeValue)}
          listbox={{ className: styles.listbox }}
          open={open}
          // Dropdown never supported the deprecated shadow fills, so they are narrowed
          appearance={toListboxAppearance(appearance)}
          multiselect={multiselect}
          placeholder={loading ? 'Loading...' : placeholder}
          disabled={disabled || loading}
          size={size}
          value={displayValue}
          selectedOptions={selectedValues.map(String)}
          onOptionSelect={handleOptionSelect}
          onChange={handleInputChange}
          onOpenChange={handleOpenChange}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const row = treeRows?.[index];
              const groupOnly = Boolean(row && !selectableParents && row.hasChildren);
              return (
                <Option
                  key={option.value}
                  value={String(option.value)}
                  text={option.label}
                  disabled={option.disabled || groupOnly}
                  className={mergeClasses(row?.isContext && styles.optionContext, groupOnly && styles.optionGroup)}
                >
                  <span
                    className={styles.optionContent}
                    style={row?.depth ? { marginLeft: row.depth * TREE_INDENT } : undefined}
                  >
                    {showColors && (
                      <span
                        className={styles.swatch}
                        style={option.color ? { backgroundColor: option.color } : undefined}
                        aria-hidden
                      />
                    )}
                    <span className={styles.optionLabel}>
                      {asBadge && option.color ? (
                        <span
                          className={mergeClasses(styles.badge, getBadgeTextClass(option.color, styles))}
                          style={{ backgroundColor: option.color }}
                        >
                          {option.label}
                        </span>
                      ) : (
                        option.label
                      )}
                    </span>
                  </span>
                </Option>
              );
            })
          ) : (
            <Option value="__no_matches__" disabled text="No matches found">
              No matches found
            </Option>
          )}
        </Combobox>

        {showBadgeValueOverlay && (
          <span className={styles.badgeValueOverlay}>
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
          </span>
        )}
      </div>

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
    return <div className={mergeClasses(styles.root, inline && styles.inline, className)}>{control}</div>;
  }

  return (
    <Field
      className={mergeClasses(styles.root, inline && styles.inline, className)}
      label={label}
      required={required}
      validationMessage={validationMessage}
    >
      {control}
    </Field>
  );
};

export { formatMultiSelectValue, parseSelectedValues };
