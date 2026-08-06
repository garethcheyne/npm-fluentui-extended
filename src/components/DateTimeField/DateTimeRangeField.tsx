import * as React from 'react';
import { Text, mergeClasses } from '@fluentui/react-components';
import { DateTimeField } from './DateTimeField';
import { formatStoredValue, parseStoredValue } from './DateTimeField.utils';
import { useDateTimeRangeFieldStyles } from './DateTimeRangeField.styles';
import type { DateTimeRangeFieldChange, DateTimeRangeFieldProps } from './DateTimeField.types';

const toChangeState = (
  startValue: string | Date | null | undefined,
  endValue: string | Date | null | undefined,
  behavior: DateTimeRangeFieldProps['behavior'] = 'UserLocal',
): DateTimeRangeFieldChange => ({
  startValue: typeof startValue === 'string' ? startValue : formatStoredValue(startValue ?? null, behavior ?? 'UserLocal'),
  endValue: typeof endValue === 'string' ? endValue : formatStoredValue(endValue ?? null, behavior ?? 'UserLocal'),
  startDate: parseStoredValue(startValue ?? null, behavior ?? 'UserLocal'),
  endDate: parseStoredValue(endValue ?? null, behavior ?? 'UserLocal'),
});

export const DateTimeRangeField: React.FC<DateTimeRangeFieldProps> = ({
  value,
  onChange,
  label,
  startLabel = 'Start',
  endLabel = 'End',
  startPlaceholder = 'Start date...',
  endPlaceholder = 'End date...',
  validationMessage,
  className,
  layout = 'horizontal',
  required,
  behavior = 'UserLocal',
  ...fieldProps
}) => {
  const styles = useDateTimeRangeFieldStyles();
  const [range, setRange] = React.useState<DateTimeRangeFieldChange>(() =>
    toChangeState(value?.start, value?.end, behavior),
  );

  React.useEffect(() => {
    setRange(toChangeState(value?.start, value?.end, behavior));
  }, [value?.start, value?.end, behavior]);

  const emit = React.useCallback(
    (next: DateTimeRangeFieldChange) => {
      setRange(next);
      onChange?.(next);
    },
    [onChange],
  );

  return (
    <div className={mergeClasses(styles.root, className)}>
      {label && (
        <Text as="span" className={styles.labelRow}>
          {label}
          {required && <span className={styles.requiredMark}>*</span>}
        </Text>
      )}

      <div className={layout === 'vertical' ? styles.fieldsVertical : styles.fieldsHorizontal}>
        <DateTimeField
          {...fieldProps}
          behavior={behavior}
          value={range.startValue}
          onChange={(startValue, startDate) =>
            emit({
              ...range,
              startValue,
              startDate,
            })
          }
          label={startLabel}
          placeholder={startPlaceholder}
          required={required}
        />

        <DateTimeField
          {...fieldProps}
          behavior={behavior}
          value={range.endValue}
          onChange={(endValue, endDate) =>
            emit({
              ...range,
              endValue,
              endDate,
            })
          }
          label={endLabel}
          placeholder={endPlaceholder}
          required={required}
        />
      </div>

      {validationMessage && <Text className={styles.validationMessage}>{validationMessage}</Text>}
    </div>
  );
};