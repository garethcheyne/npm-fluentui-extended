import * as React from 'react';
import { Button, Dropdown, Field, Option, Text, mergeClasses } from '@fluentui/react-components';
import { DatePicker } from '@fluentui/react-datepicker-compat';
import { DismissRegular } from '@fluentui/react-icons';
import { getEntityAttributes } from '../../api/metadata';
import { DEFAULT_FIELD_APPEARANCE, toListboxAppearance } from '../../types/appearance';
import { useDateTimeFieldStyles } from './DateTimeField.styles';
import {
  buildTimeOptions,
  formatLocalTime,
  formatStoredValue,
  parseStoredValue,
  withTime,
} from './DateTimeField.utils';
import type { DateTimeBehavior, DateTimeFieldProps } from './DateTimeField.types';

/**
 * A Dynamics 365 date/time field that respects the attribute's DateTimeBehavior.
 *
 * A generic picker treats every value as a moment in time and converts it to the
 * browser's timezone. That is right for UserLocal and wrong for the other two
 * behaviors: a DateOnly value silently moves a day for anyone west of UTC, and a
 * TimeZoneIndependent value should never be converted at all. See
 * `DateTimeField.utils` for the conversion rules.
 */
export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  value,
  onChange,
  behavior: behaviorProp = 'UserLocal',
  showTime = false,
  timeIntervalMinutes = 30,
  entityName,
  attributeName,
  label,
  placeholder = 'Select a date...',
  disabled,
  required,
  appearance = DEFAULT_FIELD_APPEARANCE,
  validationMessage,
  clearable = true,
  formatDate,
  className,
  onLoadError,
}) => {
  const styles = useDateTimeFieldStyles();
  const [metadataBehavior, setMetadataBehavior] = React.useState<DateTimeBehavior | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const shouldAutoLoad = Boolean(entityName && attributeName);

  React.useEffect(() => {
    if (!shouldAutoLoad || !entityName || !attributeName) return;

    let disposed = false;
    setLoadError(null);

    getEntityAttributes(entityName)
      .then((attributes) => {
        if (disposed) return;
        const attribute = attributes.find((candidate) => candidate.LogicalName === attributeName);
        const resolved = attribute?.DateTimeBehavior?.Value;
        if (resolved) setMetadataBehavior(resolved);
      })
      .catch((err: Error) => {
        if (disposed) return;
        setLoadError(err.message);
        onLoadError?.(err);
      });

    return () => {
      disposed = true;
    };
    // onLoadError is intentionally omitted so an inline callback does not refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoLoad, entityName, attributeName]);

  const behavior = metadataBehavior ?? behaviorProp;
  // DateOnly has no time component, so a time picker on it would be meaningless
  const timeEnabled = showTime && behavior !== 'DateOnly';

  const selectedDate = React.useMemo(() => parseStoredValue(value, behavior), [value, behavior]);
  const timeOptions = React.useMemo(() => buildTimeOptions(timeIntervalMinutes), [timeIntervalMinutes]);
  const selectedTime = selectedDate ? formatLocalTime(selectedDate) : '';

  const emit = React.useCallback(
    (next: Date | null) => {
      onChange?.(formatStoredValue(next, behavior), next);
    },
    [onChange, behavior],
  );

  const handleDateSelect = React.useCallback(
    (date: Date | null | undefined) => {
      if (!date) {
        emit(null);
        return;
      }
      // Keep the time already chosen when only the calendar day changed
      emit(timeEnabled && selectedTime ? withTime(date, selectedTime) : date);
    },
    [emit, timeEnabled, selectedTime],
  );

  const handleTimeSelect = React.useCallback(
    (_: unknown, data: { optionValue?: string }) => {
      if (!data.optionValue) return;
      // Picking a time before a date defaults to today, which is what a form user expects
      emit(withTime(selectedDate ?? new Date(), data.optionValue));
    },
    [emit, selectedDate],
  );

  const control = (
    <>
      <div className={styles.controls}>
        <DatePicker
          className={styles.datePicker}
          // DatePicker's root slot is an Input, so it takes the full appearance union
          appearance={appearance}
          value={selectedDate}
          onSelectDate={handleDateSelect}
          placeholder={placeholder}
          disabled={disabled}
          allowTextInput
          // DatePicker calls this with undefined for an empty value, so the caller's
          // Date-only signature is adapted rather than passed straight through
          formatDate={(date?: Date) => {
            if (!date) return '';
            return formatDate ? formatDate(date) : date.toLocaleDateString();
          }}
        />

        {timeEnabled && (
          <Dropdown
            className={styles.timeDropdown}
            appearance={toListboxAppearance(appearance)}
            placeholder="Time"
            disabled={disabled}
            value={selectedTime}
            selectedOptions={selectedTime ? [selectedTime] : []}
            onOptionSelect={handleTimeSelect}
          >
            {timeOptions.map((option) => (
              <Option key={option} value={option} text={option}>
                {option}
              </Option>
            ))}
          </Dropdown>
        )}

        {clearable && selectedDate && !disabled && (
          <Button
            className={styles.clearButton}
            appearance="subtle"
            size="small"
            icon={<DismissRegular />}
            aria-label="Clear date"
            title="Clear date"
            onClick={() => emit(null)}
          />
        )}
      </div>

      {behavior !== 'UserLocal' && (
        <Text className={styles.behaviorHint}>
          {behavior === 'DateOnly'
            ? 'Date only - stored without a time or timezone'
            : 'Timezone independent - stored exactly as entered'}
        </Text>
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
