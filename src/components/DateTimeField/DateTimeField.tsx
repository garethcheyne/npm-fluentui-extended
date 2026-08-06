import * as React from 'react';
import { Button, Field, Portal, Text, mergeClasses } from '@fluentui/react-components';
import { Calendar } from '@fluentui/react-calendar-compat';
import { CalendarRegular, ClockRegular, DismissRegular } from '@fluentui/react-icons';
import { getEntityAttributes } from '../../api/metadata';
import { DEFAULT_FIELD_APPEARANCE } from '../../types/appearance';
import { useDateTimeFieldStyles } from './DateTimeField.styles';
import {
  buildTimeOptions,
  filterTimeOptions,
  formatDisplayValue,
  formatLocalTime,
  formatStoredValue,
  formatTime12h,
  parseFreeFormDateTime,
  parseStoredValue,
  timeToMinutes,
  withTime,
} from './DateTimeField.utils';
import type { DateTimeBehavior, DateTimeFieldProps } from './DateTimeField.types';

/**
 * A Dynamics 365 date/time field that respects the attribute's DateTimeBehavior.
 *
 * Features an integrated popup with a calendar on the left and a time picker on the
 * right. When `showTime` is true, both are displayed side-by-side. The footer
 * provides "Today", "Time Now" (when showTime), and "Done" buttons.
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
  timeOnly = false,
  timeIntervalMinutes = 30,
  allowFreeType = false,
  timeFormat = '24h',
  minTime,
  maxTime,
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
  displayFormat,
  className,
  onLoadError,
  size = 'medium',
}) => {
  const styles = useDateTimeFieldStyles();
  const [metadataBehavior, setMetadataBehavior] = React.useState<DateTimeBehavior | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const inputRef = React.useRef<HTMLDivElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);
  const timeListRef = React.useRef<HTMLDivElement>(null);

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
  // timeOnly mode also enables time selection
  const timeEnabled = (showTime || timeOnly) && behavior !== 'DateOnly';

  const selectedDate = React.useMemo(() => parseStoredValue(value, behavior), [value, behavior]);
  const allTimeOptions = React.useMemo(() => buildTimeOptions(timeIntervalMinutes), [timeIntervalMinutes]);
  const timeOptions = React.useMemo(
    () => filterTimeOptions(allTimeOptions, minTime, maxTime),
    [allTimeOptions, minTime, maxTime],
  );
  const selectedTime = selectedDate ? formatLocalTime(selectedDate) : '';

  // Local state for the popup (uncommitted selections)
  const [pendingDate, setPendingDate] = React.useState<Date | null>(null);
  const [pendingTime, setPendingTime] = React.useState<string>('');

  // Input text state for free typing mode
  const [inputText, setInputText] = React.useState<string>('');

  // Sync pending state when popup opens or external value changes
  React.useEffect(() => {
    if (isOpen) {
      setPendingDate(selectedDate);
      setPendingTime(selectedTime);
    }
  }, [isOpen, selectedDate, selectedTime]);

  // Sync input text with selected value when not focused (for free type mode)
  React.useEffect(() => {
    if (!isFocused && allowFreeType) {
      const display = formatDisplayValue(selectedDate, selectedTime, timeEnabled, timeFormat, formatDate, timeOnly, displayFormat);
      setInputText(display);
    }
  }, [selectedDate, selectedTime, timeEnabled, timeFormat, formatDate, timeOnly, displayFormat, isFocused, allowFreeType]);

  // Scroll selected time into view when popup opens
  React.useEffect(() => {
    if (isOpen && timeListRef.current && pendingTime) {
      const selectedElement = timeListRef.current.querySelector('[data-selected="true"]');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, [isOpen, pendingTime]);

  const emit = React.useCallback(
    (next: Date | null) => {
      onChange?.(formatStoredValue(next, behavior), next);
    },
    [onChange, behavior],
  );

  // Position the popup below the input
  const [popupPosition, setPopupPosition] = React.useState({ top: 0, left: 0 });

  React.useLayoutEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  // Close popup when clicking outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleInputClick = () => {
    if (!disabled && !allowFreeType) {
      setIsOpen(true);
    }
  };

  const handleCalendarSelect = (date: Date) => {
    setPendingDate(date);
    // If no time is selected yet and time is enabled, default to current time slot
    if (timeEnabled && !pendingTime && timeOptions.length > 0) {
      const now = new Date();
      const currentTime = formatLocalTime(now);
      // Find the closest time option within allowed range
      const closest = timeOptions.reduce((prev, curr) =>
        Math.abs(timeToMinutes(curr) - timeToMinutes(currentTime)) <
        Math.abs(timeToMinutes(prev) - timeToMinutes(currentTime))
          ? curr
          : prev
      );
      setPendingTime(closest);
    }
  };

  const handleTimeSelect = (time: string) => {
    setPendingTime(time);
    // If no date is selected yet, default to today
    if (!pendingDate) {
      setPendingDate(new Date());
    }
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setPendingDate(today);
  };

  const handleTimeNow = () => {
    if (timeOptions.length === 0) return;
    
    const now = new Date();
    const currentTime = formatLocalTime(now);
    // Find the closest time option within allowed range
    const closest = timeOptions.reduce((prev, curr) =>
      Math.abs(timeToMinutes(curr) - timeToMinutes(currentTime)) <
      Math.abs(timeToMinutes(prev) - timeToMinutes(currentTime))
        ? curr
        : prev
    );
    setPendingTime(closest);
    // Also set date to today if not set
    if (!pendingDate) {
      setPendingDate(new Date());
    }
  };

  const handleDone = () => {
    let finalDate: Date | null = null;
    
    if (timeOnly) {
      // For time-only mode, emit a Date object with today's date and selected time
      if (pendingTime) {
        const today = new Date();
        finalDate = withTime(today, pendingTime);
        emit(finalDate);
      }
    } else if (pendingDate) {
      finalDate = timeEnabled && pendingTime ? withTime(pendingDate, pendingTime) : pendingDate;
      emit(finalDate);
    }
    
    // In free-type mode, update the input text to reflect the selection
    if (allowFreeType && finalDate) {
      const time = pendingTime ?? (finalDate ? formatLocalTime(finalDate) : null);
      const display = formatDisplayValue(finalDate, time, timeEnabled, timeFormat, formatDate, timeOnly, displayFormat);
      setInputText(display);
      setIsFocused(false);
    }
    
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    emit(null);
  };

  // Format the display value
  const displayValue = React.useMemo(() => {
    return formatDisplayValue(selectedDate, selectedTime, timeEnabled, timeFormat, formatDate, timeOnly, displayFormat);
  }, [selectedDate, selectedTime, timeEnabled, timeFormat, formatDate, timeOnly, displayFormat]);

  // Handle free-form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  // Parse and apply free-form input on blur
  const handleInputBlur = () => {
    setIsFocused(false);
    
    if (!allowFreeType) return;

    if (!inputText.trim()) {
      // Clear the value
      emit(null);
      return;
    }

    const { date, time } = parseFreeFormDateTime(inputText, behavior);
    
    if (date) {
      let finalDate = date;
      if (timeEnabled && time) {
        // Validate time is within allowed range
        const minutes = timeToMinutes(time);
        const minMinutes = minTime ? timeToMinutes(minTime) : 0;
        const maxMinutes = maxTime ? timeToMinutes(maxTime) : 24 * 60 - 1;
        
        if (minutes >= minMinutes && minutes <= maxMinutes) {
          finalDate = withTime(date, time);
        } else {
          // Time out of range - use existing time or first allowed time
          const existingTime = selectedTime || (timeOptions.length > 0 ? timeOptions[0] : '00:00');
          finalDate = withTime(date, existingTime);
        }
      } else if (timeEnabled && selectedTime) {
        // Keep existing time if no new time provided
        finalDate = withTime(date, selectedTime);
      }
      emit(finalDate);
    } else {
      // Could not parse - revert to display value
      setInputText(displayValue);
    }
  };

  // Handle Enter key in input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setInputText(displayValue);
      e.currentTarget.blur();
    }
  };

  // Open popup when clicking calendar icon (for free type mode) or whole input (for non-free type)
  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const inputWrapperClasses = mergeClasses(
    styles.inputWrapper,
    appearance.startsWith('filled') && styles.inputWrapperFilled,
    size === 'small' && styles.inputWrapperSmall,
    disabled && styles.inputWrapperDisabled,
    isFocused && styles.inputWrapperFocused,
  );

  const control = (
    <>
      <div className={styles.controls}>
        <div
          ref={inputRef}
          className={inputWrapperClasses}
          onClick={handleInputClick}
          onFocus={() => setIsFocused(true)}
          onBlur={() => !allowFreeType && setIsFocused(false)}
          tabIndex={allowFreeType ? -1 : disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-disabled={disabled}
        >
          {allowFreeType ? (
            <input
              type="text"
              className={styles.inputField}
              value={inputText}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              aria-label={typeof label === 'string' ? label : 'Date time input'}
            />
          ) : (
            <span className={mergeClasses(styles.inputText, !displayValue && styles.inputPlaceholder)}>
              {displayValue || placeholder}
            </span>
          )}
          
          {clearable && selectedDate && !disabled && (
            <span
              className={styles.clearIcon}
              onClick={handleClear}
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              title="Clear date"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as unknown as React.MouseEvent);
                }
              }}
            >
              <DismissRegular />
            </span>
          )}
          
          <span
            className={styles.inputIcon}
            onClick={allowFreeType ? handleIconClick : undefined}
            style={allowFreeType ? { cursor: disabled ? 'not-allowed' : 'pointer' } : undefined}
            role={allowFreeType ? 'button' : undefined}
            tabIndex={allowFreeType && !disabled ? 0 : undefined}
            aria-label={allowFreeType ? (timeOnly ? 'Open time picker' : 'Open date picker') : undefined}
            onKeyDown={allowFreeType ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleIconClick(e as unknown as React.MouseEvent);
              }
            } : undefined}
          >
            {timeOnly ? <ClockRegular /> : <CalendarRegular />}
          </span>
        </div>
      </div>

      {isOpen && (
        <Portal>
          <div
            ref={popupRef}
            className={styles.popupPortal}
            style={{
              top: popupPosition.top,
              left: popupPosition.left,
            }}
          >
            <div className={styles.popupContent}>
              {!timeOnly && (
                <div className={styles.calendarSection}>
                  <Calendar
                    value={pendingDate ?? undefined}
                    onSelectDate={handleCalendarSelect}
                    showGoToToday={false}
                  />
                </div>
              )}

              {timeEnabled && (
                <div className={timeOnly ? styles.timeSectionOnly : styles.timeSection}>
                  <div className={styles.timeSectionHeader}>Time</div>
                  <div className={styles.timeList} ref={timeListRef}>
                    {timeOptions.map((time) => (
                      <div
                        key={time}
                        className={mergeClasses(
                          styles.timeOption,
                          time === pendingTime && styles.timeOptionSelected,
                        )}
                        onClick={() => handleTimeSelect(time)}
                        data-selected={time === pendingTime}
                      >
                        {timeFormat === '12h' ? formatTime12h(time) : time}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.popupFooter}>
              <div className={styles.footerLeft}>
                {!timeOnly && (
                  <Button appearance="subtle" size="small" onClick={handleToday}>
                    Today
                  </Button>
                )}
                {timeEnabled && (
                  <Button appearance="subtle" size="small" onClick={handleTimeNow}>
                    {timeOnly ? 'Now' : 'Time Now'}
                  </Button>
                )}
              </div>
              <div className={styles.footerRight}>
                <Button appearance="primary" size="small" onClick={handleDone}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

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
