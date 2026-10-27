import { describe, it, expect } from 'vitest';
import {
  parseFreeFormDateTime,
  isDayFirst,
  anchorTimeOnlyDate,
  buildTimeOptions,
  formatLocalDate,
  formatLocalTime,
  formatStoredValue,
  formatTimeOnlyValue,
  parseTimeOnlyValue,
  parseStoredValue,
  withTime,
} from './DateTimeField.utils';

describe('parseStoredValue', () => {
  it('keeps a DateOnly value on the stored calendar day', () => {
    // The regression this guards: new Date('2026-08-06') is UTC midnight, which is
    // the 5th for anyone west of Greenwich
    const parsed = parseStoredValue('2026-08-06', 'DateOnly');

    expect(parsed).not.toBeNull();
    expect(formatLocalDate(parsed!)).toBe('2026-08-06');
    expect(parsed!.getHours()).toBe(0);
    expect(parsed!.getMinutes()).toBe(0);
  });

  it('strips the time from a DateOnly value that carries one', () => {
    const parsed = parseStoredValue('2026-08-06T18:45:00', 'DateOnly');

    expect(formatLocalDate(parsed!)).toBe('2026-08-06');
    expect(parsed!.getHours()).toBe(0);
  });

  it('reads TimeZoneIndependent values as wall-clock, applying no offset', () => {
    const parsed = parseStoredValue('2026-08-06T14:30:00', 'TimeZoneIndependent');

    expect(formatLocalDate(parsed!)).toBe('2026-08-06');
    expect(formatLocalTime(parsed!)).toBe('14:30');
  });

  it('converts a UserLocal value through the normal Date parser', () => {
    const parsed = parseStoredValue('2026-08-06T12:00:00Z', 'UserLocal');

    expect(parsed!.toISOString()).toBe('2026-08-06T12:00:00.000Z');
  });

  it('returns null for empty and unparseable input', () => {
    expect(parseStoredValue('', 'UserLocal')).toBeNull();
    expect(parseStoredValue(null, 'DateOnly')).toBeNull();
    expect(parseStoredValue(undefined, 'DateOnly')).toBeNull();
    expect(parseStoredValue('   ', 'DateOnly')).toBeNull();
    expect(parseStoredValue('not a date', 'UserLocal')).toBeNull();
  });

  it('passes a Date through, rejecting an Invalid Date', () => {
    const date = new Date(2026, 7, 6);

    expect(parseStoredValue(date, 'DateOnly')).toBe(date);
    expect(parseStoredValue(new Date('nonsense'), 'DateOnly')).toBeNull();
  });
});

describe('formatStoredValue', () => {
  it('writes DateOnly as a bare calendar date', () => {
    expect(formatStoredValue(new Date(2026, 7, 6, 23, 30), 'DateOnly')).toBe('2026-08-06');
  });

  it('writes TimeZoneIndependent as local wall-clock with no Z suffix', () => {
    expect(formatStoredValue(new Date(2026, 7, 6, 14, 30, 15), 'TimeZoneIndependent')).toBe('2026-08-06T14:30:15');
  });

  it('writes UserLocal as UTC', () => {
    const date = new Date(Date.UTC(2026, 7, 6, 12, 0, 0));

    expect(formatStoredValue(date, 'UserLocal')).toBe('2026-08-06T12:00:00.000Z');
  });

  it('returns null for no date or an Invalid Date', () => {
    expect(formatStoredValue(null, 'UserLocal')).toBeNull();
    expect(formatStoredValue(new Date('nonsense'), 'UserLocal')).toBeNull();
  });

  it('round-trips a DateOnly value regardless of the host timezone', () => {
    const stored = '2026-01-01';
    const roundTripped = formatStoredValue(parseStoredValue(stored, 'DateOnly'), 'DateOnly');

    expect(roundTripped).toBe(stored);
  });
});

describe('withTime', () => {
  it('applies the time without moving the day', () => {
    const combined = withTime(new Date(2026, 7, 6), '14:30');

    expect(formatLocalDate(combined)).toBe('2026-08-06');
    expect(formatLocalTime(combined)).toBe('14:30');
  });

  it('clamps out-of-range values rather than rolling into the next day', () => {
    const combined = withTime(new Date(2026, 7, 6), '99:99');

    expect(formatLocalDate(combined)).toBe('2026-08-06');
    expect(formatLocalTime(combined)).toBe('23:59');
  });

  it('leaves the date untouched when the time cannot be parsed', () => {
    const original = new Date(2026, 7, 6, 9, 15);
    const combined = withTime(original, 'lunchtime');

    expect(combined.getTime()).toBe(original.getTime());
  });
});

describe('buildTimeOptions', () => {
  it('covers the full day at the requested interval', () => {
    const options = buildTimeOptions(30);

    expect(options).toHaveLength(48);
    expect(options[0]).toBe('00:00');
    expect(options[1]).toBe('00:30');
    expect(options[options.length - 1]).toBe('23:30');
  });

  it('falls back to 30 minutes for a nonsensical interval', () => {
    expect(buildTimeOptions(0)).toHaveLength(48);
    expect(buildTimeOptions(-5)).toHaveLength(48);
  });
});

describe('timeOnly helpers', () => {
  it('parses HH:mm to a date anchored to 1970-01-01', () => {
    const parsed = parseTimeOnlyValue('14:30');

    expect(parsed).not.toBeNull();
    expect(formatLocalDate(parsed!)).toBe('1970-01-01');
    expect(formatLocalTime(parsed!)).toBe('14:30');
  });

  it('rebases a full date onto the time-only anchor day', () => {
    const anchored = anchorTimeOnlyDate(new Date(2026, 7, 6, 9, 15, 10));

    expect(formatLocalDate(anchored)).toBe('1970-01-01');
    expect(formatLocalTime(anchored)).toBe('09:15');
    expect(anchored.getSeconds()).toBe(10);
  });

  it('serializes time-only values as HH:mm', () => {
    expect(formatTimeOnlyValue(new Date(1970, 0, 1, 8, 45, 12))).toBe('08:45');
    expect(formatTimeOnlyValue(null)).toBeNull();
  });
});

describe('parseFreeFormDateTime', () => {
  const ymd = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null);

  it('reads numeric dates day first for day-first locales', () => {
    expect(ymd(parseFreeFormDateTime('6/8/2026', 'DateOnly', true).date)).toBe('2026-8-6');
    expect(ymd(parseFreeFormDateTime('06.08.26', 'DateOnly', true).date)).toBe('2026-8-6');
    expect(ymd(parseFreeFormDateTime('6-8-2026', 'DateOnly', true).date)).toBe('2026-8-6');
  });

  it('reads numeric dates month first for month-first locales', () => {
    expect(ymd(parseFreeFormDateTime('6/8/2026', 'DateOnly', false).date)).toBe('2026-6-8');
  });

  it('reads ISO dates the same way everywhere', () => {
    expect(ymd(parseFreeFormDateTime('2026-08-06', 'DateOnly', true).date)).toBe('2026-8-6');
    expect(ymd(parseFreeFormDateTime('2026-08-06', 'DateOnly', false).date)).toBe('2026-8-6');
  });

  it('refuses dates that do not exist rather than rolling them over', () => {
    expect(parseFreeFormDateTime('31/02/2026', 'DateOnly', true).date).toBeNull();
    expect(parseFreeFormDateTime('13/13/2026', 'DateOnly', true).date).toBeNull();
    expect(parseFreeFormDateTime('2026-02-30', 'DateOnly', true).date).toBeNull();
  });

  it('round-trips what toLocaleDateString shows', () => {
    const date = new Date(2026, 7, 6);
    for (const locale of ['en-AU', 'en-GB', 'en-US', 'de-DE']) {
      const shown = date.toLocaleDateString(locale);
      expect(ymd(parseFreeFormDateTime(shown, 'DateOnly', isDayFirst(undefined, locale)).date)).toBe('2026-8-6');
    }
  });
});

describe('isDayFirst', () => {
  it('follows the locale', () => {
    expect(isDayFirst(undefined, 'en-AU')).toBe(true);
    expect(isDayFirst(undefined, 'en-US')).toBe(false);
  });

  it('follows the display pattern over the locale', () => {
    expect(isDayFirst('MM/dd/yyyy', 'en-AU')).toBe(false);
    expect(isDayFirst('dd MMM yyyy', 'en-US')).toBe(true);
  });
});
