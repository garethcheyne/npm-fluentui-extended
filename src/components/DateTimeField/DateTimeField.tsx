import * as React from 'react';
import { Button, Field, Portal, Text, mergeClasses } from '@fluentui/react-components';
import { Calendar } from '@fluentui/react-calendar-compat';
import { CalendarRegular, ClockRegular, DismissRegular } from '@fluentui/react-icons';
import { getEntityAttributes } from '../../api/metadata';
import { DEFAULT_FIELD_APPEARANCE } from '../../types/appearance';
import { dateTimeFieldClassNames, useDateTimeFieldStyles } from './DateTimeField.styles';
import {
  buildTimeOptions,
  filterTimeOptions,
  formatTimeOnlyValue,
  formatDisplayValue,
  formatLocalTime,
  formatStoredValue,
  parseTimeOnlyValue,
  formatTime12h,
  parseFreeFormDateTime,
  isDayFirst,
  parseStoredValue,
  placePopup,
  timeToMinutes,
  withTime,
} from './DateTimeField.utils';
import type { DateTimeBehavior, DateTimeFieldProps } from './DateTimeField.types';

export { dateTimeFieldClassNames };

/**
 * A Dynamics 365 date/time field that respects the attribute's DateTimeBehavior.
 *
 * Features an integrated popup with a calendar on the left and a time picker on the
 * right. When `showTime` is true, both are displayed side-by-side. The footer
 * provides "Today", "Time Now" (when showTime), and "Done" buttons. By default a
 * pick that completes the value commits and closes the popup — see `closeOnSelect`.
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
  showHint = false,
  showTime = false,
  timeOnly = false,
  timeIntervalMinutes = 30,
  allowFreeType = false,
  closeOnSelect = true,
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
  inline = false,
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

  const selectedDate = React.useMemo(
    () => (timeOnly ? parseTimeOnlyValue(value) : parseStoredValue(value, behavior)),
    [value, behavior, timeOnly],
  );
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
      if (timeOnly) {
        const anchored = next ? parseTimeOnlyValue(next) : null;
        onChange?.(formatTimeOnlyValue(anchored), anchored);
        return;
      }
      onChange?.(formatStoredValue(next, behavior), next);
    },
    [onChange, behavior, timeOnly],
  );

  // Place the popup where all of it is on screen — see placePopup. It is placed
  // once against the field, then again when it has rendered and can be measured.
  const [popupPosition, setPopupPosition] = React.useState({ top: 0, left: 0 });

  const positionPopup = React.useCallback(() => {
    const field = inputRef.current;
    if (!field) return;
    // The field's own document and window, not the global ones: inside an iframe
    // (a Dynamics web resource) the global window is the host page's.
    const doc = field.ownerDocument;
    const view = doc.defaultView;
    const popup = popupRef.current?.getBoundingClientRect();
    setPopupPosition(placePopup(
      field.getBoundingClientRect(),
      { width: popup?.width ?? 0, height: popup?.height ?? 0 },
      { width: doc.documentElement.clientWidth, height: doc.documentElement.clientHeight },
      { x: view?.scrollX ?? 0, y: view?.scrollY ?? 0 },
    ));
  }, []);

  React.useLayoutEffect(() => {
    if (isOpen) positionPopup();
  }, [isOpen, positionPopup]);

  // The portal mounts after the field's layout effect, so measure the popup when
  // it attaches, and again if the window changes size while it is open.
  const attachPopup = React.useCallback((node: HTMLDivElement | null) => {
    (popupRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (node) positionPopup();
  }, [positionPopup]);

  React.useEffect(() => {
    if (!isOpen) return;
    const view = inputRef.current?.ownerDocument.defaultView;
    view?.addEventListener('resize', positionPopup);
    return () => view?.removeEventListener('resize', positionPopup);
  }, [isOpen, positionPopup]);

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

  // Commit the given selection and close. Takes the values rather than reading
  // pending state, so a pick can commit in the same handler that made it.
  const commit = (date: Date | null, time: string) => {
    let finalDate: Date | null = null;

    if (timeOnly) {
      // For time-only mode, emit an anchored date on 1970-01-01 plus HH:mm storage
      if (time) {
        finalDate = withTime(new Date(1970, 0, 1), time);
        emit(finalDate);
      }
    } else if (date) {
      finalDate = timeEnabled && time ? withTime(date, time) : date;
      emit(finalDate);
    }

    // In free-type mode, update the input text to reflect the selection
    if (allowFreeType && finalDate) {
      const display = formatDisplayValue(finalDate, time || formatLocalTime(finalDate), timeEnabled, timeFormat, formatDate, timeOnly, displayFormat);
      setInputText(display);
      setIsFocused(false);
    }

    setIsOpen(false);
  };

  // The time slot nearest to now within the allowed range
  const closestTimeToNow = () => {
    const currentTime = formatLocalTime(new Date());
    return timeOptions.reduce((prev, curr) =>
      Math.abs(timeToMinutes(curr) - timeToMinutes(currentTime)) <
      Math.abs(timeToMinutes(prev) - timeToMinutes(currentTime))
        ? curr
        : prev
    );
  };

  const handleCalendarSelect = (date: Date) => {
    setPendingDate(date);
    // With a time picker the time is still to come, so only a date-only pick closes
    if (closeOnSelect && !timeEnabled) {
      commit(date, pendingTime);
      return;
    }
    // If no time is selected yet and time is enabled, default to current time slot
    if (timeEnabled && !pendingTime && timeOptions.length > 0) {
      setPendingTime(closestTimeToNow());
    }
  };

  const handleTimeSelect = (time: string) => {
    setPendingTime(time);
    // If no date is selected yet, default to today
    const date = pendingDate ?? new Date();
    if (!pendingDate) {
      setPendingDate(date);
    }
    if (closeOnSelect) commit(date, time);
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setPendingDate(today);
    if (closeOnSelect && !timeEnabled) commit(today, pendingTime);
  };

  const handleTimeNow = () => {
    if (timeOptions.length === 0) return;

    const closest = closestTimeToNow();
    setPendingTime(closest);
    // Also set date to today if not set
    const date = pendingDate ?? new Date();
    if (!pendingDate) {
      setPendingDate(date);
    }
    if (closeOnSelect) commit(date, closest);
  };

  const handleDone = () => commit(pendingDate, pendingTime);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Emptied now rather than left to the sync: text still holding the old date
    // is what the next blur would parse straight back into the value
    setInputText('');
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

    if (timeOnly) {
      const parsed = parseTimeOnlyValue(inputText);
      emit(parsed);
      return;
    }

    const { date, time } = parseFreeFormDateTime(inputText, behavior, isDayFirst(displayFormat));
    
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
    dateTimeFieldClassNames.field,
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
          // Focus leaving the field altogether ends it, whichever part had it.
          // The clear and calendar buttons take focus too, and with only the
          // input's own blur to end it, clicking one left the field "focused"
          // for good - and the text stopped following the value.
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFocused(false);
          }}
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
              className={mergeClasses(dateTimeFieldClassNames.clear, styles.clearIcon)}
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
            className={mergeClasses(dateTimeFieldClassNames.icon, styles.inputIcon)}
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
            ref={attachPopup}
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

      {showHint && behavior !== 'UserLocal' && (
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
