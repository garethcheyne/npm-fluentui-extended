import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme, Button, Link, Text, Badge, ToggleButton, Tab, TabList, SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import {
  Lookup, LookupOption, QueryBuilder, QueryBuilderApplyResult, QueryBuilderState,
  CommandBar, EntityGrid, DateTimeField, OptionSetField, RecordHoverCard, formatMultiSelectValue,
} from '../src';
import { BuildingRegular, AddRegular, PersonSearchRegular, PlugConnectedRegular, PlugDisconnectedRegular, PersonRegular, CheckmarkCircleRegular, ClockRegular, ArrowLeftRegular, FilterRegular, AppsListRegular, TableRegular, CalendarLtrRegular, ContactCardRegular, EditRegular, DeleteRegular, ArrowClockwiseRegular, ShareRegular, ArrowDownloadRegular, FlashRegular, DocumentRegular } from '@fluentui/react-icons';
import { installDynamicsMock, loginToDynamics, isDynamicsAuthenticated, logoutFromDynamics, getDynamicsUser } from './dynamics-mock';

type HarnessTab = 'lookup' | 'querybuilder' | 'commandbar' | 'entitygrid' | 'fields' | 'hovercard';

/** Static optionset options so the Fields tab demos without a live connection */
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
      { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Active</Badge> },
      { label: 'Type', value: <Badge appearance="tint" color="brand" size="small">Enterprise</Badge> },
      { label: 'Phone', value: '32682915877' },
      { label: 'Mobile', value: '0409072075' },
      { label: 'Server', value: <Badge appearance="outline" size="small">srv_DYN365_NSW</Badge> },
    ],
  },
  {
    key: '2',
    text: '1 DECKS PTY LTD',
    secondaryText: '1DECKSPT777',
    icon: <BuildingRegular />,
    details: [
      { label: 'Status', value: <Badge appearance="tint" color="warning" size="small">Pending Review</Badge> },
      { label: 'Phone', value: '0412345678' },
      { value: <span style={{ color: '#666', fontSize: 11 }}>Last updated: 15/01/2026 10:30 AM</span> },
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
      { label: <Badge appearance="outline" size="small">Contact</Badge>, value: 'John Smith' },
      { label: <Badge appearance="outline" size="small">Email</Badge>, value: <a href="mailto:john@abcholdings.com" style={{ color: '#0078d4' }}>john@abcholdings.com</a> },
      { value: <Badge appearance="filled" color="danger" size="small">VIP Customer</Badge> },
    ],
  },
];

// Details-only options (no secondaryText) - accounts and contacts mixed
const detailsOnlyOptions: LookupOption[] = [
  {
    key: 'do-acc-1',
    text: 'Contoso Ltd',
    icon: <BuildingRegular />,
    details: [
      { label: 'Industry', value: 'Technology' },
      { label: 'Revenue', value: '$50M' },
      { label: 'Employees', value: '250' },
    ],
  },
  {
    key: 'do-con-1',
    text: 'John Smith',
    icon: <PersonRegular />,
    details: [
      { label: 'Title', value: 'CEO' },
      { label: 'Company', value: 'Contoso Ltd' },
      { label: 'Phone', value: '+1 (555) 123-4567' },
    ],
  },
  {
    key: 'do-acc-2',
    text: 'Fabrikam Inc',
    icon: <BuildingRegular />,
    details: [
      { label: 'Industry', value: 'Manufacturing' },
      { label: 'Revenue', value: '$120M' },
      { label: 'Location', value: 'Seattle, WA' },
    ],
  },
  {
    key: 'do-con-2',
    text: 'Sarah Johnson',
    icon: <PersonRegular />,
    details: [
      { label: 'Title', value: 'VP Sales' },
      { label: 'Company', value: 'Fabrikam Inc' },
      { label: 'Email', value: 'sarah.j@fabrikam.com' },
    ],
  },
  {
    key: 'do-acc-3',
    text: 'Adventure Works',
    icon: <BuildingRegular />,
    details: [
      { label: 'Industry', value: 'Retail' },
      { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Active</Badge> },
    ],
  },
  {
    key: 'do-con-3',
    text: 'Michael Chen',
    icon: <PersonRegular />,
    details: [
      { label: 'Title', value: 'CTO' },
      { label: 'Status', value: <Badge appearance="tint" color="warning" size="small">On Leave</Badge> },
    ],
  },
];

// Multi-entity options demonstrating React elements in secondaryText
const multiEntityAccounts: LookupOption[] = [
  {
    key: 'me-acc-1',
    text: 'NEIL WILSON ELECTRICAL CONTRACTOR',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#0078d4', fontWeight: 600 }}>NEW</span>IELCO555
      </span>
    ),
    icon: <BuildingRegular />,
  },
  {
    key: 'me-acc-2',
    text: 'NEW AIM',
    secondaryText: 'ADMIN@NEWAIM.COM.AU',
    icon: <BuildingRegular />,
  },
  {
    key: 'me-acc-3',
    text: 'NEW APOSTOLIC CHURCH',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#0078d4', fontWeight: 600 }}>NEW</span>APOST555
      </span>
    ),
    icon: <BuildingRegular />,
  },
  {
    key: 'me-acc-4',
    text: 'NEW BLACK DESIGNS',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#0078d4', fontWeight: 600 }}>NEW</span>BLACK555
      </span>
    ),
    icon: <BuildingRegular />,
  },
  {
    key: 'me-acc-5',
    text: 'NEW CASTLE CITY COUNCIL',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#0078d4', fontWeight: 600 }}>NEW</span>CCITY888
      </span>
    ),
    icon: <BuildingRegular />,
  },
];

const multiEntityContacts: LookupOption[] = [
  {
    key: 'me-con-1',
    text: 'John Smith',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="tint" color="success" size="small" icon={<CheckmarkCircleRegular />}>Active</Badge>
        <span>john.smith@contoso.com</span>
      </span>
    ),
    icon: <PersonRegular />,
    details: [
      { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Verified</Badge> },
      { label: 'Role', value: <Badge appearance="tint" color="brand" size="small">Decision Maker</Badge> },
      { label: 'Phone', value: '+1 (555) 123-4567' },
      { value: <span style={{ color: '#0078d4' }}>View full profile →</span> },
    ],
  },
  {
    key: 'me-con-2',
    text: 'Sarah Johnson',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="tint" color="informative" size="small" icon={<ClockRegular />}>Pending</Badge>
        <span>sarah.j@adventure-works.com</span>
      </span>
    ),
    icon: <PersonRegular />,
    details: [
      { label: 'Status', value: <Badge appearance="tint" color="warning" size="small">Pending Verification</Badge> },
      { label: 'Company', value: 'Adventure Works' },
    ],
  },
  {
    key: 'me-con-3',
    text: 'Michael Chen',
    secondaryText: 'CEO at Fabrikam Inc',
    icon: <PersonRegular />,
    details: [
      { label: <Badge appearance="outline" size="small">Title</Badge>, value: 'Chief Executive Officer' },
      { label: <Badge appearance="outline" size="small">Dept</Badge>, value: 'Executive' },
    ],
  },
];

const multiEntityRecent: LookupOption[] = [
  {
    key: 'me-rec-1',
    text: 'Contoso Ltd',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="outline" size="small">Account</Badge>
        <span style={{ color: '#666' }}>Viewed 5 min ago</span>
      </span>
    ),
    icon: <BuildingRegular />,
  },
  {
    key: 'me-rec-2',
    text: 'John Smith',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="outline" size="small">Contact</Badge>
        <span style={{ color: '#666' }}>Viewed 1 hour ago</span>
      </span>
    ),
    icon: <PersonRegular />,
  },
  {
    key: 'me-rec-3',
    text: 'Adventure Works',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="outline" size="small">Account</Badge>
        <span style={{ color: '#666' }}>Viewed yesterday</span>
      </span>
    ),
    icon: <BuildingRegular />,
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
            (typeof opt.secondaryText === 'string' && opt.secondaryText.toLowerCase().includes(searchText.toLowerCase()))
        );
        resolve(filtered);
      }
    }, 800); // Simulate network delay
  });
};

function App() {
  const [selectedKey1, setSelectedKey1] = useState<string | null>(null);
  const [selectedKey2, setSelectedKey2] = useState<string | null>(null);
  const [selectedKeyDetailsOnly, setSelectedKeyDetailsOnly] = useState<string | null>(null);

  // Entity filter state for Details Only lookup
  const [showAccounts, setShowAccounts] = useState(true);
  const [showContacts, setShowContacts] = useState(true);

  // Filtered options based on entity toggles - memoized to avoid recalculating on every render
  const filteredDetailsOnlyOptions = React.useMemo(() => 
    detailsOnlyOptions.filter(opt => {
      if (opt.key.startsWith('do-acc-')) return showAccounts;
      if (opt.key.startsWith('do-con-')) return showContacts;
      return true;
    }), [showAccounts, showContacts]
  );

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

  // Multi-entity lookup state
  const [multiEntityFilter, setMultiEntityFilter] = useState<'accounts' | 'contacts' | 'recent'>('accounts');
  const [selectedMultiEntity, setSelectedMultiEntity] = useState<LookupOption | null>(null);

  // Get options based on selected filter
  const multiEntityOptions = React.useMemo(() => {
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

  // Component demos are split across tabs so each one can be screenshotted on its own
  // for the README without the other component's markup bleeding into the capture
  const [activeTab, setActiveTab] = useState<HarnessTab>('lookup');

  // Demo state for the CommandBar / EntityGrid / Fields / HoverCard tabs
  const [commandLog, setCommandLog] = useState<string | null>(null);
  const [gridSelection, setGridSelection] = useState<string[]>([]);
  const [statusValue, setStatusValue] = useState<number | null>(1);
  const [industryValues, setIndustryValues] = useState<number[]>([10, 30]);
  const [dateValues, setDateValues] = useState<Record<'UserLocal' | 'DateOnly' | 'TimeZoneIndependent', string | null>>({
    UserLocal: null,
    DateOnly: null,
    TimeZoneIndependent: null,
  });
  const [liveDateValue, setLiveDateValue] = useState<string | null>(null);
  const onTabSelect = useCallback((_: SelectTabEvent, data: SelectTabData) => {
    setActiveTab(data.value as HarnessTab);
  }, []);

  // The Hover Card tab has no search box of its own, so seed it with real accounts
  // rather than making the live example depend on visiting the Lookup tab first.
  // Must sit below the activeTab declaration - a dependency array is evaluated during
  // render, so reading it any earlier hits the const temporal dead zone.
  useEffect(() => {
    if (activeTab === 'hovercard' && dynamicsConnected && liveAccountOptions.length === 0) {
      handleLiveAccountSearch('');
    }
  }, [activeTab, dynamicsConnected, liveAccountOptions.length, handleLiveAccountSearch]);

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


        <TabList selectedValue={activeTab} onTabSelect={onTabSelect} size="large" style={{ marginBottom: 24 }}>
          <Tab value="lookup" icon={<PersonSearchRegular />}>Lookup</Tab>
          <Tab value="querybuilder" icon={<FilterRegular />}>Query Builder</Tab>
          <Tab value="commandbar" icon={<AppsListRegular />}>Command Bar</Tab>
          <Tab value="entitygrid" icon={<TableRegular />}>Entity Grid</Tab>
          <Tab value="fields" icon={<CalendarLtrRegular />}>Fields</Tab>
          <Tab value="hovercard" icon={<ContactCardRegular />}>Hover Card</Tab>
        </TabList>

        {activeTab === 'lookup' && (
          <>
        {/* Basic Lookup - No Header/Footer */}
        <section style={{ marginBottom: 40 }}>
          <h2>Basic Lookup (No Header/Footer)</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            Simple lookup with expandable option details
          </p>
          <Lookup
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

        {/* Lookup with Details Only (No Secondary Text) */}
        <section style={{ marginBottom: 40 }}>
          <h2>Lookup with Details Only (No Secondary Text)</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            Toggle buttons filter by entity type like native Dynamics 365 - icon centers on single text row
          </p>
          <Lookup
            options={filteredDetailsOnlyOptions}
            selectedKey={selectedKeyDetailsOnly}
            onOptionSelect={(opt) => setSelectedKeyDetailsOnly(opt?.key ?? null)}
            placeholder="Search accounts & contacts..."
            header={
              // When single entity selected, show drill-down view with back button
              showAccounts !== showContacts ? (
                <>
                  <Link
                    as="button"
                    onClick={() => { setShowAccounts(true); setShowContacts(true); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                  >
                    <ArrowLeftRegular fontSize={14} />
                    All
                  </Link>
                  <Text size={300} weight="semibold">{showAccounts ? 'Accounts' : 'Contacts'}</Text>
                </>
              ) : (
                // When all entities shown, display filter toggles
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Text size={200} style={{ color: '#666' }}>Results from:</Text>
                    <ToggleButton
                      appearance="subtle"
                      size="small"
                      checked={showAccounts}
                      onClick={() => { setShowAccounts(true); setShowContacts(false); }}
                    >
                      Accounts
                    </ToggleButton>
                    <ToggleButton
                      appearance="subtle"
                      size="small"
                      checked={showContacts}
                      onClick={() => { setShowAccounts(false); setShowContacts(true); }}
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
          <p style={{ marginTop: 12, fontSize: 14 }}>
            Selected: <strong>{selectedKeyDetailsOnly ? detailsOnlyOptions.find(o => o.key === selectedKeyDetailsOnly)?.text : 'None'}</strong>
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
        {/* Multi-Entity Lookup with React Elements */}
        <section style={{ marginBottom: 40 }}>
          <h2>Multi-Entity Lookup with React Elements</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            Demonstrates: selectable filter tabs in header, React elements in <code>secondaryText</code>, 
            and React elements (Badges) in expandable <code>details</code>.
          </p>
          <Lookup
            options={multiEntityOptions}
            selectedOption={selectedMultiEntity}
            onOptionSelect={setSelectedMultiEntity}
            placeholder="Search records..."
            header={
              <div style={{ display: 'flex', gap: 0 }}>
                <Button
                  appearance={multiEntityFilter === 'accounts' ? 'primary' : 'subtle'}
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setMultiEntityFilter('accounts'); }}
                  style={{ borderRadius: '4px 0 0 4px' }}
                >
                  Accounts
                </Button>
                <Button
                  appearance={multiEntityFilter === 'contacts' ? 'primary' : 'subtle'}
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setMultiEntityFilter('contacts'); }}
                  style={{ borderRadius: 0 }}
                >
                  Contacts
                </Button>
                <Button
                  appearance={multiEntityFilter === 'recent' ? 'primary' : 'subtle'}
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setMultiEntityFilter('recent'); }}
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
          <p style={{ marginTop: 12, fontSize: 14 }}>
            Selected: <strong>{selectedMultiEntity?.text ?? 'None'}</strong>
          </p>
          <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
            Active filter: <code>{multiEntityFilter}</code> — Click tabs in header to switch entity types.
            Expand contacts to see Badges in details.
          </p>
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
                options={liveAccountOptions}
                selectedOption={selectedLiveAccount}
                onOptionSelect={setSelectedLiveAccount}
                onSearchChange={handleLiveAccountSearch}
                onFocus={handleLiveAccountFocus}
                loading={liveAccountLoading}
                // At rest this shows the entity icon and the record name as a link,
                // the way a resolved lookup renders on a Dynamics form
                entityIcon={<BuildingRegular />}
                onRecordClick={(option) => setCommandLog(`Open account ${option.text}`)}
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
          </>
        )}

        {activeTab === 'querybuilder' && (
          <>
        {/* Query Builder */}
        <section style={{ marginBottom: 40 }}>
          <h2>QueryBuilder — Unknown / Invalid Fields</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            When existing FetchXML is loaded and contains attributes that don't match any known field,
            each unmatched condition is preserved and flagged with a warning banner so the user knows
            what needs to be fixed before saving.
          </p>
          <QueryBuilder
            entityName="product"
            entityDisplayName="Products"
            fields={[
              { id: 'name', label: 'Product Name', dataType: 'string' },
              { id: 'productnumber', label: 'Product Number', dataType: 'string' },
              { id: 'statecode', label: 'Status', dataType: 'optionset', options: [
                { label: 'Active', value: 0 },
                { label: 'Inactive', value: 1 },
              ]},
            ]}
            initialFetchXml={`<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">
  <entity name="product">
    <filter type="and">
      <condition attribute="name" operator="like" value="%Widget%" />
      <condition attribute="sample_unknownfield" operator="eq" value="1" />
      <condition attribute="statecode" operator="eq" value="0" />
      <condition attribute="sample_custom_obsolete_flag" operator="eq" value="true" />
    </filter>
  </entity>
</fetch>`}
            showFetchXmlPreview
          />
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2>Query Builder</h2>
          <p style={{ color: '#666', marginBottom: 12 }}>
            {dynamicsConnected
              ? <>Fields loaded from <strong>Dynamics 365</strong> via native <code>fetch()</code> API.</>
              : <>Requires connection to Dynamics 365 to load entity metadata.</>
            }
          </p>

          <div style={{ border: dynamicsConnected ? '1px solid #0078d4' : '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff', width: '100%', position: 'relative', height: '500px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
              debug
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
          </>
        )}

        {activeTab === 'commandbar' && (
          <>
            <section style={{ marginBottom: 40 }}>
              <h2>Command Bar</h2>
              <p style={{ color: '#666', marginBottom: 12 }}>
                Commands that no longer fit collapse into a "More commands" menu rather than being
                clipped. <strong>Narrow the browser window</strong> to watch them move.
              </p>
              <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, background: '#fff' }}>
                <CommandBar
                  items={[
                    { key: 'new', text: 'New', icon: <AddRegular />, appearance: 'primary', onClick: () => setCommandLog('New') },
                    { key: 'edit', text: 'Edit', icon: <EditRegular />, onClick: () => setCommandLog('Edit') },
                    { key: 'delete', text: 'Delete', icon: <DeleteRegular />, onClick: () => setCommandLog('Delete') },
                    { key: 'refresh', text: 'Refresh', icon: <ArrowClockwiseRegular />, dividerBefore: true, onClick: () => setCommandLog('Refresh') },
                    { key: 'assign', text: 'Assign', icon: <PersonRegular />, onClick: () => setCommandLog('Assign') },
                    { key: 'share', text: 'Share', icon: <ShareRegular />, onClick: () => setCommandLog('Share') },
                    {
                      key: 'export', text: 'Export', icon: <ArrowDownloadRegular />,
                      subItems: [
                        { key: 'excel', text: 'Export to Excel', onClick: () => setCommandLog('Export to Excel') },
                        { key: 'csv', text: 'Export to CSV', onClick: () => setCommandLog('Export to CSV') },
                      ],
                    },
                    { key: 'flow', text: 'Flow', icon: <FlashRegular />, onClick: () => setCommandLog('Flow') },
                    { key: 'wordtemplates', text: 'Word Templates', icon: <DocumentRegular />, onClick: () => setCommandLog('Word Templates') },
                  ]}
                  farItems={[
                    { key: 'filter', title: 'Filter', icon: <FilterRegular />, onClick: () => setCommandLog('Filter') },
                  ]}
                />
              </div>
              <p style={{ marginTop: 12, fontSize: 14 }}>
                Last command: <strong>{commandLog ?? 'None'}</strong>
              </p>
            </section>

            <section style={{ marginBottom: 40 }}>
              <h3>Pinned commands and overflow disabled</h3>
              <p style={{ color: '#666', marginBottom: 12 }}>
                A pinned command never collapses. With <code>disableOverflow</code> the bar scrolls
                horizontally instead.
              </p>
              <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, background: '#fff', maxWidth: 420 }}>
                <CommandBar
                  items={[
                    { key: 'save', text: 'Save', icon: <AddRegular />, appearance: 'primary', pinned: true },
                    { key: 'a', text: 'Command A' },
                    { key: 'b', text: 'Command B' },
                    { key: 'c', text: 'Command C' },
                    { key: 'd', text: 'Command D' },
                  ]}
                />
              </div>
            </section>
          </>
        )}

        {activeTab === 'entitygrid' && (
          <section style={{ marginBottom: 40 }}>
            <h2>Entity Grid</h2>
            <p style={{ color: '#666', marginBottom: 12 }}>
              Server-side paging via <code>Prefer: odata.maxpagesize</code> and <code>@odata.nextLink</code>,
              sorting pushed to the server, and lookups rendered from their formatted-value annotations.
              {dynamicsConnected ? '' : ' Requires a Dynamics 365 connection.'}
            </p>
            {dynamicsConnected ? (
              <EntityGrid
                entityName="account"
                title="Accounts"
                height={420}
                pageSize={10}
                selectable
                columns={[
                  { name: 'name', width: 260 },
                  { name: 'accountnumber', width: 160 },
                  { name: 'telephone1', width: 160 },
                  { name: 'primarycontactid', label: 'Primary Contact', width: 200 },
                ]}
                onRecordOpen={(id) => setCommandLog(`Open record ${id}`)}
                onSelectionChange={(ids) => setGridSelection(ids)}
                onLoadError={(err) => console.error('[EntityGrid]', err)}
              />
            ) : (
              <div style={{ border: '1px dashed #e1dfdd', borderRadius: 8, padding: 32, textAlign: 'center', color: '#888' }}>
                Connect to Dynamics 365 to load the grid.
              </div>
            )}
            <p style={{ marginTop: 12, fontSize: 14 }}>
              Selected: <strong>{gridSelection.length}</strong> record(s)
            </p>
          </section>
        )}

        {activeTab === 'fields' && (
          <>
            <section style={{ marginBottom: 40 }}>
              <h2>DateTimeField — DateTimeBehavior</h2>
              <p style={{ color: '#666', marginBottom: 12 }}>
                The same picked date serialized three ways. <strong>DateOnly</strong> and
                <strong> TimeZoneIndependent</strong> never pass through UTC, so they cannot drift a day
                the way <code>toISOString()</code> does in a positive UTC offset.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {(['UserLocal', 'DateOnly', 'TimeZoneIndependent'] as const).map((behavior) => (
                  <div key={behavior} style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
                    <DateTimeField
                      label={behavior}
                      behavior={behavior}
                      showTime={behavior !== 'DateOnly'}
                      value={dateValues[behavior]}
                      onChange={(stored) => setDateValues((current) => ({ ...current, [behavior]: stored }))}
                    />
                    <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
                      {dateValues[behavior] ?? '(empty)'}
                    </pre>
                  </div>
                ))}
              </div>

              {dynamicsConnected && (
                <div style={{ marginTop: 24, border: '1px solid #0078d4', borderRadius: 8, padding: 16, background: '#fff', maxWidth: 420 }}>
                  <h3 style={{ marginTop: 0 }}>Behavior read from live metadata</h3>
                  <p style={{ color: '#666', marginBottom: 12, fontSize: 14 }}>
                    <code>account.createdon</code> — the behavior comes from attribute metadata rather
                    than a prop, so the hint below reflects however your environment configured it.
                  </p>
                  <DateTimeField
                    label="Created On (live)"
                    entityName="account"
                    attributeName="createdon"
                    showTime
                    value={liveDateValue}
                    onChange={(stored) => setLiveDateValue(stored)}
                    onLoadError={(err) => console.error('[DateTimeField]', err)}
                  />
                  <pre style={{ margin: '12px 0 0', fontSize: 12, color: '#666' }}>
                    {liveDateValue ?? '(empty)'}
                  </pre>
                </div>
              )}
            </section>

            <section style={{ marginBottom: 40 }}>
              <h2>OptionSetField</h2>
              <p style={{ color: '#666', marginBottom: 12 }}>
                {dynamicsConnected
                  ? <>Options loaded live from <strong>account</strong> attribute metadata, including
                    the global option set behind <code>industrycode</code>.</>
                  : <>Static options shown — connect to Dynamics 365 to load options from live attribute metadata.</>}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
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

                <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 16, background: '#fff' }}>
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
            </section>
          </>
        )}

        {activeTab === 'hovercard' && (
          <section style={{ marginBottom: 40 }}>
            <h2>Record Hover Card</h2>
            <p style={{ color: '#666', marginBottom: 12 }}>
              Hover a record reference to reveal its details. The fetch waits for the pointer to settle,
              so dragging across a column does not fire a request per row.
            </p>
            <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 24, background: '#fff', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <RecordHoverCard
                record={{
                  title: '007 PROJECTS PTY LTD',
                  subtitle: 'COD007PR777',
                  icon: <BuildingRegular />,
                  details: [
                    { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Active</Badge> },
                    { label: 'Phone', value: '32682915877' },
                    { label: 'Industry', value: 'Construction' },
                    { label: 'Owner', value: 'Gareth Cheyne' },
                  ],
                }}
                actions={<Link as="button" style={{ fontSize: 12 }}>Open record</Link>}
              >
                <Link as="button" style={{ fontSize: 14 }}>007 PROJECTS PTY LTD</Link>
              </RecordHoverCard>

              <RecordHoverCard
                record={{
                  title: 'Jane Smith',
                  subtitle: 'Chief Executive Officer',
                  icon: <PersonRegular />,
                  details: [
                    { label: 'Email', value: 'jane@contoso.com' },
                    { label: 'Phone', value: '0412 345 678' },
                  ],
                }}
              >
                <Link as="button" style={{ fontSize: 14 }}>Jane Smith</Link>
              </RecordHoverCard>

            </div>

            <h3 style={{ marginTop: 32 }}>Live records</h3>
            <p style={{ color: '#666', marginBottom: 12 }}>
              {dynamicsConnected
                ? 'Real accounts, each fetching its own columns on hover. Open the network tab to see that nothing is requested until a pointer settles.'
                : 'Connect to Dynamics 365 to hover real records.'}
            </p>
            <div style={{ border: '1px solid #e1dfdd', borderRadius: 8, padding: 24, background: '#fff', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {dynamicsConnected && liveAccountOptions.length === 0 && (
                <Text size={200} style={{ color: '#888' }}>Loading accounts...</Text>
              )}
              {liveAccountOptions.slice(0, 5).map((account) => (
                <RecordHoverCard
                  key={account.key}
                  entityName="account"
                  recordId={account.key}
                  columns={['accountnumber', 'telephone1', 'primarycontactid', 'industrycode']}
                  actions={<Link as="button" style={{ fontSize: 12 }}>Open record</Link>}
                  onLoadError={(err) => console.error('[RecordHoverCard]', err)}
                >
                  <Link as="button" style={{ fontSize: 14 }}>{account.text}</Link>
                </RecordHoverCard>
              ))}
              {!dynamicsConnected && (
                <Text size={200} style={{ color: '#888' }}>Not connected.</Text>
              )}
            </div>
          </section>
        )}
      </div>
    </FluentProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
