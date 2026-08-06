/**
 * QueryBuilder Component Examples
 *
 * This file demonstrates various configurations of the QueryBuilder component:
 *
 * 1. **Unknown Fields Demo** - Shows warning banners for unmatched FetchXML attributes
 * 2. **Live Dynamics Builder** - Real entity metadata loaded from Dynamics 365
 *
 * QueryBuilder integrates with Dynamics 365 to provide:
 * - Entity metadata resolution (fields, types, relationships)
 * - FetchXML generation and parsing
 * - OData query generation
 * - Visual condition/group editing
 */

import React, { useState } from 'react';
import { Button, Text } from '@fluentui/react-components';
import { PlugDisconnectedRegular } from '@fluentui/react-icons';

// Import from the library source (../../../src) — in a real app you'd use:
// import { QueryBuilder } from 'fluentui-extended';
import { QueryBuilder } from '../../../src';
import type { QueryBuilderApplyResult, QueryBuilderState } from '../../../src';
import type { ExampleProps } from '../shared/types';

// =============================================================================
// STATIC FIELD DEFINITIONS
// =============================================================================

/**
 * Sample field definitions for the "Unknown Fields" demo.
 *
 * These represent a simplified Product entity schema. When the initialFetchXml
 * references attributes not in this list, the QueryBuilder displays warning
 * banners to alert the user.
 */
const productFields = [
  { id: 'name', label: 'Product Name', dataType: 'string' as const },
  { id: 'productnumber', label: 'Product Number', dataType: 'string' as const },
  {
    id: 'statecode',
    label: 'Status',
    dataType: 'optionset' as const,
    options: [
      { label: 'Active', value: 0 },
      { label: 'Inactive', value: 1 },
    ],
  },
];

/**
 * Sample FetchXML containing unknown/obsolete field references.
 *
 * - `name` and `statecode` exist in productFields (valid)
 * - `sample_unknownfield` and `sample_custom_obsolete_flag` do NOT exist (flagged)
 *
 * This demonstrates how QueryBuilder preserves unknown conditions while
 * warning the user that they need attention.
 */
const sampleFetchXmlWithUnknowns = `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">
  <entity name="product">
    <filter type="and">
      <condition attribute="name" operator="like" value="%Widget%" />
      <condition attribute="sample_unknownfield" operator="eq" value="1" />
      <condition attribute="statecode" operator="eq" value="0" />
      <condition attribute="sample_custom_obsolete_flag" operator="eq" value="true" />
    </filter>
  </entity>
</fetch>`;

// =============================================================================
// QUERYBUILDER EXAMPLES COMPONENT
// =============================================================================

/**
 * Main component rendering all QueryBuilder examples.
 *
 * @param props.dynamicsConnected - Whether connected to Dynamics 365
 * @param props.dynamicsLoading - Whether connection is in progress
 * @param props.dynamicsConfigured - Whether env vars are configured
 * @param props.onLogin - Callback to trigger Dynamics login
 */
export function QueryBuilderExamples({
  dynamicsConnected,
  dynamicsLoading,
  dynamicsConfigured,
  onLogin,
}: ExampleProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Live QueryBuilder outputs
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * QueryBuilder emits two types of output:
   * - `state`: The internal working state (conditions, groups, UI state)
   * - `result`: The serialized output (FetchXML, OData, selected columns)
   */
  const [queryBuilderState, setQueryBuilderState] = useState<QueryBuilderState | null>(null);
  const [queryBuilderResult, setQueryBuilderResult] = useState<QueryBuilderApplyResult | null>(null);

  /**
   * Key to force remount of the live QueryBuilder.
   * Incremented when connection status changes to reload metadata.
   */
  const [liveQueryBuilderKey, setLiveQueryBuilderKey] = useState(0);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 1: QueryBuilder — Unknown / Invalid Fields
          Shows how the component handles FetchXML with unrecognized attributes.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>QueryBuilder — Unknown / Invalid Fields</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          When existing FetchXML is loaded and contains attributes that don't match any known field,
          each unmatched condition is preserved and flagged with a warning banner so the user knows
          what needs to be fixed before saving.
        </p>

        {/*
          Key props for static field definitions:
          - entityName: Logical name of the entity
          - entityDisplayName: User-friendly display name
          - fields: Array of field definitions (id, label, dataType, options)
          - initialFetchXml: Pre-populated query to parse
          - showFetchXmlPreview: Displays live FetchXML output
        */}
        <QueryBuilder
          entityName="product"
          entityDisplayName="Products"
          fields={productFields}
          initialFetchXml={sampleFetchXmlWithUnknowns}
          showFetchXmlPreview
        />

        <p style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
          <strong>Note:</strong> The yellow warning banners indicate conditions referencing
          <code> sample_unknownfield</code> and <code>sample_custom_obsolete_flag</code> — 
          fields that don't exist in the provided schema. The component preserves these
          conditions but warns the user they need attention.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 2: Live QueryBuilder (Dynamics 365)
          Loads real entity metadata when connected to Dynamics.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Query Builder</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          {dynamicsConnected ? (
            <>
              Fields loaded from <strong>Dynamics 365</strong> via native <code>fetch()</code> API.
            </>
          ) : (
            <>Requires connection to Dynamics 365 to load entity metadata.</>
          )}
        </p>

        {/*
          Container with overlay for disconnected state.
          The QueryBuilder is always rendered but covered with a blur overlay
          when not connected, prompting the user to connect.
        */}
        <div
          style={{
            border: dynamicsConnected ? '1px solid #0078d4' : '1px solid #e1dfdd',
            borderRadius: 8,
            padding: 16,
            background: '#fff',
            width: '100%',
            position: 'relative',
            height: '500px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Overlay shown when disconnected */}
          {!dynamicsConnected && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                borderRadius: 8,
                zIndex: 10,
              }}
            >
              <PlugDisconnectedRegular style={{ fontSize: '48px', color: '#999' }} />
              <Text size={500} weight="semibold">
                Connect to Dynamics 365
              </Text>
              <Text size={300} style={{ color: '#666', textAlign: 'center', maxWidth: '400px' }}>
                QueryBuilder requires a live connection to load entity metadata, fields, and
                relationships.
              </Text>
              <Button
                appearance="primary"
                onClick={onLogin}
                disabled={!dynamicsConfigured || dynamicsLoading}
              >
                {dynamicsLoading ? 'Connecting...' : 'Connect Now'}
              </Button>
              {!dynamicsConfigured && (
                <Text size={200} style={{ color: '#999' }}>
                  Configure environment variables to enable connection
                </Text>
              )}
            </div>
          )}

          {/*
            Live QueryBuilder with full feature set:
            - entityName: Target entity (loads metadata automatically)
            - showODataPreview: Displays generated OData query
            - showFetchXmlPreview: Displays generated FetchXML
            - showDataSourceToggle: UI to switch between FetchXML/OData
            - debug: Enables console logging for troubleshooting
            - onStateChange: Receives internal state updates
            - onSerializedChange: Receives serialized query outputs
          */}
          <QueryBuilder
            key={`live-${liveQueryBuilderKey}`}
            entityName="account"
            entityDisplayName="Accounts"
            showODataPreview
            showFetchXmlPreview
            showDataSourceToggle
            debug
            onStateChange={setQueryBuilderState}
            onSerializedChange={setQueryBuilderResult}
          />
        </div>

        {/* Debug output panels showing live state */}
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <div
            style={{
              border: '1px solid #e1dfdd',
              borderRadius: 6,
              padding: 12,
              background: '#faf9f8',
            }}
          >
            <Text weight="semibold">Live State</Text>
            <pre style={{ margin: '8px 0 0', fontSize: 12, overflowX: 'auto' }}>
              {JSON.stringify(queryBuilderState, null, 2)}
            </pre>
          </div>

          <div
            style={{
              border: '1px solid #e1dfdd',
              borderRadius: 6,
              padding: 12,
              background: '#faf9f8',
            }}
          >
            <Text weight="semibold">Serialized Output</Text>
            <pre style={{ margin: '8px 0 0', fontSize: 12, overflowX: 'auto' }}>
              {JSON.stringify(queryBuilderResult, null, 2)}
            </pre>
          </div>
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
          <strong>State Panel:</strong> Shows the internal working state including conditions,
          groups, and UI state.
          <br />
          <strong>Serialized Output:</strong> Shows the generated FetchXML/OData query ready for
          use in API calls.
        </p>
      </section>
    </>
  );
}

export default QueryBuilderExamples;
