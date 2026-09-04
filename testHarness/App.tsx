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
  makeStyles,
  tokens,
  type SelectTabData,
  type SelectTabEvent,
} from '@fluentui/react-components';
import {
  PlugConnectedRegular,
  PlugDisconnectedRegular,
  PersonSearchRegular,
  FilterRegular,
  AppsListRegular,
  BorderOutsideRegular,
  SquareRegular,
  WindowRegular,
  LayerRegular,
  BookRegular,
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
import { FluentShellExamples } from './examples/FluentShell';
import { FluentContainerExamples } from './examples/FluentContainer';
import { ParentPortalExample } from './examples/ParentPortal';
import { D365TestHarnessExamples } from './examples/D365TestHarness';
import { DocsExamples } from './examples/Docs';
import { D365TestHarness } from '../src/components/D365TestHarness';
import { FluentShell } from '../src/components/FluentShell';
import { FluentContainer } from '../src/components/FluentContainer';
import { CodeExample } from './examples/shared/CodeExample';
import { PAGE_LEVEL_SAMPLES } from './examples/shared/codeSamples';
import { ComponentGuidanceBlock } from './examples/shared/ComponentGuidance';
import { searchDynamicsRecords } from './examples/Lookup/dynamicsHelpers';

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

/**
 * Normalises how example pages present.
 *
 * The example files were written over time with plain `<h2>`/`<h3>` elements,
 * which render at browser defaults — oversized and with margins that fight the
 * card they now sit in. Styling them from the page container fixes every page at
 * once, and keeps the example files free of presentation concerns.
 *
 * Only typography is touched. Inline styles in those files (a `#666` paragraph,
 * a 40px section gap) still win, and overriding them would need `!important`
 * everywhere — not worth it for spacing that already reads well.
 */
const usePageStyles = makeStyles({
  page: {
    '& h2': {
      marginTop: '0px',
      marginBottom: tokens.spacingVerticalXS,
      fontSize: tokens.fontSizeBase500,
      fontWeight: tokens.fontWeightSemibold,
      lineHeight: tokens.lineHeightBase500,
      color: tokens.colorNeutralForeground1,
    },
    '& h3': {
      marginTop: tokens.spacingVerticalM,
      marginBottom: tokens.spacingVerticalXS,
      fontSize: tokens.fontSizeBase400,
      fontWeight: tokens.fontWeightSemibold,
      lineHeight: tokens.lineHeightBase400,
      color: tokens.colorNeutralForeground1,
    },
    '& h4': {
      marginTop: tokens.spacingVerticalS,
      marginBottom: tokens.spacingVerticalXS,
      fontSize: tokens.fontSizeBase300,
      fontWeight: tokens.fontWeightSemibold,
      color: tokens.colorNeutralForeground2,
    },
  },
});

interface HarnessEntry {
  id: HarnessTab;
  label: string;
  icon: React.ReactElement;
}

/**
 * The sitemap, grouped the way a model-driven app groups its own.
 *
 * Grouped by *what you are building* rather than alphabetically, because that is
 * the question someone arrives with: a form field, a list of records, something
 * about a person, or the frame the whole web resource sits in. Documentation
 * leads, ungrouped, where a model-driven app puts Home.
 */
const NAV_GROUPS: Array<{ label?: string; items: HarnessEntry[] }> = [
  {
    items: [{ id: 'docs', label: 'Documentation', icon: <BookRegular /> }],
  },
  {
    label: 'Form fields',
    items: [
      { id: 'lookup', label: 'Lookup', icon: <PersonSearchRegular /> },
      { id: 'optionsetfield', label: 'OptionSetField', icon: <CheckboxCheckedRegular /> },
      { id: 'datetimefield', label: 'DateTimeField', icon: <CalendarLtrRegular /> },
    ],
  },
  {
    label: 'Records & queries',
    items: [
      { id: 'entitygrid', label: 'EntityGrid', icon: <TableRegular /> },
      { id: 'querybuilder', label: 'QueryBuilder', icon: <FilterRegular /> },
      { id: 'hovercard', label: 'RecordHoverCard', icon: <ContactCardRegular /> },
    ],
  },
  {
    label: 'People',
    items: [{ id: 'people', label: 'Personas & owners', icon: <PeopleRegular /> }],
  },
  {
    label: 'Commands',
    items: [{ id: 'commandbar', label: 'CommandBar', icon: <AppsListRegular /> }],
  },
  {
    label: 'Web resource layout',
    items: [
      { id: 'fluentshell', label: 'FluentShell', icon: <BorderOutsideRegular /> },
      { id: 'fluentcontainer', label: 'FluentContainer', icon: <SquareRegular /> },
      { id: 'parentportal', label: 'ParentPortal', icon: <WindowRegular /> },
      { id: 'harness', label: 'D365TestHarness', icon: <LayerRegular /> },
    ],
  },
];

/** Flattened, for looking an entry up by id. */
const tabs: HarnessEntry[] = NAV_GROUPS.flatMap((group) => group.items);

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
  const pageStyles = usePageStyles();

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
      case 'fluentshell':
        return <FluentShellExamples />;
      case 'fluentcontainer':
        return <FluentContainerExamples />;
      case 'parentportal':
        return <ParentPortalExample />;
      case 'harness':
        return <D365TestHarnessExamples />;
      case 'docs':
        return <DocsExamples />;
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

  // The harness is the page: every example renders inside the simulated form, at
  // the width and against the furniture a real web resource gets. The example
  // list becomes the sitemap, which is where a model-driven app puts navigation.
  const activeMeta = tabs.find((tab) => tab.id === activeTab);

  const navGroups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.map((entry) => ({
      label: entry.label,
      icon: entry.icon,
      selected: entry.id === activeTab,
      onClick: () => setActiveTab(entry.id),
    })),
  }));

  const connection = configured ? (
    connected ? (
      <Button
        appearance="subtle"
        size="small"
        icon={<PlugConnectedRegular />}
        onClick={logout}
        disabled={loading}
      >
        {user ?? 'Connected'}
      </Button>
    ) : (
      <Button
        appearance="primary"
        size="small"
        icon={<PlugDisconnectedRegular />}
        onClick={login}
        disabled={loading}
      >
        {loading ? 'Connecting...' : 'Connect to Dynamics'}
      </Button>
    )
  ) : (
    <span>Set VITE_DYNAMICS_* env vars to enable a live connection</span>
  );

  return (
    <FluentProvider theme={webLightTheme}>
      <D365TestHarness
        active
        orgName="FLUENTUI EXTENDED"
        appName="Component Harness"
        recordName={activeMeta?.label ?? 'Component'}
        entityName="Component example"
        saved={false}
        tabs={['Examples']}
        commands={[]}
        status={[connected ? 'Connected' : 'Offline', 'Dynamics']}
        navGroups={navGroups}
        notification={
          <>
            {connection}
            {commandLog && (
              <span style={{ marginLeft: 'auto' }}>
                Last action: <strong>{commandLog}</strong>
              </span>
            )}
          </>
        }
      >
        {/*
          One card per page, the way a form section holds a control. The shell
          owns the gutter and the scrolling; the container owns the surface. The
          shell scrolls rather than the container so card shadows painted into
          the gutter are not shaved by a scroll box sitting on their edge.
        */}
        <FluentShell overflow="scroll">
          <FluentContainer as="section" className={pageStyles.page} style={{ gap: 12 }}>
            {/* Which component to reach for comes before how to use it. */}
            <ComponentGuidanceBlock componentId={activeTab} />
            {renderTabContent(activeTab)}
            {/*
              Only for pages built as one block. Pages made of sections carry a
              panel per section instead, inserted by `npm run gen:samples`.
            */}
            {PAGE_LEVEL_SAMPLES.includes(activeTab) && <CodeExample sampleId={activeTab} />}
          </FluentContainer>
        </FluentShell>
      </D365TestHarness>
    </FluentProvider>
  );
}

export default App;
