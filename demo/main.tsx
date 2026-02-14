import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme, Button, Link, Text } from '@fluentui/react-components';
import { Lookup, LookupOption, QueryBuilder, QueryBuilderApplyResult, QueryBuilderState } from '../src';
import { BuildingRegular, AddRegular, PersonSearchRegular } from '@fluentui/react-icons';

// Static options for basic demos
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

  const sampleQueryFields = [
    { id: 'name', label: 'Name', dataType: 'string' as const },
    {
      id: 'statecode',
      label: 'State',
      dataType: 'optionset' as const,
      options: [
        { label: 'Active', value: 0 },
        { label: 'Inactive', value: 1 },
      ],
    },
    { id: 'createdon', label: 'Created On', dataType: 'datetime' as const },
    { id: 'revenue', label: 'Revenue', dataType: 'number' as const },
    { id: 'ownerid', label: 'Owner', dataType: 'lookup' as const },
  ];

  const sampleRelatedEntities = [
    { id: 'contact', label: 'Contacts' },
    { id: 'opportunity', label: 'Opportunities' },
    { id: 'activitypointer', label: 'Activities' },
  ];

  // Handle selection - receives full option with all data
  const handleOptionSelect = useCallback((option: LookupOption | null) => {
    setSelectedOption3(option);
    // Access additional data from the option
    if (option?.data) {
      console.log('Selected option data:', option.data);
    }
  }, []);

  // Handle dynamic search
  const handleSearchChange = useCallback(async (searchText: string) => {
    setIsLoading(true);
    try {
      const results = await searchAccountsApi(searchText);
      setDynamicOptions(results);
    } catch (error) {
      console.error('Search failed:', error);
      setDynamicOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial results when dropdown opens
  const handleFocus = useCallback(() => {
    if (dynamicOptions.length === 0) {
      handleSearchChange('');
    }
  }, [dynamicOptions.length, handleSearchChange]);

  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ padding: 40, maxWidth: 800 }}>
        <h1>Lookup Component Demo</h1>

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
            Type to search - results are fetched from a simulated API with 800ms delay
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
            Selected: <strong>{selectedOption3?.text ?? 'None'}</strong>
          </p>
          {selectedOption3?.details && (
            <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
              Details: {selectedOption3.details.map(d => d.value).join(', ')}
            </p>
          )}
          <p style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            Try searching: "contoso", "acme", "fab", "north"
          </p>
        </section>

        {/* Query Builder */}
        <section style={{ marginBottom: 40 }}>
          <h2>Query Builder (New)</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            Standalone Query Builder component from <strong>fluentui-extended</strong> (no modal wrapper).
          </p>

          <div style={{ border: '0px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff', width: '100%' }}>
            <QueryBuilder
              entityName="account"
              entityDisplayName="Accounts"
              fields={sampleQueryFields}
              relatedEntities={sampleRelatedEntities}
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
      </div>
    </FluentProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
