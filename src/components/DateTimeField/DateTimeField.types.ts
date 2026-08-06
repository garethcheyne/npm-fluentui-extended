import type * as React from 'react';
import type { DateTimeBehavior } from '../../api/metadata.types';
import type { FieldAppearance } from '../../types/appearance';

export type { DateTimeBehavior };

export interface DateTimeFieldProps {
  /**
   * Stored value. Accepts the string Dynamics returns or a Date.
   * Interpreted according to `behavior`.
   */
  value?: string | Date | null;
  /**
   * Called with the value serialized for `behavior` - an ISO UTC string for UserLocal,
   * "YYYY-MM-DD" for DateOnly, "YYYY-MM-DDTHH:mm:ss" for TimeZoneIndependent.
   * The Date is passed alongside for callers that would rather keep the object.
   */
  onChange?: (value: string | null, date: Date | null) => void;
  /**
   * How Dynamics stores this attribute. Defaults to 'UserLocal', which is the
   * Dynamics default for new DateTime attributes.
   */
  behavior?: DateTimeBehavior;
  /**
   * Show a time picker alongside the date. Ignored when `behavior` is 'DateOnly',
   * which has no time component by definition.
   */
  showTime?: boolean;
  /**
   * Show only the time picker without a calendar. When true, the control displays
   * and stores only a time value (HH:mm format). Useful for duration or time-only fields.
   */
  timeOnly?: boolean;
  /** Minutes between entries in the time dropdown. Defaults to 30. */
  timeIntervalMinutes?: number;
  /**
   * Allow users to type directly in the input field to enter or edit the date/time.
   * When true, the input becomes editable and the calendar icon opens the picker.
   * Defaults to false.
   */
  allowFreeType?: boolean;
  /**
   * Time display format. '12h' shows AM/PM (e.g., "2:30 PM"), '24h' shows military time (e.g., "14:30").
   * Defaults to '24h'.
   */
  timeFormat?: '12h' | '24h';
  /**
   * Minimum selectable time in HH:mm format (e.g., "08:00" for 8 AM).
   * Times before this will be disabled in the picker.
   */
  minTime?: string;
  /**
   * Maximum selectable time in HH:mm format (e.g., "17:00" for 5 PM).
   * Times after this will be disabled in the picker.
   */
  maxTime?: string;
  /**
   * Load `behavior` from attribute metadata instead of the prop. Requires
   * `attributeName`; the prop is used until metadata resolves.
   */
  entityName?: string;
  attributeName?: string;
  /** Label rendered above the control */
  label?: string | React.ReactElement;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /**
   * Controls the colors and borders of the date and time controls. Defaults to
   * `filled-darker`, which is how Dynamics 365 renders fields natively.
   */
  appearance?: FieldAppearance;
  /** Validation message rendered below the control */
  validationMessage?: string | React.ReactElement;
  /** Allow clearing back to no value. Defaults to true. */
  clearable?: boolean;
  /** Format the date shown in the input. Defaults to the user's locale date string. */
  formatDate?: (date: Date) => string;
  /**
   * Custom display format pattern for date/time. Uses format tokens:
   * - YYYY: 4-digit year (2024)
   * - YY: 2-digit year (24)
   * - MMMM: Full month (October)
   * - MMM: Short month (Oct)
   * - MM: 2-digit month (10)
   * - M: Month (10)
   * - Do: Day with ordinal (9th)
   * - DD: 2-digit day (09)
   * - D: Day (9)
   * - dddd: Full weekday (Monday)
   * - ddd: Short weekday (Mon)
   * - HH: 24-hour padded (14)
   * - H: 24-hour (14)
   * - hh: 12-hour padded (02)
   * - h: 12-hour (2)
   * - mm: Minutes padded (30)
   * - m: Minutes (30)
   * - ss: Seconds padded (00)
   * - s: Seconds (0)
   * - A: AM/PM uppercase
   * - a: am/pm lowercase
   *
   * Example: "ddd Do MMMM, YYYY h:mm a" -> "Mon 9th October, 2024 11:00 pm"
   */
  displayFormat?: string;
  /** Size of the input control. Defaults to 'medium'. */
  size?: 'small' | 'medium';
  className?: string;
  /** Called when metadata auto-load fails */
  onLoadError?: (error: Error) => void;
}
