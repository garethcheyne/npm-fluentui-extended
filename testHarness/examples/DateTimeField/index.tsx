/**
 * DateTimeField Component Examples
 *
 * Demonstrates the DateTimeField component with various configurations:
 *
 * 1. **DateTimeBehavior** - How dates are stored and displayed
 *    - UserLocal: Stored in UTC, displayed in local timezone
 *    - DateOnly: Date without time, no timezone conversion
 *    - TimeZoneIndependent: Stored exactly as entered
 *
 * 2. **Advanced Props**
 *    - allowFreeType: Direct keyboard input with natural parsing
 *    - timeFormat: 12h or 24h display
 *    - minTime/maxTime: Restricted time windows
 *    - timeOnly: Time picker without calendar
 *    - displayFormat: Custom format patterns
 */

import React, { useState } from 'react';
import { DateTimeField, DateTimeRangeField } from '../../../src';
import type { ExampleProps } from '../shared/types';

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

const dateTimeBehaviors = ['UserLocal', 'DateOnly', 'TimeZoneIndependent'] as const;
type DateTimeBehavior = (typeof dateTimeBehaviors)[number];

function createInitialDateValues(): Record<DateTimeBehavior, string | null> {
  return {
    UserLocal: null,
    DateOnly: null,
    TimeZoneIndependent: null,
  };
}

// =============================================================================
// DATETIMEFIELD EXAMPLES COMPONENT
// =============================================================================

export function DateTimeFieldExamples({ dynamicsConnected }: ExampleProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────────

  const [dateValues, setDateValues] = useState<Record<DateTimeBehavior, string | null>>(
    createInitialDateValues()
  );
  const [liveDateValue, setLiveDateValue] = useState<string | null>(null);

  // Advanced Props section - individual state for each example
  const [freeTypeValue, setFreeTypeValue] = useState<string | null>(null);
  const [format12hValue, setFormat12hValue] = useState<string | null>(null);
  const [format24hValue, setFormat24hValue] = useState<string | null>(null);
  const [restrictedTimeValue, setRestrictedTimeValue] = useState<string | null>(null);
  const [intervalValue, setIntervalValue] = useState<string | null>(null);
  const [timeOnlyValue, setTimeOnlyValue] = useState<string | null>(null);
  const [rangeValue, setRangeValue] = useState<{
    startValue: string | null;
    endValue: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startValue: null,
    endValue: null,
    startDate: null,
    endDate: null,
  });

  // Custom Display Format section - individual state for each example
  const [fullFormatValue, setFullFormatValue] = useState<string | null>(null);
  const [shortDateValue, setShortDateValue] = useState<string | null>(null);
  const [usDateValue, setUsDateValue] = useState<string | null>(null);
  const [isoFormatValue, setIsoFormatValue] = useState<string | null>(null);
  const [timeFormatValue, setTimeFormatValue] = useState<string | null>(null);
  const [weekdayValue, setWeekdayValue] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: DateTimeBehavior
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>DateTimeBehavior</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          The same picked date serialized three ways. <strong>DateOnly</strong> and
          <strong> TimeZoneIndependent</strong> never pass through UTC, so they cannot drift a
          day the way <code>toISOString()</code> does in a positive UTC offset.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {dateTimeBehaviors.map((behavior) => (
            <div
              key={behavior}
              style={{
                border: '1px solid #e1dfdd',
                borderRadius: 8,
                padding: 16,
                background: '#fff',
              }}
            >
              <DateTimeField
                label={behavior}
                behavior={behavior}
                showTime={behavior !== 'DateOnly'}
                value={dateValues[behavior]}
                onChange={(stored) =>
                  setDateValues((current) => ({ ...current, [behavior]: stored }))
                }
              />
              <pre
                style={{
                  margin: '12px 0 0',
                  fontSize: 12,
                  color: '#666',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {dateValues[behavior] ?? '(empty)'}
              </pre>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
          <strong>Behavior differences:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
            <li>
              <strong>UserLocal:</strong> Converts to UTC for storage (may shift date in + UTC offsets)
            </li>
            <li>
              <strong>DateOnly:</strong> No time component, stored as <code>YYYY-MM-DD</code>
            </li>
            <li>
              <strong>TimeZoneIndependent:</strong> Stored exactly as entered, no UTC conversion
            </li>
          </ul>
        </div>

        {dynamicsConnected && (
          <div
            style={{
              marginTop: 24,
              border: '1px solid #0078d4',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
              maxWidth: 420,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Behavior from live metadata</h3>
            <p style={{ color: '#666', marginBottom: 12, fontSize: 14 }}>
              <code>account.createdon</code> — behavior comes from attribute metadata.
            </p>
            <DateTimeField
              label="Created On (live)"
              entityName="account"
              attributeName="createdon"
              showTime
              value={liveDateValue}
              onChange={setLiveDateValue}
              onLoadError={(err) => console.error('[DateTimeField]', err)}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666' }}>
              {liveDateValue ?? '(empty)'}
            </pre>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: Advanced Props
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Advanced Props</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Additional props for customizing input behavior and time formatting.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {/* allowFreeType */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Free-Type Input</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>allowFreeType</code> — Type directly, supports natural date/time parsing.
            </p>
            <DateTimeField
              label="Free-Type Date/Time"
              showTime
              allowFreeType
              value={freeTypeValue}
              onChange={setFreeTypeValue}
              placeholder="Type a date like 'Jan 15, 2025 3:30 PM'"
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {freeTypeValue ?? '(empty)'}
            </pre>
          </div>

          {/* 12h format */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>12-Hour Format</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>timeFormat="12h"</code> — Displays times as 3:30 PM.
            </p>
            <DateTimeField
              label="12h Time Format"
              showTime
              timeFormat="12h"
              value={format12hValue}
              onChange={setFormat12hValue}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {format12hValue ?? '(empty)'}
            </pre>
          </div>

          {/* 24h format */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>24-Hour Format</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>timeFormat="24h"</code> — Military time format (default).
            </p>
            <DateTimeField
              label="24h Time Format"
              showTime
              timeFormat="24h"
              value={format24hValue}
              onChange={setFormat24hValue}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {format24hValue ?? '(empty)'}
            </pre>
          </div>

          {/* minTime/maxTime */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Restricted Time Window</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>minTime="08:00"</code> / <code>maxTime="17:00"</code> — Business hours only.
            </p>
            <DateTimeField
              label="Business Hours Only"
              showTime
              timeFormat="12h"
              minTime="08:00"
              maxTime="17:00"
              value={restrictedTimeValue}
              onChange={setRestrictedTimeValue}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {restrictedTimeValue ?? '(empty)'}
            </pre>
          </div>

          {/* timeIntervalMinutes */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Custom Time Interval</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>timeIntervalMinutes=15</code> — 15-minute increments.
            </p>
            <DateTimeField
              label="15-Minute Intervals"
              showTime
              timeFormat="12h"
              timeIntervalMinutes={15}
              value={intervalValue}
              onChange={setIntervalValue}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {intervalValue ?? '(empty)'}
            </pre>
          </div>

          {/* timeOnly */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Time Only Picker</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>timeOnly</code> — No calendar, just time selection.
            </p>
            <DateTimeField
              label="Select Time Only"
              timeOnly
              timeFormat="12h"
              value={timeOnlyValue}
              onChange={setTimeOnlyValue}
              placeholder="Select a time..."
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {timeOnlyValue ?? '(empty)'}
            </pre>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
          <strong>Props summary:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
            <li><code>allowFreeType</code> — Enable direct keyboard input with date/time parsing</li>
            <li><code>timeFormat</code> — <code>"12h"</code> or <code>"24h"</code> time display</li>
            <li><code>minTime</code> / <code>maxTime</code> — Restrict selectable time window</li>
            <li><code>timeIntervalMinutes</code> — Time slot intervals (15, 30, 60, etc.)</li>
            <li><code>timeOnly</code> — Hide the calendar, show only time picker</li>
          </ul>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3: Range / Between
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Date / Time Between</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Use <code>DateTimeRangeField</code> when you need a start and end value together,
          with the callback exposing both serialized stored values and both resolved <code>Date</code> objects.
        </p>

        <div
          style={{
            border: '1px solid #e1dfdd',
            borderRadius: 8,
            padding: 16,
            background: '#fff',
            maxWidth: 640,
          }}
        >
          <DateTimeRangeField
            label="Booking window"
            startLabel="Start date"
            endLabel="End date"
            showTime
            timeFormat="12h"
            value={{
              start: rangeValue.startValue,
              end: rangeValue.endValue,
            }}
            onChange={setRangeValue}
          />

          <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(
              {
                startValue: rangeValue.startValue,
                endValue: rangeValue.endValue,
                startDate: rangeValue.startDate?.toISOString() ?? null,
                endDate: rangeValue.endDate?.toISOString() ?? null,
              },
              null,
              2,
            )}
          </pre>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: Custom Display Format
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Custom Display Format</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Use <code>displayFormat</code> to customize how dates and times are displayed using format tokens.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {/* Full format example */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Full Custom Format</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>displayFormat="ddd Do MMMM, YYYY h:mm a"</code>
            </p>
            <DateTimeField
              label="Custom Format"
              showTime
              timeFormat="12h"
              displayFormat="ddd Do MMMM, YYYY h:mm a"
              value={fullFormatValue}
              onChange={setFullFormatValue}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {fullFormatValue ?? '(empty)'}
            </pre>
          </div>

          {/* Short date format */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Short Date</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>displayFormat="DD/MM/YYYY"</code>
            </p>
            <DateTimeField
              label="DD/MM/YYYY"
              displayFormat="DD/MM/YYYY"
              value={shortDateValue}
              onChange={setShortDateValue}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {shortDateValue ?? '(empty)'}
            </pre>
          </div>

          {/* US date format */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>US Date Format</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>displayFormat="MMM D, YYYY"</code>
            </p>
            <DateTimeField
              label="MMM D, YYYY"
              displayFormat="MMM D, YYYY"
              value={usDateValue}
              onChange={setUsDateValue}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {usDateValue ?? '(empty)'}
            </pre>
          </div>

          {/* ISO format */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>ISO Format</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>displayFormat="YYYY-MM-DD HH:mm"</code>
            </p>
            <DateTimeField
              label="ISO Format"
              showTime
              displayFormat="YYYY-MM-DD HH:mm"
              value={isoFormatValue}
              onChange={setIsoFormatValue}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {isoFormatValue ?? '(empty)'}
            </pre>
          </div>

          {/* Time only format */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Time Only with Format</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>timeOnly displayFormat="h:mm A"</code>
            </p>
            <DateTimeField
              label="Time Only"
              timeOnly
              displayFormat="h:mm A"
              value={timeFormatValue}
              onChange={setTimeFormatValue}
              placeholder="Select time..."
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {timeFormatValue ?? '(empty)'}
            </pre>
          </div>

          {/* Weekday + date */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Weekday + Date</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>displayFormat="dddd, MMMM Do"</code>
            </p>
            <DateTimeField
              label="Weekday Format"
              displayFormat="dddd, MMMM Do"
              value={weekdayValue}
              onChange={setWeekdayValue}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
              Stored: {weekdayValue ?? '(empty)'}
            </pre>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
          <strong>Format tokens:</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginTop: 8 }}>
            <div>
              <strong>Year:</strong> YYYY (2024), YY (24)
            </div>
            <div>
              <strong>Month:</strong> MMMM (October), MMM (Oct), MM (10), M (10)
            </div>
            <div>
              <strong>Day:</strong> Do (9th), DD (09), D (9)
            </div>
            <div>
              <strong>Weekday:</strong> dddd (Monday), ddd (Mon)
            </div>
            <div>
              <strong>Hour:</strong> HH (14), H (14), hh (02), h (2)
            </div>
            <div>
              <strong>Minute:</strong> mm (30), m (30)
            </div>
            <div>
              <strong>AM/PM:</strong> A (PM), a (pm)
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default DateTimeFieldExamples;
