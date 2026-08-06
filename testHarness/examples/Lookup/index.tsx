/**
 * Lookup Component Examples
 *
 * This file demonstrates various configurations of the Lookup component:
 *
 * 1. **Basic Lookup** - Simple dropdown with static options and expandable details
 * 2. **Multi-Select Lookup** - Select multiple items with badge display and max selection
 * 3. **Header & Footer** - Tabs, buttons, and action links like Dynamics 365
 * 4. **Details Only** - Options without secondary text (icon centers)
 * 5. **Dynamic Search** - Async API calls with loading states and debounce
 * 6. **Multi-Entity** - Segmented tabs to switch between entity types
 * 7. **Live Dynamics** - Real data from connected Dynamics 365 instance
 *
 * Each section includes inline comments explaining the props and patterns used.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Badge,
  Button,
  Link,
  Text,
  ToggleButton,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowLeftRegular,
  BuildingRegular,
  PersonSearchRegular,
} from '@fluentui/react-icons';

// Import from the library source (../../../src) — in a real app you'd use:
// import { Lookup } from 'fluentui-extended';
import { Lookup } from '../../../src';
import type { LookupOption } from '../../../src';
import type { LookupExampleProps } from '../shared/types';

// Import mock data and API helpers
import {
  staticOptions,
  detailsOnlyOptions,
  multiEntityAccounts,
  multiEntityContacts,
  multiEntityRecent,
  searchAccountsApi,
} from './mockData';
import {
  searchDynamicsRecordsNative,
  searchDynamicsRecords,
  searchDynamicsContacts,
} from './dynamicsHelpers';

/** Form fields on a Dynamics form are column-width, not page-width. */
const fieldWidth: React.CSSProperties = { maxWidth: 420 };

// =============================================================================
// LOOKUP EXAMPLES COMPONENT
// =============================================================================

/**
 * Main component rendering all Lookup examples.
 *
 * Props from parent:
 * - `dynamicsConnected` - Whether connected to Dynamics 365
 * - `liveAccountOptions` - Shared account data (used by HoverCard tab)
 * - `onLiveAccountOptionsChange` - Callback to update shared account data
 */
export function LookupExamples({
  dynamicsConnected,
  dynamicsLoading,
  dynamicsConfigured,
  onLogin,
  liveAccountOptions,
  onLiveAccountOptionsChange,
  onCommandLog,
}: LookupExampleProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Basic lookups with static options
  // ─────────────────────────────────────────────────────────────────────────────

  // Track selected key for simple lookups (controlled via selectedKey prop)
  const [selectedKey1, setSelectedKey1] = useState<string | null>(null);
  const [selectedKey2, setSelectedKey2] = useState<string | null>(null);
  const [selectedKeyDetailsOnly, setSelectedKeyDetailsOnly] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Multi-select lookup
  // ─────────────────────────────────────────────────────────────────────────────

  // Track selected options for multi-select (array of full option objects)
  const [multiSelectOptions, setMultiSelectOptions] = useState<LookupOption[]>([]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Details-only lookup with entity filtering
  // ─────────────────────────────────────────────────────────────────────────────

  // Toggle filters for mixed account/contact lookup
  const [showAccounts, setShowAccounts] = useState(true);
  const [showContacts, setShowContacts] = useState(true);

  // Memoized filtered options - recalculates only when toggles change
  const filteredDetailsOnlyOptions = useMemo(
    () =>
      detailsOnlyOptions.filter((opt) => {
        if (opt.key.startsWith('do-acc-')) return showAccounts;
        if (opt.key.startsWith('do-con-')) return showContacts;
        return true;
      }),
    [showAccounts, showContacts]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Dynamic search (async API)
  // ─────────────────────────────────────────────────────────────────────────────

  // Store the full option object to preserve display and details after selection
  const [selectedOption3, setSelectedOption3] = useState<LookupOption | null>(null);
  const [dynamicOptions, setDynamicOptions] = useState<LookupOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Multi-entity lookup with segmented tabs
  // ─────────────────────────────────────────────────────────────────────────────

  const [multiEntityFilter, setMultiEntityFilter] = useState<'accounts' | 'contacts' | 'recent'>('accounts');
  const [selectedMultiEntity, setSelectedMultiEntity] = useState<LookupOption | null>(null);

  // Switch options based on selected entity filter
  const multiEntityOptions = useMemo(() => {
    switch (multiEntityFilter) {
      case 'accounts':
        return multiEntityAccounts;
      case 'contacts':
        return multiEntityContacts;
      case 'recent':
        return multiEntityRecent;
      default:
        return multiEntityAccounts;
    }
  }, [multiEntityFilter]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Live Dynamics lookups
  // ─────────────────────────────────────────────────────────────────────────────

  const [liveAccountLoading, setLiveAccountLoading] = useState(false);
  const [selectedLiveAccount, setSelectedLiveAccount] = useState<LookupOption | null>(null);

  const [liveContactOptions, setLiveContactOptions] = useState<LookupOption[]>([]);
  const [liveContactLoading, setLiveContactLoading] = useState(false);
  const [selectedLiveContact, setSelectedLiveContact] = useState<LookupOption | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS: Dynamic search
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handle selection from dynamic lookup.
   * Uses useCallback to prevent unnecessary re-renders.
   */
  const handleOptionSelect = useCallback((option: LookupOption | null) => {
    setSelectedOption3(option);
  }, []);

  // Hover-card demo. Only tag options with an entity when the keys are real record
  // GUIDs: the offline mock uses keys like "acc-001", and asking Dynamics for
  // accounts(acc-001) fails with "')' or ',' expected at position 4".
  const [hoverCardSelection, setHoverCardSelection] = useState<LookupOption | null>(null);
  const hoverCardOptions = useMemo(
    () =>
      dynamicsConnected
        ? liveAccountOptions.map((option) => ({ ...option, entityName: 'account' }))
        : dynamicOptions,
    [dynamicOptions, dynamicsConnected, liveAccountOptions],
  );

  /**
   * Handle search text changes in dynamic lookup.
   * - When connected to Dynamics, uses native fetch API
   * - When disconnected, falls back to mock searchAccountsApi
   */
  const handleSearchChange = useCallback(
    async (searchText: string) => {
      setIsLoading(true);
      try {
        let results: LookupOption[];
        if (dynamicsConnected) {
          // Use live Dynamics API
          results = await searchDynamicsRecordsNative(
            'accounts',
            searchText,
            'name',
            'accountnumber',
            ['telephone1', 'address1_city'],
            searchText ? 25 : 5 // Fewer results for initial load
          );
        } else {
          // Fall back to mock data with simulated delay
          results = await searchAccountsApi(searchText);
        }
        setDynamicOptions(results);
      } catch (error) {
        console.error('Search failed:', error);
        setDynamicOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [dynamicsConnected]
  );

  /**
   * Load initial results when dropdown first opens.
   * Only triggers if no options are loaded yet.
   */
  const handleFocus = useCallback(() => {
    if (dynamicOptions.length === 0) {
      handleSearchChange('');
    }
  }, [dynamicOptions.length, handleSearchChange]);

  // Load initial results when component mounts or connection changes
  useEffect(() => {
    handleSearchChange('');
  }, [dynamicsConnected, handleSearchChange]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS: Live Dynamics account search
  // ─────────────────────────────────────────────────────────────────────────────

  const handleLiveAccountSearch = useCallback(async (searchText: string) => {
    setLiveAccountLoading(true);
    try {
      const results = await searchDynamicsRecords(
        'accounts',
        searchText,
        'name',
        'accountnumber',
        ['telephone1', 'emailaddress1', 'address1_city']
      );
      // Update both local state and shared state (for HoverCard tab)
      onLiveAccountOptionsChange(results);
    } catch (error) {
      console.error('Live account search failed:', error);
      onLiveAccountOptionsChange([]);
    } finally {
      setLiveAccountLoading(false);
    }
  }, [onLiveAccountOptionsChange]);

  const handleLiveAccountFocus = useCallback(() => {
    if (dynamicsConnected && liveAccountOptions.length === 0) {
      handleLiveAccountSearch('');
    }
  }, [dynamicsConnected, liveAccountOptions.length, handleLiveAccountSearch]);

  useEffect(() => {
    if (dynamicsConnected && liveAccountOptions.length === 0) {
      void handleLiveAccountSearch('');
    }
  }, [dynamicsConnected, liveAccountOptions.length, handleLiveAccountSearch]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS: Live Dynamics contact search
  // ─────────────────────────────────────────────────────────────────────────────

  const handleLiveContactSearch = useCallback(async (searchText: string) => {
    setLiveContactLoading(true);
    try {
      const results = await searchDynamicsContacts(searchText);
      setLiveContactOptions(results);
    } catch (error) {
      console.error('Live contact search failed:', error);
      setLiveContactOptions([]);
    } finally {
      setLiveContactLoading(false);
    }
  }, []);

  const handleLiveContactFocus = useCallback(() => {
    if (dynamicsConnected && liveContactOptions.length === 0) {
      handleLiveContactSearch('');
    }
  }, [dynamicsConnected, liveContactOptions.length, handleLiveContactSearch]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 1: Basic Lookup (No Header/Footer)
          Shows the simplest configuration with static options.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Basic Lookup (No Header/Footer)</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Simple lookup with expandable option details. Click the chevron on each
          option to reveal additional information.
        </p>

        {/*
          Minimal props:
          - options: Array of LookupOption
          - selectedKey: Currently selected option's key (controlled)
          - onOptionSelect: Callback when selection changes
          - placeholder: Input placeholder text
        */}
        <div style={fieldWidth}>
  <Lookup
            options={staticOptions}
            selectedKey={selectedKey1}
            onOptionSelect={(opt) => setSelectedKey1(opt?.key ?? null)}
            placeholder="Search accounts..."
          />
        </div>

        <p style={{ marginTop: 12, fontSize: 14 }}>
          Selected: <strong>{selectedKey1 ? staticOptions.find((o) => o.key === selectedKey1)?.text : 'None'}</strong>
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 2: Multi-Select Lookup
          Demonstrates selecting multiple options with badges and max selection limit.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Multi-Select Lookup</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Select multiple items displayed as pale blue badges with dismiss buttons.
          Maximum selection is limited to 3 items in this example.
        </p>

        {/*
          Multi-select props:
          - multiSelect: Enables multi-selection mode
          - maxSelection: Maximum number of items that can be selected
          - selectedOptions: Array of currently selected option objects
          - onOptionsSelect: Callback when selection changes (receives full array)
        */}
        <div style={fieldWidth}>
  <Lookup
            options={staticOptions}
            multiSelect
            maxSelection={3}
            selectedOptions={multiSelectOptions}
            onOptionsSelect={setMultiSelectOptions}
            placeholder="Search and select accounts..."
            clearable
          />
        </div>

        <p style={{ marginTop: 12, fontSize: 14 }}>
          Selected ({multiSelectOptions.length}/3):{' '}
          <strong>
            {multiSelectOptions.length > 0
              ? multiSelectOptions.map((o) => o.text).join(', ')
              : 'None'}
          </strong>
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 3: Lookup with Header & Footer
          Demonstrates tabs, buttons, and action links like Dynamics 365.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Lookup with Header &amp; Footer</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Includes tab header and action footer like Dynamics 365 lookup dialogs.
        </p>

        <div style={fieldWidth}>
  <Lookup
            options={staticOptions}
            selectedKey={selectedKey2}
            onOptionSelect={(opt) => setSelectedKey2(opt?.key ?? null)}
            placeholder="Search accounts..."
            // Header renders above the option list
            header={
              <>
                <Text size={200}>Accounts</Text>
                <Button appearance="outline" size="small">Recent records</Button>
              </>
            }
            // Footer renders below the option list
            footer={
              <>
                <Link as="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <AddRegular fontSize={14} />
                  New
                </Link>
                <Link as="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <PersonSearchRegular fontSize={14} />
                  Advanced
                </Link>
              </>
            }
          />
        </div>

        <p style={{ marginTop: 12, fontSize: 14 }}>
          Selected: <strong>{selectedKey2 ? staticOptions.find((o) => o.key === selectedKey2)?.text : 'None'}</strong>
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 4: Lookup with Details Only (No Secondary Text)
          When secondaryText is omitted, the icon centers vertically.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Lookup with Details Only (No Secondary Text)</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Toggle buttons filter by entity type like native Dynamics 365 - icon centers on single text row.
        </p>

        <div style={fieldWidth}>
  <Lookup
            options={filteredDetailsOnlyOptions}
            selectedKey={selectedKeyDetailsOnly}
            onOptionSelect={(opt) => setSelectedKeyDetailsOnly(opt?.key ?? null)}
            placeholder="Search accounts & contacts..."
            header={
              // Conditional header: show "Back" link when filtered, toggles when not
              showAccounts !== showContacts ? (
                // Single entity selected - show drill-down view with back button
                <>
                  <Link
                    as="button"
                    onClick={() => {
                      setShowAccounts(true);
                      setShowContacts(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                  >
                    <ArrowLeftRegular fontSize={14} />
                    All
                  </Link>
                  <Text size={300} weight="semibold">
                    {showAccounts ? 'Accounts' : 'Contacts'}
                  </Text>
                </>
              ) : (
                // All entities shown - display filter toggles
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Text size={200} style={{ color: '#666' }}>Results from:</Text>
                    <ToggleButton
                      appearance="subtle"
                      size="small"
                      checked={showAccounts}
                      onClick={() => {
                        setShowAccounts(true);
                        setShowContacts(false);
                      }}
                    >
                      Accounts
                    </ToggleButton>
                    <ToggleButton
                      appearance="subtle"
                      size="small"
                      checked={showContacts}
                      onClick={() => {
                        setShowAccounts(false);
                        setShowContacts(true);
                      }}
                    >
                      Contacts
                    </ToggleButton>
                  </div>
                  <Button appearance="subtle" size="small">Recent records</Button>
                </>
              )
            }
            footer={
              <>
                <Link as="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <AddRegular fontSize={14} />
                  New
                </Link>
                <Link as="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <PersonSearchRegular fontSize={14} />
                  Advanced
                </Link>
              </>
            }
          />
        </div>

        <p style={{ marginTop: 12, fontSize: 14 }}>
          Selected: <strong>{selectedKeyDetailsOnly ? detailsOnlyOptions.find((o) => o.key === selectedKeyDetailsOnly)?.text : 'None'}</strong>
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 5: Dynamic Search (Async API)
          Demonstrates loading states, debounce, and async data fetching.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Dynamic Search (Async API)</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          {dynamicsConnected ? (
            <>Searching <strong>live Dynamics 365</strong> accounts via native <code>fetch()</code> API</>
          ) : (
            <>Using simulated API with 800ms delay. <strong>Connect to Dynamics</strong> for live data.</>
          )}
        </p>

        <div style={fieldWidth}>
  <Lookup
            options={dynamicOptions}
            // Use selectedOption instead of selectedKey to preserve the full option
            // object (including details) after selection
            selectedOption={selectedOption3}
            onOptionSelect={handleOptionSelect}
            // Async search props:
            onSearchChange={handleSearchChange} // Called when search text changes
            onFocus={handleFocus}               // Called when input gains focus
            loading={isLoading}                 // Shows spinner when true
            placeholder="Type to search accounts..."
            minSearchLength={0}                 // Start searching immediately
            searchDebounceMs={300}              // Debounce search by 300ms
            noResultsMessage="No accounts found"
            header={
              <>
                <Text size={200}>Accounts</Text>
                {dynamicsConnected && <Badge appearance="filled" color="success" size="small">Live</Badge>}
              </>
            }
            footer={
              <>
                <Link as="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <AddRegular fontSize={14} />
                  New
                </Link>
                <Link as="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <PersonSearchRegular fontSize={14} />
                  Advanced
                </Link>
              </>
            }
          />
        </div>

        <p style={{ marginTop: 12, fontSize: 14 }}>
          Selected: <strong>{selectedOption3?.text ?? 'None'}</strong>
        </p>

        {/* Show details of selected option if available */}
        {selectedOption3?.details && selectedOption3.details.length > 0 && (
          <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
            {selectedOption3.details.map((d) => (d.label ? `${d.label}: ${d.value}` : d.value)).join(' | ')}
          </p>
        )}

        {!dynamicsConnected && (
          <p style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            Try searching: "contoso", "acme", "fab", "north"
          </p>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 6: Multi-Entity Lookup with React Elements
          Demonstrates segmented tabs and rich content in options.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Multi-Entity Lookup with React Elements</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Demonstrates: selectable filter tabs in header, React elements in <code>secondaryText</code>,
          and React elements (Badges) in expandable <code>details</code>.
        </p>

        <div style={fieldWidth}>
  <Lookup
            options={multiEntityOptions}
            selectedOption={selectedMultiEntity}
            onOptionSelect={setSelectedMultiEntity}
            placeholder="Search records..."
            header={
              // Segmented button group to switch entity types
              <div style={{ display: 'flex', gap: 0 }}>
                <Button
                  appearance={multiEntityFilter === 'accounts' ? 'primary' : 'subtle'}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent dropdown from closing
                    setMultiEntityFilter('accounts');
                  }}
                  style={{ borderRadius: '4px 0 0 4px' }}
                >
                  Accounts
                </Button>
                <Button
                  appearance={multiEntityFilter === 'contacts' ? 'primary' : 'subtle'}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMultiEntityFilter('contacts');
                  }}
                  style={{ borderRadius: 0 }}
                >
                  Contacts
                </Button>
                <Button
                  appearance={multiEntityFilter === 'recent' ? 'primary' : 'subtle'}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMultiEntityFilter('recent');
                  }}
                  style={{ borderRadius: '0 4px 4px 0' }}
                >
                  Recent
                </Button>
              </div>
            }
            footer={
              <>
                <Link as="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <AddRegular fontSize={14} />
                  New Record
                </Link>
                <Link as="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <PersonSearchRegular fontSize={14} />
                  Advanced
                </Link>
              </>
            }
          />
        </div>

        <p style={{ marginTop: 12, fontSize: 14 }}>
          Selected: <strong>{selectedMultiEntity?.text ?? 'None'}</strong>
        </p>
        <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
          Active filter: <code>{multiEntityFilter}</code> — Click tabs in header to switch entity types.
          Expand contacts to see Badges in details.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE 7: Dynamics 365 Live Data (when connected)
          Shows real data from the connected Dynamics instance.
          ═══════════════════════════════════════════════════════════════════════ */}
      {dynamicsConnected && (
        <section style={{ marginBottom: 40 }}>
          <h2>Dynamics 365 Live Data</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            Connected to your Dynamics 365 instance. Components below use live data via <code>Xrm.WebApi</code>.
          </p>

          {/* Live Account Lookup */}
          <div style={{ marginBottom: 32 }}>
            <h3>Live Account Lookup</h3>
            <p style={{ color: '#666', marginBottom: 12 }}>
              Searches real accounts from Dynamics 365 using <code>Xrm.WebApi.retrieveMultipleRecords</code>.
            </p>

            <div style={fieldWidth}>
  <Lookup
                options={liveAccountOptions}
                selectedOption={selectedLiveAccount}
                onOptionSelect={setSelectedLiveAccount}
                onSearchChange={handleLiveAccountSearch}
                onFocus={handleLiveAccountFocus}
                loading={liveAccountLoading}
                // At rest this shows the entity icon and the record name as a link,
                // the way a resolved lookup renders on a Dynamics form
                entityIcon={<BuildingRegular />}
                onRecordClick={(option) => onCommandLog?.(`Open account ${option.text}`)}
                placeholder="Search accounts in Dynamics..."
                minSearchLength={0}
                searchDebounceMs={300}
                noResultsMessage="No accounts found"
                header={
                  <>
                    <Text size={200}>Accounts (Live)</Text>
                    <Badge appearance="filled" color="success" size="small">Live</Badge>
                  </>
                }
                footer={
                  <>
                    <Link as="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <AddRegular fontSize={14} />
                      New Account
                    </Link>
                    <Link as="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <PersonSearchRegular fontSize={14} />
                      Advanced Find
                    </Link>
                  </>
                }
              />
            </div>

            <p style={{ marginTop: 12, fontSize: 14 }}>
              Selected: <strong>{selectedLiveAccount?.text ?? 'None'}</strong>
            </p>
            {selectedLiveAccount?.details && selectedLiveAccount.details.length > 0 && (
              <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                {selectedLiveAccount.details.map((d) => `${d.label}: ${d.value}`).join(' | ')}
              </p>
            )}
          </div>

          {/* Live Contact Lookup */}
          <div style={{ marginBottom: 32 }}>
            <h3>Live Contact Lookup</h3>
            <p style={{ color: '#666', marginBottom: 12 }}>
              Searches real contacts from Dynamics 365.
            </p>

            <div style={fieldWidth}>
  <Lookup
                options={liveContactOptions}
                selectedOption={selectedLiveContact}
                onOptionSelect={setSelectedLiveContact}
                onSearchChange={handleLiveContactSearch}
                onFocus={handleLiveContactFocus}
                loading={liveContactLoading}
                placeholder="Search contacts in Dynamics..."
                minSearchLength={0}
                searchDebounceMs={300}
                noResultsMessage="No contacts found"
                header={
                  <>
                    <Text size={200}>Contacts (Live)</Text>
                    <Badge appearance="filled" color="success" size="small">Live</Badge>
                  </>
                }
              />
            </div>

            <p style={{ marginTop: 12, fontSize: 14 }}>
              Selected: <strong>{selectedLiveContact?.text ?? 'None'}</strong>
            </p>
            {selectedLiveContact?.details && selectedLiveContact.details.length > 0 && (
              <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                {selectedLiveContact.details.map((d) => `${d.label}: ${d.value}`).join(' | ')}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          EXAMPLE: Hover cards
          Any Lookup can reveal a record card on hover intent — in the list, on the
          resolved badge, or both. Two flavours: fetched from the Web API by column,
          and built by hand.
          ═══════════════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 40 }}>
        <h2>Hover Cards</h2>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Hover a result (or the resolved badge) and pause. Nothing is requested until the
          pointer settles, so moving across the list fires no traffic at all.
        </p>

        <h3>Fetched from the Web API</h3>
        <p style={{ color: '#666', marginBottom: 12 }}>
          Each option carries <code>entityName</code>; <code>hoverCardColumns</code> says what to
          fetch, and labels come from attribute metadata.{' '}
          {dynamicsConnected ? 'Live accounts below.' : 'Connect to Dynamics to load real columns.'}
        </p>
        <div style={fieldWidth}>
          <Lookup
            options={hoverCardOptions}
            selectedOption={hoverCardSelection}
            onOptionSelect={setHoverCardSelection}
            onSearchChange={dynamicsConnected ? handleLiveAccountSearch : handleSearchChange}
            onFocus={dynamicsConnected ? handleLiveAccountFocus : handleFocus}
            loading={dynamicsConnected ? liveAccountLoading : isLoading}
            placeholder="Search accounts..."
            entityIcon={<BuildingRegular />}
            // Fetching a record needs a real GUID, so this variant is live-only
            showHoverCard={dynamicsConnected}
            hoverCardColumns={['accountnumber', 'telephone1', 'address1_city']}
            hoverCardActions={
              <Link onClick={() => onCommandLog?.('Open record from hover card')}>Open record</Link>
            }
          />
        </div>

        <h3 style={{ marginTop: 24 }}>Custom card body</h3>
        <p style={{ color: '#666', marginBottom: 12 }}>
          <code>renderHoverCard</code> takes over the content entirely — return <code>null</code> to
          suppress the card for a given option. This one is list-only.
        </p>
        <div style={fieldWidth}>
          <Lookup
            options={staticOptions}
            placeholder="Search accounts..."
            showHoverCard
            hoverCardTarget="list"
            renderHoverCard={(option) => (
              <div style={{ minWidth: 200 }}>
                <Text weight="semibold" style={{ display: 'block' }}>
                  {option.text}
                </Text>
                <Text size={200} style={{ color: '#666' }}>
                  {option.secondaryText ?? 'No account number'}
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Badge appearance="tint" color="brand" size="small">
                    Custom card
                  </Badge>
                </div>
              </div>
            )}
          />
        </div>
      </section>
    </>
  );
}

export default LookupExamples;
