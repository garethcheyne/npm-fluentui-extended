/**
 * Test Harness App Shell
 *
 * This is the main application component for the FluentUI Extended test harness.
 * It provides:
 *
 * 1. **Tab Navigation** - Switch between component example sections
 * 2. **Dynamics 365 Connection** - Login/logout with status indicator
 * 3. **Shared State** - Connection state, live data, and command logging
 *
 * Each tab renders a dedicated example component:
 * - Lookup: Multi-entity search with static and live data
 * - QueryBuilder: FetchXML builder with unknown fields handling
 * - CommandBar: Overflow and pinned commands demo
 * - EntityGrid: Server-paged data grid with selection
 * - Fields: DateTimeField and OptionSetField demos
 * - HoverCard: Static and live record hover cards
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FluentProvider,
  webLightTheme,
  Button,
  Tab,
  TabList,
  type SelectTabData,
  type SelectTabEvent,
} from '@fluentui/react-components';
import {
  PlugConnectedRegular,
  PlugDisconnectedRegular,
  PersonSearchRegular,
  FilterRegular,
  AppsListRegular,
  TableRegular,
  CalendarLtrRegular,
  CheckboxCheckedRegular,
  ContactCardRegular,
  PeopleRegular,
} from '@fluentui/react-icons';

import type { LookupOption } from '../src';
import type { HarnessTab, AccountOption } from './examples/shared/types';
import { useDynamicsConnection } from './examples/shared/useDynamicsConnection';

// Example components
import { LookupExamples } from './examples/Lookup';
import { QueryBuilderExamples } from './examples/QueryBuilder';
import { CommandBarExamples } from './examples/CommandBar';
import { EntityGridExamples } from './examples/EntityGrid';
import { DateTimeFieldExamples } from './examples/DateTimeField';
import { OptionSetFieldExamples } from './examples/OptionSetField';
import { HoverCardExamples } from './examples/HoverCard';
import { PeopleExamples } from './examples/People';
import { searchDynamicsRecords } from './examples/Lookup/dynamicsHelpers';

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

/**
 * Tab definitions with icons for navigation.
 */
const tabs: Array<{ id: HarnessTab; label: string; icon: React.ReactElement }> = [
  { id: 'lookup', label: 'Lookup', icon: <PersonSearchRegular /> },
  { id: 'querybuilder', label: 'QueryBuilder', icon: <FilterRegular /> },
  { id: 'commandbar', label: 'CommandBar', icon: <AppsListRegular /> },
  { id: 'entitygrid', label: 'EntityGrid', icon: <TableRegular /> },
  { id: 'datetimefield', label: 'DateTimeField', icon: <CalendarLtrRegular /> },
  { id: 'optionsetfield', label: 'OptionSetField', icon: <CheckboxCheckedRegular /> },
  { id: 'hovercard', label: 'HoverCard', icon: <ContactCardRegular /> },
  { id: 'people', label: 'People', icon: <PeopleRegular /> },
];

// =============================================================================
// SCREENSHOT MODE DETECTION
// =============================================================================

/**
 * Check URL for screenshot mode: ?screenshot=componentname
 * Returns the component name to render in isolation, or null for normal mode.
 */
function getScreenshotComponent(): HarnessTab | null {
  const params = new URLSearchParams(window.location.search);
  const component = params.get('screenshot');
  if (component && tabs.some((t) => t.id === component)) {
    return component as HarnessTab;
  }
  return null;
}

// =============================================================================
// APP COMPONENT
// =============================================================================

export function App() {
  // ─────────────────────────────────────────────────────────────────────────────
  // SCREENSHOT MODE: Check if we're rendering a single component in isolation
  // ─────────────────────────────────────────────────────────────────────────────

  const screenshotComponent = getScreenshotComponent();

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Tab navigation
  // ─────────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<HarnessTab>(screenshotComponent ?? 'lookup');

  const handleTabSelect = useCallback(
    (_: SelectTabEvent, data: SelectTabData) => {
      setActiveTab(data.value as HarnessTab);
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Dynamics 365 connection
  // ─────────────────────────────────────────────────────────────────────────────

  const { connected, loading, configured, user, login, logout } = useDynamicsConnection();

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Shared data for cross-component communication
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Live account options fetched by Lookup, shared with HoverCard tab.
   */
  const [liveAccountOptions, setLiveAccountOptions] = useState<LookupOption[]>([]);

  const loadLiveAccountOptions = useCallback(async () => {
    try {
      const results = await searchDynamicsRecords(
        'accounts',
        '',
        'name',
        'accountnumber',
        ['telephone1', 'emailaddress1', 'address1_city'],
      );
      setLiveAccountOptions(results);
    } catch (error) {
      console.error('[App] Failed to seed live account options for HoverCard tab', error);
      setLiveAccountOptions([]);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === 'hovercard' && connected && liveAccountOptions.length === 0) {
      void loadLiveAccountOptions();
    }
  }, [activeTab, connected, liveAccountOptions.length, loadLiveAccountOptions]);

  /**
   * Last command/action logged (displayed in header).
   */
  const [commandLog, setCommandLog] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Render the active tab's content.
   * Used by both normal mode and screenshot mode.
   */
  const renderTabContent = (tab: HarnessTab) => {
    switch (tab) {
      case 'lookup':
        return (
          <LookupExamples
            dynamicsConnected={connected}
            dynamicsLoading={loading}
            dynamicsConfigured={configured}
            onLogin={login}
            onCommandLog={setCommandLog}
            liveAccountOptions={liveAccountOptions}
            onLiveAccountOptionsChange={setLiveAccountOptions}
          />
        );
      case 'querybuilder':
        return (
          <QueryBuilderExamples
            dynamicsConnected={connected}
            dynamicsLoading={loading}
            dynamicsConfigured={configured}
            onLogin={login}
            onCommandLog={setCommandLog}
          />
        );
      case 'commandbar':
        return <CommandBarExamples onCommandLog={setCommandLog} />;
      case 'entitygrid':
        return (
          <EntityGridExamples
            dynamicsConnected={connected}
            dynamicsLoading={loading}
            dynamicsConfigured={configured}
            onLogin={login}
            onCommandLog={setCommandLog}
          />
        );
      case 'datetimefield':
        return (
          <DateTimeFieldExamples
            dynamicsConnected={connected}
            dynamicsLoading={loading}
            dynamicsConfigured={configured}
            onLogin={login}
            onCommandLog={setCommandLog}
          />
        );
      case 'optionsetfield':
        return (
          <OptionSetFieldExamples
            dynamicsConnected={connected}
            dynamicsLoading={loading}
            dynamicsConfigured={configured}
            onLogin={login}
            onCommandLog={setCommandLog}
          />
        );
      case 'hovercard':
        return (
          <HoverCardExamples
            dynamicsConnected={connected}
            dynamicsLoading={loading}
            dynamicsConfigured={configured}
            onLogin={login}
            onCommandLog={setCommandLog}
            liveAccounts={liveAccountOptions.map((opt) => ({
              key: opt.key,
              text: opt.text,
            }))}
          />
        );
      case 'people':
        return (
          <PeopleExamples
            dynamicsConnected={connected}
            dynamicsLoading={loading}
            dynamicsConfigured={configured}
            onLogin={login}
            onCommandLog={setCommandLog}
          />
        );
      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Screenshot mode - isolated component only
  // ─────────────────────────────────────────────────────────────────────────────

  if (screenshotComponent) {
    return (
      <FluentProvider theme={webLightTheme}>
        <div
          data-screenshot-target={screenshotComponent}
          style={{ padding: '16px', background: '#fff' }}
        >
          {renderTabContent(screenshotComponent)}
        </div>
      </FluentProvider>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Normal mode with full shell
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {/* ═══════════════════════════════════════════════════════════════════════
            HEADER: Title, connection status, and tab navigation
            ═══════════════════════════════════════════════════════════════════════ */}
        <header style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h1 style={{ margin: 0 }}>FluentUI Extended — Test Harness</h1>

            {/* Connection button/status */}
            {configured ? (
              connected ? (
                <Button
                  appearance="subtle"
                  icon={<PlugConnectedRegular />}
                  onClick={logout}
                  disabled={loading}
                >
                  {user ?? 'Connected'}
                </Button>
              ) : (
                <Button
                  appearance="primary"
                  icon={<PlugDisconnectedRegular />}
                  onClick={login}
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : 'Connect to Dynamics'}
                </Button>
              )
            ) : (
              <span style={{ color: '#888', fontSize: 13 }}>
                Set VITE_DYNAMICS_* env vars to enable live connection
              </span>
            )}
          </div>

          {/* Tab navigation */}
          <TabList selectedValue={activeTab} onTabSelect={handleTabSelect}>
            {tabs.map((tab) => (
              <Tab key={tab.id} value={tab.id} icon={tab.icon}>
                {tab.label}
              </Tab>
            ))}
          </TabList>
        </header>

        {/* Last command display */}
        {commandLog && (
          <div
            style={{
              marginBottom: 16,
              padding: '8px 12px',
              background: '#f3f2f1',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            Last action: <strong>{commandLog}</strong>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB CONTENT: Render active example component
            ═══════════════════════════════════════════════════════════════════════ */}
        {renderTabContent(activeTab)}
      </div>
    </FluentProvider>
  );
}

export default App;
