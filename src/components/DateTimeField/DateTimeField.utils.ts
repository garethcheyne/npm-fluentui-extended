/**
 * Conversions between Dynamics DateTime storage formats and JavaScript Dates.
 *
 * Dynamics has three DateTimeBehavior values and they do not agree on what a stored
 * string means, so a single `new Date(value)` is wrong for two of the three:
 *
 * - **UserLocal** - stored in UTC, shown in the user's timezone. Normal conversion.
 * - **DateOnly** - a calendar date with no time and no timezone. Must never shift.
 * - **TimeZoneIndependent** - stored and shown exactly as typed, no conversion at all.
 *
 * The trap is that `new Date('2026-08-06')` parses as UTC midnight, which renders as
 * the 5th anywhere west of Greenwich, while `new Date('2026-08-06T00:00:00')` parses
 * as local midnight. Likewise `toISOString()` on a local date shifts the day for any
 * user in a positive UTC offset. Both are handled explicitly below.
 */

import type { DateTimeBehavior } from '../../api/metadata.types';

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

/** Format a Date's local calendar date as YYYY-MM-DD, without any UTC conversion. */
export const formatLocalDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Format a Date's local wall-clock time as HH:mm. */
export const formatLocalTime = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** The fixed calendar day used for time-only values. */
const TIME_ONLY_ANCHOR = { year: 1970, month: 0, day: 1 } as const;

/** Rebase a Date onto the time-only anchor day while preserving its wall-clock time. */
export const anchorTimeOnlyDate = (date: Date): Date =>
  new Date(
    TIME_ONLY_ANCHOR.year,
    TIME_ONLY_ANCHOR.month,
    TIME_ONLY_ANCHOR.day,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );

/** Parse a time-only stored value into a Date anchored to 1970-01-01. */
export const parseTimeOnlyValue = (value: string | Date | null | undefined): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : anchorTimeOnlyDate(value);

  const trimmed = value.trim();
  if (!trimmed) return null;

  const timeOnly24h = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  const timeOnly12h = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/;

  const plainMatch = timeOnly24h.exec(trimmed);
  if (plainMatch) {
    return new Date(
      TIME_ONLY_ANCHOR.year,
      TIME_ONLY_ANCHOR.month,
      TIME_ONLY_ANCHOR.day,
      Math.min(23, Number(plainMatch[1])),
      Math.min(59, Number(plainMatch[2])),
      Math.min(59, Number(plainMatch[3] ?? 0)),
      0,
    );
  }

  const twelveHourMatch = timeOnly12h.exec(trimmed);
  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]);
    const minutes = Math.min(59, Number(twelveHourMatch[2]));
    const seconds = Math.min(59, Number(twelveHourMatch[3] ?? 0));
    const period = twelveHourMatch[4].toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return new Date(TIME_ONLY_ANCHOR.year, TIME_ONLY_ANCHOR.month, TIME_ONLY_ANCHOR.day, hours, minutes, seconds, 0);
  }

  const parsed = parseStoredValue(trimmed, 'TimeZoneIndependent');
  return parsed ? anchorTimeOnlyDate(parsed) : null;
};

/** Serialize a time-only Date as HH:mm. */
export const formatTimeOnlyValue = (date: Date | null): string | null => {
  if (!date || Number.isNaN(date.getTime())) return null;
  return formatLocalTime(date);
};

/**
 * Parse a stored Dynamics value into a Date positioned correctly for display.
 * Returns null for empty or unparseable input rather than an Invalid Date.
 */
export const parseStoredValue = (value: string | Date | null | undefined, behavior: DateTimeBehavior): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (behavior === 'UserLocal') {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // DateOnly and TimeZoneIndependent are wall-clock values: read the components
  // directly so the runtime never applies an offset to them
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(trimmed);
  if (!match) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, year, month, day, hours, minutes, seconds] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    behavior === 'DateOnly' ? 0 : Number(hours ?? 0),
    behavior === 'DateOnly' ? 0 : Number(minutes ?? 0),
    behavior === 'DateOnly' ? 0 : Number(seconds ?? 0),
  );
};

/**
 * Serialize a Date into the string Dynamics expects for the given behavior.
 *
 * Only UserLocal goes through UTC; the other two are written as local wall-clock
 * components, which is what keeps a DateOnly field on the day the user picked.
 */
export const formatStoredValue = (date: Date | null, behavior: DateTimeBehavior): string | null => {
  if (!date || Number.isNaN(date.getTime())) return null;

  if (behavior === 'DateOnly') {
    return formatLocalDate(date);
  }

  if (behavior === 'TimeZoneIndependent') {
    return `${formatLocalDate(date)}T${formatLocalTime(date)}:${pad(date.getSeconds())}`;
  }

  return date.toISOString();
};

/** Combine a date and an HH:mm string into a single Date, preserving the date's day. */
export const withTime = (date: Date, time: string): Date => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const combined = new Date(date.getTime());
  if (!match) return combined;

  const hours = Math.min(23, Number(match[1]));
  const minutes = Math.min(59, Number(match[2]));
  combined.setHours(hours, minutes, 0, 0);
  return combined;
};

/** Build the HH:mm options offered by the time dropdown. */
export const buildTimeOptions = (intervalMinutes: number): string[] => {
  const safeInterval = intervalMinutes > 0 && intervalMinutes <= 720 ? intervalMinutes : 30;
  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += safeInterval) {
    options.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }
  return options;
};

/** Convert HH:mm time to total minutes since midnight for comparison. */
export const timeToMinutes = (time: string): number => {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
};

/**
 * Filter time options to only include times within the min/max range.
 * Both minTime and maxTime are inclusive.
 */
export const filterTimeOptions = (
  options: string[],
  minTime?: string,
  maxTime?: string,
): string[] => {
  if (!minTime && !maxTime) return options;

  const minMinutes = minTime ? timeToMinutes(minTime) : 0;
  const maxMinutes = maxTime ? timeToMinutes(maxTime) : 24 * 60 - 1;

  return options.filter((time) => {
    const minutes = timeToMinutes(time);
    return minutes >= minMinutes && minutes <= maxMinutes;
  });
};

/** Convert 24h time (HH:mm) to 12h format (h:mm AM/PM). */
export const formatTime12h = (time: string): string => {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return time;

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  return `${hours}:${minutes} ${period}`;
};

/** Convert 12h time (h:mm AM/PM) to 24h format (HH:mm). */
export const parseTime12h = (time: string): string | null => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/.exec(time.trim());
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours < 12) hours += 12;
  else if (period === 'AM' && hours === 12) hours = 0;

  return `${pad(hours)}:${minutes}`;
};

/**
 * Parse a free-form date/time string into a Date.
 * Supports various formats like "8/6/2026", "2026-08-06", "Aug 6, 2026",
 * and optional time like "8/6/2026 2:30pm", "2026-08-06 14:30", etc.
 */
export const parseFreeFormDateTime = (
  input: string,
  // Kept for signature stability: free-form parsing reads whatever the user typed and
  // leaves behaviour-specific normalisation to formatStoredValue.
  _behavior: DateTimeBehavior,
): { date: Date | null; time: string | null } => {
  if (!input.trim()) return { date: null, time: null };

  // Try to split date and time parts
  // Common patterns: "date time", "date, time"
  const trimmed = input.trim();

  // Try parsing as ISO or standard date string first
  let dateMatch: RegExpMatchArray | null = null;
  let timeMatch: RegExpMatchArray | null = null;

  // Match date part: various formats
  // ISO: 2026-08-06
  // US: 8/6/2026 or 08/06/2026 or 8/6 (no year)
  // EU: 6/8/2026 or 06/08/2026 (less common, we'll use US format)
  const isoDateRegex = /(\d{4})-(\d{1,2})-(\d{1,2})/;
  const slashDateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
  const slashDateNoYearRegex = /^(\d{1,2})\/(\d{1,2})$/;

  // Match time part: 14:30, 2:30pm, 2:30 PM
  const timeRegex = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/;

  // Extract time first (it's more specific)
  timeMatch = timeRegex.exec(trimmed);
  let timeStr: string | null = null;

  if (timeMatch) {
    let hours = Number(timeMatch[1]);
    const minutes = timeMatch[2];
    const period = timeMatch[4]?.toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    else if (period === 'AM' && hours === 12) hours = 0;

    timeStr = `${pad(hours)}:${minutes}`;
  }

  // Remove time from string to parse date
  const dateOnly = trimmed.replace(timeRegex, '').trim().replace(/,\s*$/, '');

  let parsedDate: Date | null = null;

  // Try ISO format first
  dateMatch = isoDateRegex.exec(dateOnly);
  if (dateMatch) {
    parsedDate = new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
  } else {
    // Try slash format with year (US: MM/DD/YYYY)
    dateMatch = slashDateRegex.exec(dateOnly);
    if (dateMatch) {
      let year = Number(dateMatch[3]);
      if (year < 100) year += 2000; // 26 -> 2026
      parsedDate = new Date(year, Number(dateMatch[1]) - 1, Number(dateMatch[2]));
    } else {
      // Try slash format without year (US: MM/DD) - default to current year
      dateMatch = slashDateNoYearRegex.exec(dateOnly);
      if (dateMatch) {
        const currentYear = new Date().getFullYear();
        parsedDate = new Date(currentYear, Number(dateMatch[1]) - 1, Number(dateMatch[2]));
      } else {
        // Fall back to native Date parsing for formats like "Aug 6, 2026" or "Aug 6"
        let nativeDate = new Date(dateOnly);
        if (!Number.isNaN(nativeDate.getTime())) {
          // Native Date parsing may return year 2001 for "Aug 6" (interprets as Aug 6, 2001)
          // Check if the input doesn't contain a 4-digit year and fix it
          const hasExplicitYear = /\d{4}/.test(dateOnly) || /\b\d{2}\b/.test(dateOnly.replace(/\d{1,2}(st|nd|rd|th)?/i, ''));
          if (!hasExplicitYear) {
            const currentYear = new Date().getFullYear();
            nativeDate = new Date(currentYear, nativeDate.getMonth(), nativeDate.getDate());
          }
          parsedDate = nativeDate;
        }
      }
    }
  }

  // Validate the date
  if (parsedDate && Number.isNaN(parsedDate.getTime())) {
    parsedDate = null;
  }

  return { date: parsedDate, time: timeStr };
};

// Month names for format patterns
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Get ordinal suffix for a day (1st, 2nd, 3rd, 4th, etc.) */
const getOrdinal = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

/**
 * Format a Date using a custom pattern string.
 * 
 * Supported tokens:
 * - YYYY: 4-digit year (2024)
 * - YY: 2-digit year (24)
 * - MMMM: Full month (October)
 * - MMM: Short month (Oct)
 * - MM: 2-digit month (10)
 * - M: Month number (10)
 * - Do: Day with ordinal (9th)
 * - DD: 2-digit day (09)
 * - D: Day number (9)
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
 */
export const formatWithPattern = (date: Date, pattern: string): string => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const weekday = date.getDay();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Token map - longest tokens listed first within each category to ensure correct matching
  const tokens: Record<string, string> = {
    YYYY: String(year),
    YY: String(year).slice(-2),
    MMMM: MONTHS_FULL[month],
    MMM: MONTHS_SHORT[month],
    MM: pad(month + 1),
    M: String(month + 1),
    Do: `${day}${getOrdinal(day)}`,
    DD: pad(day),
    D: String(day),
    dddd: WEEKDAYS_FULL[weekday],
    ddd: WEEKDAYS_SHORT[weekday],
    HH: pad(hours),
    H: String(hours),
    hh: pad(hours12),
    h: String(hours12),
    mm: pad(minutes),
    m: String(minutes),
    ss: pad(seconds),
    s: String(seconds),
    A: ampm,
    a: ampm.toLowerCase(),
  };

  // Build regex that matches all tokens in a single pass (longest first to avoid partial matches)
  // Sort by length descending to ensure "MMMM" matches before "MMM", etc.
  const tokenRegex = new RegExp(
    Object.keys(tokens)
      .sort((a, b) => b.length - a.length)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|'),
    'g'
  );

  // Single-pass replacement prevents output corruption
  // (e.g., the "a" in "August" won't be replaced by am/pm)
  return pattern.replace(tokenRegex, (match) => tokens[match] ?? match);
};

/**
 * Format a Date for display in the input field.
 * Includes time if timeEnabled is true.
 * If timeOnly is true, only the time portion is displayed.
 * If displayFormat is provided, uses the custom pattern instead.
 */
export const formatDisplayValue = (
  date: Date | null,
  time: string,
  timeEnabled: boolean,
  timeFormat: '12h' | '24h',
  formatDate?: (date: Date) => string,
  timeOnly?: boolean,
  displayFormat?: string,
): string => {
  // For timeOnly mode, show just the time
  if (timeOnly) {
    if (!time) return '';
    // If we have a displayFormat and a date, use it for time formatting
    if (displayFormat && date) {
      return formatWithPattern(date, displayFormat);
    }
    return timeFormat === '12h' ? formatTime12h(time) : time;
  }

  if (!date) return '';

  // If displayFormat is provided, use it
  if (displayFormat) {
    return formatWithPattern(date, displayFormat);
  }

  const dateStr = formatDate ? formatDate(date) : date.toLocaleDateString();

  if (timeEnabled && time) {
    const timeStr = timeFormat === '12h' ? formatTime12h(time) : time;
    return `${dateStr} ${timeStr}`;
  }

  return dateStr;
};
