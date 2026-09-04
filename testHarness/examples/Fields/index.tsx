/**
 * Field Component Examples (DateTimeField, OptionSetField)
 *
 * This file demonstrates the field-level components:
 *
 * 1. **DateTimeField** - Date/time picker with DateTimeBehavior support
 *    - UserLocal: Stored in UTC, displayed in local timezone
 *    - DateOnly: Date without time, no timezone conversion
 *    - TimeZoneIndependent: Stored exactly as entered
 *
 * 2. **OptionSetField** - Single or multi-select option picker
 *    - Loads options from Dynamics 365 metadata
 *    - Supports static options for offline demos
 *    - Optional color indicators
 *
 * Both components can operate in two modes:
 * - **Static mode**: Options/behavior passed as props
 * - **Live mode**: Metadata fetched from entityName + attributeName
 */

import { CodeExample } from '../shared/CodeExample';
import React, { useState } from 'react';

// Import from the library source (../../../src) — in a real app you'd use:
// import { DateTimeField, OptionSetField, formatMultiSelectValue } from 'fluentui-extended';
import { DateTimeField, OptionSetField, formatMultiSelectValue } from '../../../src';
import type { ExampleProps } from '../shared/types';
import {
  demoStatusOptions,
  demoIndustryOptions,
  dateTimeBehaviors,
  createInitialDateValues,
  type DateTimeBehavior,
} from './mockOptions';

// =============================================================================
// FIELDS EXAMPLES COMPONENT
// =============================================================================

/**
 * Main component rendering DateTimeField and OptionSetField examples.
 *
 * @param props.dynamicsConnected - Whether connected to Dynamics 365
 */
export function FieldsExamples({ dynamicsConnected }: ExampleProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: DateTimeField values
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Date values for each DateTimeBehavior mode.
   * Stored as ISO strings (the serialized format for Dynamics 365).
   */
  const [dateValues, setDateValues] = useState<Record<DateTimeBehavior, string | null>>(
    createInitialDateValues()
  );

  /**
   * Live metadata date value (only used when connected).
   * Demonstrates reading behavior from attribute metadata.
   */
  const [liveDateValue, setLiveDateValue] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: OptionSetField values
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Single-select status value.
   */
  const [statusValue, setStatusValue] = useState<number | null>(null);

  /**
   * Multi-select industry values.
   */
  const [industryValues, setIndustryValues] = useState<number[]>([]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: DateTimeField — DateTimeBehavior
          Shows how the same picked date serializes differently based on behavior.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>DateTimeField — DateTimeBehavior</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          The same picked date serialized three ways. <strong>DateOnly</strong> and
          <strong> TimeZoneIndependent</strong> never pass through UTC, so they cannot drift a
          day the way <code>toISOString()</code> does in a positive UTC offset.
        </p>

        {/*
          Grid of DateTimeField instances, one per behavior mode.
          This demonstrates how the same UI produces different serialized values.
        */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
              {/*
                Key DateTimeField props:
                - label: Display label
                - behavior: UserLocal | DateOnly | TimeZoneIndependent
                - showTime: Whether to include time picker (disabled for DateOnly)
                - value: ISO string or null
                - onChange: Receives the serialized ISO string
              */}
              <DateTimeField
                label={behavior}
                behavior={behavior}
                showTime={behavior !== 'DateOnly'}
                value={dateValues[behavior]}
                onChange={(stored) =>
                  setDateValues((current) => ({ ...current, [behavior]: stored }))
                }
              />

              {/* Display the raw serialized value */}
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
              <strong>UserLocal:</strong> Converts to UTC for storage (may shift date in + UTC
              offsets)
            </li>
            <li>
              <strong>DateOnly:</strong> No time component, stored as <code>YYYY-MM-DD</code>
            </li>
            <li>
              <strong>TimeZoneIndependent:</strong> Stored exactly as entered, no UTC conversion
            </li>
          </ul>
        </div>

        {/* Live metadata example (only when connected) */}
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
            <h3 style={{ marginTop: 0 }}>Behavior read from live metadata</h3>
            <p style={{ color: '#666', marginBottom: 12, fontSize: 14 }}>
              <code>account.createdon</code> — the behavior comes from attribute metadata rather
              than a prop, so the hint below reflects however your environment configured it.
            </p>

            {/*
              Live mode: Pass entityName + attributeName instead of behavior prop.
              The component fetches metadata to determine the correct behavior.
            */}
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
        <CodeExample sampleId="fields-datetimefield-datetimebehavior" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1b: DateTimeField — Advanced Props
          Demonstrates allowFreeType, timeFormat, minTime/maxTime, timeOnly.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>DateTimeField — Advanced Props</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Additional props for customizing input behavior and time formatting.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {/* allowFreeType example */}
          <div
            style={{
              border: '1px solid #e1dfdd',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
            }}
          >
            <h4 style={{ margin: '0 0 8px' }}>Free-Type Input</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>allowFreeType</code> — Type directly in the field, supports natural date/time parsing.
            </p>
            <DateTimeField
              label="Free-Type Date/Time"
              showTime
              allowFreeType
              value={dateValues['UserLocal']}
              onChange={(stored) =>
                setDateValues((current) => ({ ...current, UserLocal: stored }))
              }
              placeholder="Type a date like 'Jan 15, 2025 3:30 PM'"
            />
          </div>

          {/* 12h time format example */}
          <div
            style={{
              border: '1px solid #e1dfdd',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
            }}
          >
            <h4 style={{ margin: '0 0 8px' }}>12-Hour Format</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>timeFormat="12h"</code> — Displays times as 3:30 PM instead of 15:30.
            </p>
            <DateTimeField
              label="12h Time Format"
              showTime
              timeFormat="12h"
              value={dateValues['UserLocal']}
              onChange={(stored) =>
                setDateValues((current) => ({ ...current, UserLocal: stored }))
              }
            />
          </div>

          {/* 24h time format example */}
          <div
            style={{
              border: '1px solid #e1dfdd',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
            }}
          >
            <h4 style={{ margin: '0 0 8px' }}>24-Hour Format</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>timeFormat="24h"</code> — Military time format (default).
            </p>
            <DateTimeField
              label="24h Time Format"
              showTime
              timeFormat="24h"
              value={dateValues['UserLocal']}
              onChange={(stored) =>
                setDateValues((current) => ({ ...current, UserLocal: stored }))
              }
            />
          </div>

          {/* minTime/maxTime example */}
          <div
            style={{
              border: '1px solid #e1dfdd',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
            }}
          >
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
              value={dateValues['UserLocal']}
              onChange={(stored) =>
                setDateValues((current) => ({ ...current, UserLocal: stored }))
              }
            />
          </div>

          {/* timeIntervalMinutes example */}
          <div
            style={{
              border: '1px solid #e1dfdd',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
            }}
          >
            <h4 style={{ margin: '0 0 8px' }}>Custom Time Interval</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>timeIntervalMinutes=15</code> — 15-minute increments instead of 30.
            </p>
            <DateTimeField
              label="15-Minute Intervals"
              showTime
              timeFormat="12h"
              timeIntervalMinutes={15}
              value={dateValues['UserLocal']}
              onChange={(stored) =>
                setDateValues((current) => ({ ...current, UserLocal: stored }))
              }
            />
          </div>

          {/* timeOnly example */}
          <div
            style={{
              border: '1px solid #e1dfdd',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
            }}
          >
            <h4 style={{ margin: '0 0 8px' }}>Time Only Picker</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>timeOnly</code> — No calendar, just time selection.
            </p>
            <DateTimeField
              label="Select Time Only"
              timeOnly
              timeFormat="12h"
              value={dateValues['UserLocal']}
              onChange={(stored) =>
                setDateValues((current) => ({ ...current, UserLocal: stored }))
              }
              placeholder="Select a time..."
            />
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
          <strong>New props summary:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
            <li>
              <code>allowFreeType</code> — Enable direct keyboard input with date/time parsing
            </li>
            <li>
              <code>timeFormat</code> — <code>"12h"</code> or <code>"24h"</code> time display
            </li>
            <li>
              <code>minTime</code> / <code>maxTime</code> — Restrict selectable time window
            </li>
            <li>
              <code>timeIntervalMinutes</code> — Time slot intervals (15, 30, 60, etc.)
            </li>
            <li>
              <code>timeOnly</code> — Hide the calendar, show only time picker
            </li>
          </ul>
        </div>
        <CodeExample sampleId="fields-datetimefield-advanced-props" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: OptionSetField
          Shows single-select and multi-select with static and live options.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>OptionSetField</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          {dynamicsConnected ? (
            <>
              Options loaded live from <strong>account</strong> attribute metadata, including the
              global option set behind <code>industrycode</code>.
            </>
          ) : (
            <>
              Static options shown — connect to Dynamics 365 to load options from live attribute
              metadata.
            </>
          )}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {/* Single-select example */}
          <div
            style={{
              border: '1px solid #e1dfdd',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
            }}
          >
            {/*
              OptionSetField can operate in two modes:
              1. Static: Pass options array directly
              2. Live: Pass entityName + attributeName to fetch from metadata

              Key props:
              - showColors: Display color indicators (if options have colors)
              - value: Selected value(s)
              - onChange: Receives new selection
            */}
            <OptionSetField
              label={dynamicsConnected ? 'Status Reason (live: statuscode)' : 'Status Reason (static)'}
              entityName={dynamicsConnected ? 'account' : undefined}
              attributeName={dynamicsConnected ? 'statuscode' : undefined}
              options={dynamicsConnected ? undefined : demoStatusOptions}
              showColors
              value={statusValue}
              onChange={(value) => setStatusValue(value as number | null)}
              onLoadError={(err) => console.error('[OptionSetField]', err)}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666' }}>
              {statusValue ?? '(empty)'}
            </pre>
          </div>

          {/* Multi-select example */}
          <div
            style={{
              border: '1px solid #e1dfdd',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
            }}
          >
            {/*
              Multi-select mode:
              - multiselect: Enables multiple selection
              - value: Array of selected values
              - onChange: Receives array of new selections

              formatMultiSelectValue: Helper to display comma-separated values
            */}
            <OptionSetField
              label={dynamicsConnected ? 'Industry (live: industrycode)' : 'Industries (static)'}
              entityName={dynamicsConnected ? 'account' : undefined}
              attributeName={dynamicsConnected ? 'industrycode' : undefined}
              options={dynamicsConnected ? undefined : demoIndustryOptions}
              multiselect
              value={industryValues}
              onChange={(value) => setIndustryValues((value as number[]) ?? [])}
              onLoadError={(err) => console.error('[OptionSetField]', err)}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666' }}>
              {formatMultiSelectValue(industryValues) || '(empty)'}
            </pre>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
          <strong>OptionSetField features:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
            <li>
              <strong>Static mode:</strong> Pass <code>options</code> array for offline use
            </li>
            <li>
              <strong>Live mode:</strong> Pass <code>entityName</code> + <code>attributeName</code>{' '}
              to fetch from metadata
            </li>
            <li>
              <strong>Colors:</strong> Set <code>showColors</code> and provide{' '}
              <code>color</code> in options
            </li>
            <li>
              <strong>Multi-select:</strong> Set <code>multiselect</code> for checkbox-style
              selection
            </li>
          </ul>
        </div>
        <CodeExample sampleId="fields-optionsetfield" />
      </section>
    </>
  );
}

export default FieldsExamples;
