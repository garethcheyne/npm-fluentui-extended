import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme, Button, Link, Text, Badge } from '@fluentui/react-components';
import { Lookup, LookupOption, QueryBuilder, QueryBuilderApplyResult, QueryBuilderState } from '../src';
import { BuildingRegular, AddRegular, PersonSearchRegular, PlugConnectedRegular, PlugDisconnectedRegular, PersonRegular } from '@fluentui/react-icons';
import { installDynamicsMock, loginToDynamics, isDynamicsAuthenticated, logoutFromDynamics, getDynamicsUser } from './dynamics-mock';

// Helper to search Dynamics records via native API (fetch)
const searchDynamicsRecordsNative = async (
  entitySetName: string,
  searchText: string,
  nameField: string = 'name',
  secondaryField?: string,
  detailFields?: string[],
  top: number = 25
): Promise<LookupOption[]> => {
  try {
    // Build select fields
    const selectFields = [nameField];
    if (secondaryField) selectFields.push(secondaryField);
    if (detailFields) selectFields.push(...detailFields);
    const select = `$select=${selectFields.join(',')}`;

    // Build filter
    let filter = '';
    if (searchText) {
      filter = `&$filter=contains(${nameField},'${searchText.replace(/'/g, "''")}')`;
    }

    const queryOptions = `${select}${filter}&$top=${top}`;
    const response = await fetch(`/api/data/v9.2/${entitySetName}?${queryOptions}`, {
      headers: {
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Dynamics Native] Search failed:', response.status);
      return [];
    }

    const data = await response.json();
    const entities = data.value || [];

    return entities.map((record: any) => ({
      key: record[`${entitySetName.replace(/s$/, '')}id`] || record.id,
      text: record[nameField] || 'Unnamed',
      secondaryText: secondaryField ? record[secondaryField] : undefined,
      icon: <BuildingRegular />,
      details: detailFields?.map(field => ({
        label: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
        value: record[field] || '-'
      })).filter(d => d.value !== '-'),
      data: record, // Pass full record for additional use
    }));
  } catch (error) {
    console.error('[Dynamics Native] Search failed:', error);
    return [];
  }
};

// Helper to search Dynamics records via Xrm.WebApi
const searchDynamicsRecords = async (
  entitySetName: string,
  searchText: string,
  nameField: string = 'name',
  secondaryField?: string,
  detailFields?: string[]
): Promise<LookupOption[]> => {
  const Xrm = (window as any).Xrm;
  if (!Xrm?.WebApi?.retrieveMultipleRecords) {
    return [];
  }

  try {
    // Build select fields
    const selectFields = [nameField];
    if (secondaryField) selectFields.push(secondaryField);
    if (detailFields) selectFields.push(...detailFields);
    const select = `$select=${selectFields.join(',')}`;

    // Build filter
    let filter = '';
    if (searchText) {
      filter = `&$filter=contains(${nameField},'${searchText.replace(/'/g, "''")}')`;
    }

    const options = `?${select}${filter}&$top=25`;
    const response = await Xrm.WebApi.retrieveMultipleRecords(entitySetName, options);

    return (response.entities || []).map((record: any) => ({
      key: record[`${entitySetName.replace(/s$/, '')}id`] || record.id,
      text: record[nameField] || 'Unnamed',
      secondaryText: secondaryField ? record[secondaryField] : undefined,
      icon: <BuildingRegular />,
      details: detailFields?.map(field => ({
        label: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
        value: record[field] || '-'
      })).filter(d => d.value !== '-'),
      data: record, // Pass full record for additional use
    }));
  } catch (error) {
    console.error('[Dynamics] Search failed:', error);
    return [];
  }
};

// Helper to search contacts
const searchDynamicsContacts = async (searchText: string): Promise<LookupOption[]> => {
  const Xrm = (window as any).Xrm;
  if (!Xrm?.WebApi?.retrieveMultipleRecords) {
    return [];
  }

  try {
    let filter = '';
    if (searchText) {
      filter = `&$filter=contains(fullname,'${searchText.replace(/'/g, "''")}')`;
    }

    const options = `?$select=fullname,emailaddress1,telephone1,jobtitle${filter}&$top=25`;
    const response = await Xrm.WebApi.retrieveMultipleRecords('contacts', options);

    return (response.entities || []).map((record: any) => ({
      key: record.contactid,
      text: record.fullname || 'Unnamed',
      secondaryText: record.jobtitle,
      icon: <PersonRegular />,
      details: [
        record.emailaddress1 && { label: 'Email', value: record.emailaddress1 },
        record.telephone1 && { label: 'Phone', value: record.telephone1 },
      ].filter(Boolean) as Array<{ label: string; value: string }>,
      data: record,
    }));
  } catch (error) {
    console.error('[Dynamics] Contact search failed:', error);
    return [];
  }
};

// Static options for basic test scenarios
const staticOptions: LookupOption[] = [
  {
    key: '1',
    text: '007 PROJECTS PTY LTD',
    secondaryText: 'COD007PR777',
    icon: <BuildingRegular />,
    details: [
      { value: '0409072075' },
      { label: 'Phone', value: '32682915877' },
      { value: 'Yes' },
      { value: '29/01/2026 2:48 PM' },
      { label: 'Server', value: 'srv_DYN365_NSW' },
    ],
  },
  {
    key: '2',
    text: '1 DECKS PTY LTD',
    secondaryText: '1DECKSPT777',
    icon: <BuildingRegular />,
    details: [
      { label: 'Phone', value: '0412345678' },
      { value: '15/01/2026 10:30 AM' },
    ],
  },
  {
    key: '3',
    text: '1:TYM CONSTRUCTIONS PTY LTD',
    secondaryText: 'CODTYM46777',
    icon: <BuildingRegular />,
  },
  {
    key: '4',
    text: 'ABC HOLDINGS',
    secondaryText: 'ABCHOLD001',
    icon: <BuildingRegular />,
    details: [
      { label: 'Contact', value: 'John Smith' },
      { label: 'Email', value: 'john@abcholdings.com' },
    ],
  },
];

// Simulated API database for dynamic search
const mockDatabase: LookupOption[] = [
  { key: 'acc-001', text: 'Acme Corporation', secondaryText: 'ACME001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Manufacturing' }, { label: 'Revenue', value: '$5.2M' }] },
  { key: 'acc-002', text: 'Acme Industries', secondaryText: 'ACME002', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Industrial' }] },
  { key: 'acc-003', text: 'Adventure Works', secondaryText: 'ADV001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Retail' }, { label: 'Employees', value: '250' }] },
  { key: 'acc-004', text: 'Alpine Ski House', secondaryText: 'ALP001', icon: <BuildingRegular /> },
  { key: 'acc-005', text: 'Blue Yonder Airlines', secondaryText: 'BYA001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Aviation' }] },
  { key: 'acc-006', text: 'Contoso Ltd', secondaryText: 'CON001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Technology' }, { label: 'Revenue', value: '$12.8M' }] },
  { key: 'acc-007', text: 'Contoso Pharmaceuticals', secondaryText: 'CON002', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Healthcare' }] },
  { key: 'acc-008', text: 'Fabrikam Inc', secondaryText: 'FAB001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Manufacturing' }, { label: 'Employees', value: '1200' }] },
  { key: 'acc-009', text: 'Fourth Coffee', secondaryText: 'FC001', icon: <BuildingRegular /> },
  { key: 'acc-010', text: 'Litware Inc', secondaryText: 'LIT001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Software' }] },
  { key: 'acc-011', text: 'Northwind Traders', secondaryText: 'NWT001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Import/Export' }, { label: 'Revenue', value: '$3.1M' }] },
  { key: 'acc-012', text: 'Proseware Inc', secondaryText: 'PRO001', icon: <BuildingRegular /> },
  { key: 'acc-013', text: 'Tailspin Toys', secondaryText: 'TST001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Retail' }] },
  { key: 'acc-014', text: 'Trey Research', secondaryText: 'TRY001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Research' }, { label: 'Employees', value: '85' }] },
  { key: 'acc-015', text: 'Wide World Importers', secondaryText: 'WWI001', icon: <BuildingRegular />, details: [{ label: 'Industry', value: 'Import/Export' }] },
];

// Simulated API call with delay
const searchAccountsApi = (searchText: string): Promise<LookupOption[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!searchText) {
        resolve(mockDatabase.slice(0, 5)); // Return first 5 as "recent" when no search
      } else {
        const filtered = mockDatabase.filter(
          (opt) =>
            opt.text.toLowerCase().includes(searchText.toLowerCase()) ||
            opt.secondaryText?.toLowerCase().includes(searchText.toLowerCase())
        );
        resolve(filtered);
      }
    }, 800); // Simulate network delay
  });
};

function App() {
  const [selectedKey1, setSelectedKey1] = useState<string | null>(null);
  const [selectedKey2, setSelectedKey2] = useState<string | null>(null);

  // Dynamic search state - store full option to persist display and access data
  const [selectedOption3, setSelectedOption3] = useState<LookupOption | null>(null);
  const [dynamicOptions, setDynamicOptions] = useState<LookupOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queryBuilderState, setQueryBuilderState] = useState<QueryBuilderState | null>(null);
  const [queryBuilderResult, setQueryBuilderResult] = useState<QueryBuilderApplyResult | null>(null);

  // Dynamics 365 connection state
  const [dynamicsConfigured, setDynamicsConfigured] = useState(false);
  const [dynamicsConnected, setDynamicsConnected] = useState(false);
  const [dynamicsUser, setDynamicsUser] = useState<string | null>(null);
  const [dynamicsLoading, setDynamicsLoading] = useState(true);
  const [liveQueryBuilderKey, setLiveQueryBuilderKey] = useState(0);

  // Live Dynamics Lookup state
  const [liveAccountOptions, setLiveAccountOptions] = useState<LookupOption[]>([]);
  const [liveAccountLoading, setLiveAccountLoading] = useState(false);
  const [selectedLiveAccount, setSelectedLiveAccount] = useState<LookupOption | null>(null);

  const [liveContactOptions, setLiveContactOptions] = useState<LookupOption[]>([]);
  const [liveContactLoading, setLiveContactLoading] = useState(false);
  const [selectedLiveContact, setSelectedLiveContact] = useState<LookupOption | null>(null);

  // Initialize Dynamics mock on mount
  useEffect(() => {
    const init = async () => {
      setDynamicsLoading(true);
      try {
        const { isConfigured, isAuthenticated } = await installDynamicsMock();
        setDynamicsConfigured(isConfigured);
        setDynamicsConnected(isAuthenticated);
        if (isAuthenticated) {
          const user = getDynamicsUser();
          setDynamicsUser(user?.username || user?.name || null);
        }
      } finally {
        setDynamicsLoading(false);
      }
    };
    init();
  }, []);

  const handleDynamicsLogin = async () => {
    setDynamicsLoading(true);
    try {
      const success = await loginToDynamics();
      setDynamicsConnected(success);
      if (success) {
        const user = getDynamicsUser();
        setDynamicsUser(user?.username || user?.name || null);
        // Force QueryBuilder remount to reload fields
        setLiveQueryBuilderKey((k) => k + 1);
      }
    } finally {
      setDynamicsLoading(false);
    }
  };

  const handleDynamicsLogout = async () => {
    await logoutFromDynamics();
    setDynamicsConnected(false);
    setDynamicsUser(null);
  };

  // Handle selection - receives full option with all data
  const handleOptionSelect = useCallback((option: LookupOption | null) => {
    setSelectedOption3(option);
    // Access additional data from the option
    if (option?.data) {
      console.log('Selected option data:', option.data);
    }
  }, []);

  // Handle dynamic search - uses native API when connected, mock otherwise
  const handleSearchChange = useCallback(async (searchText: string) => {
    setIsLoading(true);
    try {
      let results: LookupOption[];
      if (dynamicsConnected) {
        // Use top=5 for empty search (initial load), top=25 for actual search
        results = await searchDynamicsRecordsNative(
          'accounts',
          searchText,
          'name',
          'accountnumber',
          ['telephone1', 'address1_city'],
          searchText ? 25 : 5
          ['telephone1', 'address1_city']
        );
      } else {
        // Use mock data when not connected
        results = await searchAccountsApi(searchText);
      }
      setDynamicOptions(results);
    } catch (error) {
      console.error('Search failed:', error);
      setDynamicOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [dynamicsConnected]);

  // Load initial results when dropdown opens
  const handleFocus = useCallback(() => {
    if (dynamicOptions.length === 0) {
      handleSearchChange('');
    }
  }, [dynamicOptions.length, handleSearchChange]);

  // Load top 5 results on mount or when connection state changes
  useEffect(() => {
    handleSearchChange('');
  }, [dynamicsConnected, handleSearchChange]);

  // Live Dynamics account search
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
      setLiveAccountOptions(results);
    } catch (error) {
      console.error('Live account search failed:', error);
      setLiveAccountOptions([]);
    } finally {
      setLiveAccountLoading(false);
    }
  }, []);

  const handleLiveAccountFocus = useCallback(() => {
    if (dynamicsConnected && liveAccountOptions.length === 0) {
      handleLiveAccountSearch('');
    }
  }, [dynamicsConnected, liveAccountOptions.length, handleLiveAccountSearch]);

  // Live Dynamics contact search
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

  const containerStyle: React.CSSProperties = {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  };

  const connectionStatusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <FluentProvider theme={webLightTheme}>
      <div style={containerStyle}>
        {/* Header with connection status */}
        <div style={headerStyle}>
          <h1 style={{ margin: 0 }}>FluentUI Extended Test Harness</h1>

          <div style={connectionStatusStyle}>
            {dynamicsLoading ? (
              <Text size={200}>Connecting...</Text>
            ) : !dynamicsConfigured ? (
              <Badge appearance="tint" color="warning" icon={<PlugDisconnectedRegular />}>
                Not Configured
              </Badge>
            ) : dynamicsConnected ? (
              <>
                <Badge appearance="filled" color="success" icon={<PlugConnectedRegular />}>
                  Connected
                </Badge>
                <Button appearance="subtle" size="small" onClick={handleDynamicsLogout}>
                  Disconnect
                </Button>
              </>
            ) : (
              <>
                <Badge appearance="tint" color="severe" icon={<PlugDisconnectedRegular />}>
                  Disconnected
                </Badge>
                <Button appearance="primary" size="small" onClick={handleDynamicsLogin}>
                  Connect
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Basic Lookup - No Header/Footer */}
        <section style={{ marginBottom: 40 }}>
          <h2>Basic Lookup (No Header/Footer)</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            Simple lookup with expandable option details
          </p>
          <Lookup
            appearance="filled-darker"
            options={staticOptions}
            selectedKey={selectedKey1}
            onOptionSelect={(opt) => setSelectedKey1(opt?.key ?? null)}
            placeholder="Search accounts..."
          />
          <p style={{ marginTop: 12, fontSize: 14 }}>
            Selected: <strong>{selectedKey1 ? staticOptions.find(o => o.key === selectedKey1)?.text : 'None'}</strong>
          </p>
        </section>

        {/* Lookup with Header and Footer */}
        <section style={{ marginBottom: 40 }}>
          <h2>Lookup with Header & Footer</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            Includes tab header and action footer like Dynamics 365
          </p>
          <Lookup
            appearance="filled-darker"
            options={staticOptions}
            selectedKey={selectedKey2}
            onOptionSelect={(opt) => setSelectedKey2(opt?.key ?? null)}
            placeholder="Search accounts..."
            header={
              <>
                <Text size={200}>Accounts</Text>
                <Button appearance="outline" size="small">Recent records</Button>
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
          <p style={{ marginTop: 12, fontSize: 14 }}>
            Selected: <strong>{selectedKey2 ? staticOptions.find(o => o.key === selectedKey2)?.text : 'None'}</strong>
          </p>
        </section>

        {/* Dynamic Search Lookup */}
        <section style={{ marginBottom: 40 }}>
          <h2>Dynamic Search (Async API)</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            {dynamicsConnected
              ? <>Searching <strong>live Dynamics 365</strong> accounts via native <code>fetch()</code> API</>
              : <>Using simulated API with 800ms delay. <strong>Connect to Dynamics</strong> for live data.</>
            }
          </p>
          <Lookup
            appearance="filled-darker"
            options={dynamicOptions}
            selectedOption={selectedOption3}
            onOptionSelect={handleOptionSelect}
            onSearchChange={handleSearchChange}
            onFocus={handleFocus}
            loading={isLoading}
            placeholder="Type to search accounts..."
            minSearchLength={0}
            searchDebounceMs={300}
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
          <p style={{ marginTop: 12, fontSize: 14 }}>
            Selected: <strong>{selectedOption3?.text ?? 'None'}</strong>
          </p>
          {selectedOption3?.details && selectedOption3.details.length > 0 && (
            <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
              {selectedOption3.details.map(d => d.label ? `${d.label}: ${d.value}` : d.value).join(' | ')}
            </p>
          )}
          {!dynamicsConnected && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              Try searching: "contoso", "acme", "fab", "north"
            </p>
          )}
        </section>

        {/* Query Builder */}
        <section style={{ marginBottom: 40 }}>
          <h2>Query Builder</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            {dynamicsConnected
              ? <>Fields loaded from <strong>Dynamics 365</strong> via native <code>fetch()</code> API.</>
              : <>Requires connection to Dynamics 365 to load entity metadata.</>
            }
          </p>

          <div style={{ border: dynamicsConnected ? '1px solid #0078d4' : '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff', width: '100%', position: 'relative', minHeight: '400px' }}>
            {!dynamicsConnected && (
              <div style={{
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
              }}>
                <PlugDisconnectedRegular style={{ fontSize: '48px', color: '#999' }} />
                <Text size={500} weight="semibold">Connect to Dynamics 365</Text>
                <Text size={300} style={{ color: '#666', textAlign: 'center', maxWidth: '400px' }}>
                  QueryBuilder requires a live connection to load entity metadata, fields, and relationships.
                </Text>
                <Button appearance="primary" onClick={handleDynamicsLogin} disabled={!dynamicsConfigured || dynamicsLoading}>
                  {dynamicsLoading ? 'Connecting...' : 'Connect Now'}
                </Button>
                {!dynamicsConfigured && (
                  <Text size={200} style={{ color: '#999' }}>
                    Configure environment variables to enable connection
                  </Text>
                )}
              </div>
            )}
            <QueryBuilder
              key={`live-${liveQueryBuilderKey}`}
              entityName="account"
              entityDisplayName="Accounts"
              showODataPreview
              showFetchXmlPreview
              showDataSourceToggle
              onStateChange={(state) => setQueryBuilderState(state)}
              onSerializedChange={(result) => setQueryBuilderResult(result)}
            />
          </div>

          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <div style={{ border: '1px solid #e1dfdd', borderRadius: 6, padding: 12, background: '#faf9f8' }}>
              <Text weight="semibold">Live State</Text>
              <pre style={{ margin: '8px 0 0', fontSize: 12, overflowX: 'auto' }}>
                {JSON.stringify(queryBuilderState, null, 2)}
              </pre>
            </div>

            <div style={{ border: '1px solid #e1dfdd', borderRadius: 6, padding: 12, background: '#faf9f8' }}>
              <Text weight="semibold">Serialized Output</Text>
              <pre style={{ margin: '8px 0 0', fontSize: 12, overflowX: 'auto' }}>
                {JSON.stringify(queryBuilderResult, null, 2)}
              </pre>
            </div>
          </div>
        </section>

        {/* Dynamics 365 Live Connection */}
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
              <Lookup
                appearance="filled-darker"
                options={liveAccountOptions}
                selectedOption={selectedLiveAccount}
                onOptionSelect={setSelectedLiveAccount}
                onSearchChange={handleLiveAccountSearch}
                onFocus={handleLiveAccountFocus}
                loading={liveAccountLoading}
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
              <p style={{ marginTop: 12, fontSize: 14 }}>
                Selected: <strong>{selectedLiveAccount?.text ?? 'None'}</strong>
              </p>
              {selectedLiveAccount?.details && selectedLiveAccount.details.length > 0 && (
                <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                  {selectedLiveAccount.details.map(d => `${d.label}: ${d.value}`).join(' | ')}
                </p>
              )}
            </div>

            {/* Live Contact Lookup */}
            <div style={{ marginBottom: 32 }}>
              <h3>Live Contact Lookup</h3>
              <p style={{ color: '#666', marginBottom: 12 }}>
                Searches real contacts from Dynamics 365.
              </p>
              <Lookup
                appearance="filled-darker"
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
              <p style={{ marginTop: 12, fontSize: 14 }}>
                Selected: <strong>{selectedLiveContact?.text ?? 'None'}</strong>
              </p>
              {selectedLiveContact?.details && selectedLiveContact.details.length > 0 && (
                <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                  {selectedLiveContact.details.map(d => `${d.label}: ${d.value}`).join(' | ')}
                </p>
              )}
            </div>

          </section>
        )}
      </div>
    </FluentProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
