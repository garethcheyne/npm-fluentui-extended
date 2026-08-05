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
