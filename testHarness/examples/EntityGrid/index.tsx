/**
 * EntityGrid Component Examples
 *
 * ⚠️ IN DEVELOPMENT - This component is still under active development and
 * may have breaking changes. The API is not yet stable.
 *
 * This file demonstrates the EntityGrid component which provides:
 *
 * 1. **Server-side paging** - Uses OData `@odata.nextLink` for efficient paging
 * 2. **Server-side sorting** - Pushes $orderby to the server
 * 3. **Row selection** - Checkbox selection with callback
 * 4. **Lookup resolution** - Displays formatted values for lookup fields
 * 5. **Row virtualization** - Renders only visible rows for performance
 *
 * The EntityGrid handles the Dynamics 365 Web API automatically:
 * - Builds OData queries with $select, $orderby, $top
 * - Follows @odata.nextLink for paging
 * - Extracts FormattedValue annotations for lookups
 * - Manages loading, error, and empty states
 */

import { CodeExample } from '../shared/CodeExample';
import React, { useState } from 'react';
import { Badge } from '@fluentui/react-components';

// Import from the library source (../../../src) — in a real app you'd use:
// import { EntityGrid } from 'fluentui-extended';
import { EntityGrid } from '../../../src';
import type { ExampleProps } from '../shared/types';
import { accountColumns } from './columns';

// =============================================================================
// ENTITYGRID EXAMPLES COMPONENT
// =============================================================================

/**
 * Main component rendering EntityGrid examples.
 *
 * @param props.dynamicsConnected - Whether connected to Dynamics 365
 * @param props.onCommandLog - Callback to log grid actions
 */
export function EntityGridExamples({
  dynamicsConnected,
  onCommandLog,
}: ExampleProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Track selected rows
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Array of selected record IDs (GUIDs).
   * Updated via onSelectionChange callback when rows are checked/unchecked.
   */
  const [gridSelection, setGridSelection] = useState<string[]>([]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        Entity Grid
        <Badge appearance="tint" color="warning" size="small">In Development</Badge>
      </h2>
      <p style={{ color: '#666', marginBottom: 12 }}>
        Server-side paging via <code>Prefer: odata.maxpagesize</code> and{' '}
        <code>@odata.nextLink</code>, sorting pushed to the server, and lookups rendered from
        their formatted-value annotations.
        {dynamicsConnected ? '' : ' Requires a Dynamics 365 connection.'}
      </p>

      {dynamicsConnected ? (
        <>
          {/*
            Key EntityGrid props:

            - entityName: Dynamics 365 entity logical name (e.g., "account")
            - title: Header text displayed above the grid
            - height: Fixed height in pixels (enables virtualization)
            - pageSize: Number of records per OData request (odata.maxpagesize)
            - selectable: Enables checkbox selection column
            - columns: Array of column definitions (see columns.ts)

            Callbacks:
            - onRecordOpen: Fired when a row is double-clicked
            - onSelectionChange: Fired when selection changes (returns IDs)
            - onLoadError: Fired if the OData request fails
          */}
          <EntityGrid
            entityName="account"
            title="Accounts"
            height={420}
            pageSize={10}
            selectable
            columns={accountColumns}
            onRecordOpen={(id) => onCommandLog?.(`Open record ${id}`)}
            onSelectionChange={(ids) => setGridSelection(ids)}
            onLoadError={(err) => console.error('[EntityGrid]', err)}
          />

          {/* Display selection count */}
          <p style={{ marginTop: 12, fontSize: 14 }}>
            Selected: <strong>{gridSelection.length}</strong> record(s)
          </p>

          <div style={{ marginTop: 16, padding: 12, background: '#faf9f8', borderRadius: 6 }}>
            <strong>Grid features:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#444' }}>
              <li>
                <strong>Virtualization:</strong> Only visible rows are rendered (TanStack Virtual)
              </li>
              <li>
                <strong>Server paging:</strong> Uses <code>Prefer: odata.maxpagesize</code> header
              </li>
              <li>
                <strong>Continuation:</strong> Follows <code>@odata.nextLink</code> for next page
              </li>
              <li>
                <strong>Sorting:</strong> Click column headers to sort (pushed to server)
              </li>
              <li>
                <strong>Lookups:</strong> Displayed using <code>@OData.Community.Display.V1.FormattedValue</code>
              </li>
            </ul>
          </div>
        </>
      ) : (
        /* Placeholder shown when not connected */
        <div
          style={{
            border: '1px dashed #e1dfdd',
            borderRadius: 8,
            padding: 32,
            textAlign: 'center',
            color: '#888',
          }}
        >
          Connect to Dynamics 365 to load the grid.
        </div>
      )}
      <CodeExample sampleId="entitygrid-entitygrid-example-1" />
    </section>
  );
}

export default EntityGridExamples;
