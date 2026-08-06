/**
 * OptionSetField Component Examples
 *
 * Demonstrates the OptionSetField component with various configurations:
 *
 * 1. **Single-Select** - Choose one option from a list
 * 2. **Multi-Select** - Choose multiple options with checkboxes
 * 3. **Colors** - Visual indicators for option states
 * 4. **Live Mode** - Options loaded from Dynamics 365 metadata
 */

import React, { useState } from 'react';
import { OptionSetField, formatMultiSelectValue } from '../../../src';
import type { ExampleProps } from '../shared/types';

// =============================================================================
// MOCK OPTIONS
// =============================================================================

const demoStatusOptions = [
  { value: 1, label: 'Active', color: '#107c10' },
  { value: 2, label: 'Inactive', color: '#a19f9d' },
  { value: 3, label: 'Pending Review', color: '#f7630c' },
  { value: 4, label: 'Escalated', color: '#d13438' },
];

const demoIndustryOptions = [
  { value: 10, label: 'Technology' },
  { value: 20, label: 'Manufacturing' },
  { value: 30, label: 'Retail' },
  { value: 40, label: 'Financial Services' },
  { value: 50, label: 'Healthcare' },
];

const demoPriorityOptions = [
  { value: 1, label: 'Low', color: '#0078d4' },
  { value: 2, label: 'Normal', color: '#107c10' },
  { value: 3, label: 'High', color: '#f7630c' },
  { value: 4, label: 'Critical', color: '#d13438' },
];

const demoTagOptions = [
  { value: 1, label: 'Frontend', color: '#0078d4' },
  { value: 2, label: 'Backend', color: '#107c10' },
  { value: 3, label: 'DevOps', color: '#8764b8' },
  { value: 4, label: 'Security', color: '#d13438' },
  { value: 5, label: 'Documentation', color: '#ffaa44' },
];

// =============================================================================
// OPTIONSETFIELD EXAMPLES COMPONENT
// =============================================================================

export function OptionSetFieldExamples({ dynamicsConnected }: ExampleProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────────

  const [statusValue, setStatusValue] = useState<number | null>(null);
  const [industryValues, setIndustryValues] = useState<number[]>([]);
  const [priorityValue, setPriorityValue] = useState<number | null>(null);
  const [readOnlyValue] = useState<number | null>(1);
  const [tagValues, setTagValues] = useState<number[]>([1, 2]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: Basic Usage
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Basic Usage</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          {dynamicsConnected ? (
            <>
              Options loaded live from <strong>account</strong> attribute metadata.
            </>
          ) : (
            <>
              Static options shown — connect to Dynamics 365 to load from live metadata.
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
          {/* Single-select */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Single Select</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              Basic single-selection dropdown.
            </p>
            <OptionSetField
              label={dynamicsConnected ? 'Status Reason (live)' : 'Status Reason'}
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

          {/* Multi-select */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Multi Select</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>multiselect</code> — Checkbox-style selection.
            </p>
            <OptionSetField
              label={dynamicsConnected ? 'Industry (live)' : 'Industries'}
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

          {/* With colors */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Color Indicators</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>showColors</code> — Visual status badges.
            </p>
            <OptionSetField
              label="Priority"
              options={demoPriorityOptions}
              showColors
              value={priorityValue}
              onChange={(value) => setPriorityValue(value as number | null)}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666' }}>
              {priorityValue ?? '(empty)'}
            </pre>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
          <strong>Features:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
            <li><strong>Static mode:</strong> Pass <code>options</code> array for offline use</li>
            <li><strong>Live mode:</strong> Pass <code>entityName</code> + <code>attributeName</code> to fetch from metadata</li>
            <li><strong>Colors:</strong> Set <code>showColors</code> and provide <code>color</code> in options</li>
            <li><strong>Multi-select:</strong> Set <code>multiselect</code> for checkbox-style selection</li>
          </ul>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: Field States
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Field States</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Different visual states for the option set field.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {/* Required */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Required Field</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>required</code> — Shows required indicator.
            </p>
            <OptionSetField
              label="Status"
              options={demoStatusOptions}
              showColors
              required
              value={statusValue}
              onChange={(value) => setStatusValue(value as number | null)}
            />
          </div>

          {/* Disabled */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Disabled Field</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>disabled</code> — Cannot be changed.
            </p>
            <OptionSetField
              label="Status (Disabled)"
              options={demoStatusOptions}
              showColors
              disabled
              value={readOnlyValue}
              onChange={() => {}}
            />
          </div>

          {/* With placeholder */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Custom Placeholder</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>placeholder</code> — Custom empty state text.
            </p>
            <OptionSetField
              label="Priority"
              options={demoPriorityOptions}
              showColors
              placeholder="Choose a priority level..."
              value={null}
              onChange={(value) => setPriorityValue(value as number | null)}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3: Badge Style
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Badge Style</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Coloured options displayed as pill badges using <code>asBadge</code>.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {/* Badge mode */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Badge Mode</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>asBadge</code> — Options with a colour show as badges.
            </p>
            <OptionSetField
              label="Priority"
              options={demoPriorityOptions}
              asBadge
              value={priorityValue}
              onChange={(value) => setPriorityValue(value as number | null)}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666' }}>
              {priorityValue ?? '(empty)'}
            </pre>
          </div>

          {/* Badge with swatch fallback */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Status Badges</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              Status options shown as coloured pills.
            </p>
            <OptionSetField
              label="Status"
              options={demoStatusOptions}
              asBadge
              value={statusValue}
              onChange={(value) => setStatusValue(value as number | null)}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666' }}>
              {statusValue ?? '(empty)'}
            </pre>
          </div>

          {/* Comparison: swatch vs badge */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Swatch vs Badge</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              Compare <code>showColors</code> (swatch) vs <code>asBadge</code> (pill).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <OptionSetField
                label="Swatch Style"
                options={demoPriorityOptions}
                showColors
                value={priorityValue}
                onChange={(value) => setPriorityValue(value as number | null)}
              />
              <OptionSetField
                label="Badge Style"
                options={demoPriorityOptions}
                asBadge
                value={priorityValue}
                onChange={(value) => setPriorityValue(value as number | null)}
              />
            </div>
          </div>

          {/* Multi-select badges */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Multi-Select Badges</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>multiselect + asBadge</code> — Multiple badges displayed.
            </p>
            <OptionSetField
              label="Tags"
              options={demoTagOptions}
              multiselect
              asBadge
              value={tagValues}
              onChange={(value) => setTagValues((value as number[]) ?? [])}
            />
            <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666' }}>
              {tagValues.length > 0 ? tagValues.join(', ') : '(empty)'}
            </pre>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: Appearance Variants
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Appearance Variants</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Different visual styles for the dropdown.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {/* Outline (default) */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Outline (Default)</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>appearance="outline"</code>
            </p>
            <OptionSetField
              label="Status"
              options={demoStatusOptions}
              showColors
              appearance="outline"
              value={statusValue}
              onChange={(value) => setStatusValue(value as number | null)}
            />
          </div>

          {/* Underline */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Underline</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>appearance="underline"</code>
            </p>
            <OptionSetField
              label="Status"
              options={demoStatusOptions}
              showColors
              appearance="underline"
              value={statusValue}
              onChange={(value) => setStatusValue(value as number | null)}
            />
          </div>

          {/* Filled darker */}
          <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <h4 style={{ margin: '0 0 8px' }}>Filled Darker</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              <code>appearance="filled-darker"</code>
            </p>
            <OptionSetField
              label="Status"
              options={demoStatusOptions}
              showColors
              appearance="filled-darker"
              value={statusValue}
              onChange={(value) => setStatusValue(value as number | null)}
            />
          </div>
        </div>
      </section>
    </>
  );
}

export default OptionSetFieldExamples;
