/**
 * RecordHoverCard Component Examples
 *
 * This file demonstrates the RecordHoverCard component which provides:
 *
 * 1. **Delayed hover activation** - Waits for pointer to settle before fetching
 * 2. **Static mode** - Pass record data directly for offline demos
 * 3. **Live mode** - Fetch record details from Dynamics 365 on hover
 * 4. **Action slots** - Customizable actions (Open record, Edit, etc.)
 *
 * The component intelligently handles hover behavior:
 * - Debounces rapid mouse movements
 * - Only fetches data when pointer settles
 * - Prevents network requests when dragging across rows
 */

import { CodeExample } from '../shared/CodeExample';
import React from 'react';
import { Link, Text, Badge } from '@fluentui/react-components';
import { BuildingRegular, PersonRegular } from '@fluentui/react-icons';

// Import from the library source (../../../src) — in a real app you'd use:
// import { RecordHoverCard } from 'fluentui-extended';
import { RecordHoverCard } from '../../../src';
import type { ExampleProps, AccountOption } from '../shared/types';

// =============================================================================
// STATIC RECORD DATA
// =============================================================================

/**
 * Example record data for static HoverCard demo.
 * Shows an account with status badge and various details.
 */
const staticAccountRecord = {
  title: '007 PROJECTS PTY LTD',
  subtitle: 'COD007PR777',
  icon: <BuildingRegular />,
  details: [
    {
      label: 'Status',
      value: (
        <Badge appearance="filled" color="success" size="small">
          Active
        </Badge>
      ),
    },
    { label: 'Phone', value: '32682915877' },
    { label: 'Industry', value: 'Construction' },
    { label: 'Owner', value: 'Gareth Cheyne' },
  ],
};

/**
 * Example contact record for static HoverCard demo.
 */
const staticContactRecord = {
  title: 'Jane Smith',
  subtitle: 'Chief Executive Officer',
  icon: <PersonRegular />,
  details: [
    { label: 'Email', value: 'jane@contoso.com' },
    { label: 'Phone', value: '0412 345 678' },
  ],
};

// =============================================================================
// HOVERCARD EXAMPLES COMPONENT
// =============================================================================

export interface HoverCardExamplesProps extends ExampleProps {
  /**
   * Live account records loaded from Dynamics 365.
   * Used to demonstrate the live fetch-on-hover pattern.
   */
  liveAccounts: AccountOption[];
}

/**
 * Main component rendering RecordHoverCard examples.
 *
 * @param props.dynamicsConnected - Whether connected to Dynamics 365
 * @param props.liveAccounts - Account records for live demo
 */
export function HoverCardExamples({
  dynamicsConnected,
  liveAccounts,
}: HoverCardExamplesProps) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2>Record Hover Card</h2>
      <p style={{ color: '#666', marginBottom: 12 }}>
        Hover a record reference to reveal its details. The fetch waits for the pointer to
        settle, so dragging across a column does not fire a request per row.
      </p>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: Static Records
          Demonstrates HoverCard with pre-defined data (no network requests).
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          border: '1px solid #e1dfdd',
          borderRadius: 8,
          padding: 24,
          background: '#fff',
          display: 'flex',
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        {/*
          Static mode: Pass the `record` prop with all display data.
          No network request is made — data is rendered directly.

          Key props:
          - record.title: Main heading
          - record.subtitle: Secondary text
          - record.icon: React node (typically a FluentUI icon)
          - record.details: Array of { label, value } pairs
          - actions: React node rendered at the bottom of the card
          - children: The trigger element (what you hover)
        */}
        <RecordHoverCard
          record={staticAccountRecord}
          actions={
            <Link as="button" style={{ fontSize: 12 }}>
              Open record
            </Link>
          }
        >
          <Link as="button" style={{ fontSize: 14 }}>
            007 PROJECTS PTY LTD
          </Link>
        </RecordHoverCard>

        {/*
          Another static example without actions.
          Shows minimal hover card with just title, subtitle, and details.
        */}
        <RecordHoverCard record={staticContactRecord}>
          <Link as="button" style={{ fontSize: 14 }}>
            Jane Smith
          </Link>
        </RecordHoverCard>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
        <strong>Static mode usage:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
          <li>
            Pass <code>record</code> prop with pre-loaded data
          </li>
          <li>No network requests — ideal for offline demos or cached data</li>
          <li>
            Use <code>actions</code> slot for custom buttons/links
          </li>
        </ul>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: Live Records
          Demonstrates HoverCard that fetches data on hover.
          ═══════════════════════════════════════════════════════════════════════ */}
      <h3 style={{ marginTop: 32 }}>Live records</h3>
      <p style={{ color: '#666', marginBottom: 12 }}>
        {dynamicsConnected
          ? 'Real accounts, each fetching its own columns on hover. Open the network tab to see that nothing is requested until a pointer settles.'
          : 'Connect to Dynamics 365 to hover real records.'}
      </p>

      <div
        style={{
          border: '1px solid #e1dfdd',
          borderRadius: 8,
          padding: 24,
          background: '#fff',
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        {/* Loading state */}
        {dynamicsConnected && liveAccounts.length === 0 && (
          <Text size={200} style={{ color: '#888' }}>
            Loading accounts...
          </Text>
        )}

        {/*
          Live mode: Pass entityName, recordId, and columns.
          The component fetches data from Dynamics 365 when hovered.

          Key props:
          - entityName: Dynamics 365 entity logical name
          - recordId: GUID of the record to fetch
          - columns: Array of attribute names to retrieve
          - onLoadError: Error callback for fetch failures

          The fetch is debounced — rapid mouse movements won't
          trigger multiple requests.
        */}
        {liveAccounts.slice(0, 5).map((account) => (
          <RecordHoverCard
            key={account.key}
            entityName="account"
            recordId={account.key}
            columns={['accountnumber', 'telephone1', 'primarycontactid', 'industrycode']}
            actions={
              <Link as="button" style={{ fontSize: 12 }}>
                Open record
              </Link>
            }
            onLoadError={(err) => console.error('[RecordHoverCard]', err)}
          >
            <Link as="button" style={{ fontSize: 14 }}>
              {account.text}
            </Link>
          </RecordHoverCard>
        ))}

        {/* Not connected placeholder */}
        {!dynamicsConnected && (
          <Text size={200} style={{ color: '#888' }}>
            Not connected.
          </Text>
        )}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
        <strong>Live mode behavior:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
          <li>
            <strong>Debounced:</strong> Waits ~300ms for pointer to settle before fetching
          </li>
          <li>
            <strong>Efficient:</strong> Dragging across rows doesn't fire requests
          </li>
          <li>
            <strong>Cached:</strong> Re-hovering same record uses cached data
          </li>
          <li>
            <strong>Columns:</strong> Only specified columns are fetched (<code>$select</code>)
          </li>
        </ul>
      </div>
      <CodeExample sampleId="hovercard-record-hover-card" />
    </section>
  );
}

export default HoverCardExamples;
