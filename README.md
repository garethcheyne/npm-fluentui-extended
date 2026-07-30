# FluentUI-Extended

Extended components for Fluent UI v9, designed to match Dynamics 365 patterns.

[![npm version](https://badge.fury.io/js/fluentui-extended.svg)](https://www.npmjs.com/package/fluentui-extended)
[![CI](https://github.com/garethcheyne/npm-fluentui-extended/actions/workflows/ci.yml/badge.svg)](https://github.com/garethcheyne/npm-fluentui-extended/actions)

## Why This Library?

We started with the **Lookup** component because it's one of the most requested components in the Dynamics 365 and Power Platform community. Fluent UI v9 doesn't include a Lookup control out of the box, so we built one that matches the native Dynamics 365 experience.

**Have a component request?** Open an issue on [GitHub](https://github.com/garethcheyne/npm-fluentui-extended/issues) and we'll consider adding it!

This project is **open source** and **free to use**. It is provided as-is, without warranty. Community contributions are welcome—feel free to submit pull requests or suggest improvements!

## Installation

```bash
npm install fluentui-extended @fluentui/react-components @fluentui/react-icons
```

## Components

### Lookup

A searchable dropdown component styled after Dynamics 365 lookup fields. Supports async search, expandable option details, and customizable header/footer.

![Lookup Component](assets/screenshot-lookup.png)

### QueryBuilder

> **🚧 Beta** - This component is in beta. Please report any issues on [GitHub](https://github.com/garethcheyne/npm-fluentui-extended/issues).

An Advanced Find-style query builder for Dynamics 365. Build complex filter conditions with AND/OR logic, serialize to FetchXML or OData, and validate queries against the Dynamics 365 API.

![QueryBuilder Component](assets/screenshot-querybuilder.png)

## Quick Start

```tsx
import { useState } from 'react';
import { Lookup, LookupOption } from 'fluentui-extended';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

const options: LookupOption[] = [
  { key: '1', text: 'Contoso Ltd', secondaryText: 'CON001' },
  { key: '2', text: 'Fabrikam Inc', secondaryText: 'FAB001' },
  { key: '3', text: 'Adventure Works', secondaryText: 'ADV001' },
];

function App() {
  const [selected, setSelected] = useState<LookupOption | null>(null);

  return (
    <FluentProvider theme={webLightTheme}>
      <Lookup
        options={options}
        selectedOption={selected}
        onOptionSelect={setSelected}
        placeholder="Search accounts..."
      />
    </FluentProvider>
  );
}
```

## Features

### Basic Selection (with key)

```tsx
const [selectedKey, setSelectedKey] = useState<string | null>(null);

<Lookup
  options={options}
  selectedKey={selectedKey}
  onOptionSelect={(opt) => setSelectedKey(opt?.key ?? null)}
  placeholder="Search..."
/>
```

### Async Search (API Integration)

For async scenarios, use `selectedOption` to persist the display value when options change:

```tsx
function AsyncLookup() {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchText: string) => {
    setLoading(true);
    const response = await fetch(`/api/accounts?search=${searchText}`);
    setOptions(await response.json());
    setLoading(false);
  };

  return (
    <Lookup
      options={options}
      selectedOption={selected}
      onOptionSelect={setSelected}
      onSearchChange={handleSearch}
      loading={loading}
      searchDebounceMs={300}
      placeholder="Type to search..."
    />
  );
}
```

### With Icons and Expandable Details

Options can include icons and expandable detail rows (click chevron to expand):

```tsx
import { BuildingRegular } from '@fluentui/react-icons';

const options: LookupOption[] = [
  {
    key: '1',
    text: 'Contoso Ltd',
    secondaryText: 'CON001',
    icon: <BuildingRegular />,
    details: [
      { label: 'Phone', value: '555-0100' },
      { label: 'Industry', value: 'Technology' },
      { value: 'Active Customer' },
    ],
    data: { id: 'acc-001', revenue: 5000000 }, // Custom data accessible in onOptionSelect
  },
];
```

### Dynamics 365 Style (Header & Footer)

```tsx
import { Text, Button, Link } from '@fluentui/react-components';
import { AddRegular, PersonSearchRegular } from '@fluentui/react-icons';

<Lookup
  options={options}
  selectedOption={selected}
  onOptionSelect={setSelected}
  header={
    <>
      <Text size={200}>Accounts</Text>
      <Button appearance="outline" size="small">Recent records</Button>
    </>
  }
  footer={
    <>
      <Link style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <AddRegular /> New
      </Link>
      <Link style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PersonSearchRegular /> Advanced
      </Link>
    </>
  }
/>
```

### Multi-Entity Lookup with Filter Buttons

Replicate the native Dynamics 365 lookup pattern where users can filter between entity types:

```tsx
import { Text, Button, Link, ToggleButton } from '@fluentui/react-components';
import { BuildingRegular, PersonRegular, ArrowLeftRegular } from '@fluentui/react-icons';

function MultiEntityLookup() {
  const [showAccounts, setShowAccounts] = useState(true);
  const [showContacts, setShowContacts] = useState(true);

  const options: LookupOption[] = [
    { key: 'acc-1', text: 'Contoso Ltd', icon: <BuildingRegular />, details: [...] },
    { key: 'con-1', text: 'John Smith', icon: <PersonRegular />, details: [...] },
  ];

  // Filter based on key prefix
  const filteredOptions = useMemo(() => 
    options.filter(opt => {
      if (opt.key.startsWith('acc-')) return showAccounts;
      if (opt.key.startsWith('con-')) return showContacts;
      return true;
    }), [showAccounts, showContacts]
  );

  return (
    <Lookup
      options={filteredOptions}
      header={
        // Drill-down view when single entity selected
        showAccounts !== showContacts ? (
          <>
            <Link onClick={() => { setShowAccounts(true); setShowContacts(true); }}>
              <ArrowLeftRegular /> All
            </Link>
            <Text weight="semibold">{showAccounts ? 'Accounts' : 'Contacts'}</Text>
          </>
        ) : (
          // Filter toggles when showing all
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Text size={200}>Results from:</Text>
              <ToggleButton size="small" checked={showAccounts}
                onClick={() => { setShowAccounts(true); setShowContacts(false); }}>
                Accounts
              </ToggleButton>
              <ToggleButton size="small" checked={showContacts}
                onClick={() => { setShowAccounts(false); setShowContacts(true); }}>
                Contacts
              </ToggleButton>
            </div>
            <Button size="small">Recent records</Button>
          </>
        )
      }
    />
  );
}
```

### Rich Secondary Text with React Elements

Both `secondaryText` and `details` support React elements, not just strings:

```tsx
import { Badge } from '@fluentui/react-components';
import { CheckmarkCircleRegular } from '@fluentui/react-icons';

const options: LookupOption[] = [
  {
    key: '1',
    text: 'John Smith',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="tint" color="success" size="small" icon={<CheckmarkCircleRegular />}>
          Active
        </Badge>
        <span>john.smith@contoso.com</span>
      </span>
    ),
    icon: <PersonRegular />,
    details: [
      { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Verified</Badge> },
      { label: 'Role', value: <Badge appearance="tint" color="brand" size="small">Decision Maker</Badge> },
      { value: <span style={{ color: '#0078d4' }}>View full profile →</span> },
    ],
  },
];
```

---

## Test Harness Examples

Run the test harness with `npm run harness` to see all examples in action.

| Example | Description |
|---------|-------------|
| **Basic Lookup** | Simple lookup with expandable details, no header/footer |
| **Header & Footer** | D365-style with "Accounts" header and "New" / "Advanced" footer links |
| **Details Only (No Secondary Text)** | Options with icons + details but no secondary text; demonstrates icon centering on single-line text |
| **Multi-Entity Filter** | Toggle between Accounts/Contacts with drill-down header pattern (← All) |
| **Dynamic Search (Async API)** | Simulated 800ms API delay with loading spinner; auto-loads top 5 on open |
| **Live Dynamics Lookup** | Connects to real D365 environment via Xrm.WebApi (when connected) |
| **QueryBuilder** | Full Advanced Find-style query builder with FetchXML serialization |

## API Reference

### Lookup Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | auto-generated | Unique identifier for the lookup |
| `options` | `LookupOption[]` | `[]` | Options to display in the dropdown |
| `selectedKey` | `string \| null` | - | Selected option key (controlled) |
| `selectedOption` | `LookupOption \| null` | - | Selected option object (recommended for async) |
| `onOptionSelect` | `(option: LookupOption \| null) => void` | - | Selection change callback |
| `onSearchChange` | `(searchText: string) => void` | - | Search text change callback |
| `placeholder` | `string` | `'Search...'` | Input placeholder |
| `loading` | `boolean` | `false` | Show loading spinner |
| `noResultsMessage` | `string` | `'No results found'` | Empty state message |
| `clearable` | `boolean` | `true` | Show clear button |
| `minSearchLength` | `number` | `0` | Min chars before search fires |
| `searchDebounceMs` | `number` | `300` | Search debounce delay (ms) |
| `matchInputWidth` | `boolean` | `true` | Match dropdown width to input width |
| `header` | `ReactNode` | - | Header content |
| `footer` | `ReactNode` | - | Footer content |
| `disabled` | `boolean` | `false` | Disable the lookup |
| `open` | `boolean` | - | Controlled open state for the dropdown |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when dropdown open state changes |

### Cross-Document Support (Dynamics 365 Iframes)

The Lookup component automatically detects when it's rendered inside a cross-document context (e.g., a React tree mounted into a parent window's document from an iframe). It uses `ownerDocument` and `ownerDocument.defaultView` instead of the global `document` and `window` to ensure:

- **Dismiss on click outside** works correctly (mousedown listener on the correct document)
- **Scroll/resize tracking** responds to the correct window's events
- **Dropdown positioning** uses the correct scroll offsets

### Inherited Input Props

The Lookup component extends Fluent UI's `Input` and supports these standard props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appearance` | `'outline' \| 'underline' \| 'filled-darker' \| 'filled-lighter'` | `'outline'` | Visual style of the input |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Size of the input |
| `contentBefore` | `ReactNode` | - | Content before the input text |
| `className` | `string` | - | Additional CSS class |
| `style` | `CSSProperties` | - | Inline styles |

```tsx
// Examples
<Lookup appearance="filled-darker" size="large" ... />
<Lookup appearance="underline" size="small" ... />
```

### LookupOption

```ts
interface LookupOption {
  key: string;                      // Unique identifier (required)
  text: string;                     // Display text (required)
  secondaryText?: ReactNode;        // Secondary line - string, Badge, or JSX
  icon?: ReactNode;                 // Icon component (e.g., <BuildingRegular />)
  details?: LookupOptionDetail[];   // Expandable details (chevron appears)
  data?: unknown;                   // Custom data payload for your app
  disabled?: boolean;               // Disable this option
}

interface LookupOptionDetail {
  label?: ReactNode;  // Optional label (e.g., "Phone:" or a Badge)
  value: ReactNode;   // Detail value - string or JSX element
}
```

> **Note:** Both `secondaryText` and `details` support React elements, not just strings. See [Rich Secondary Text](#rich-secondary-text-with-react-elements) for examples.

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `↓` | Open dropdown / Move to next option |
| `↑` | Move to previous option |
| `Enter` | Select highlighted option |
| `Escape` | Close dropdown |
| `Tab` | Close dropdown and move focus |

---

## QueryBuilder

The QueryBuilder component provides an Advanced Find-style interface for building complex queries against Dynamics 365 entities.

### Basic Usage (Dynamics 365)

In Dynamics 365, fields are automatically loaded from entity metadata - no need to pass them manually:

```tsx
import { QueryBuilder, QueryBuilderApplyResult } from 'fluentui-extended';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

function App() {
  const [fetchXml, setFetchXml] = React.useState<string>('');

  const handleChange = (result: QueryBuilderApplyResult) => {
    setFetchXml(result.fetchXml);
    // Also available: result.odataFilter, result.fetchXmlFilter, result.state
  };

  return (
    <FluentProvider theme={webLightTheme}>
      <QueryBuilder
        entityName="account"
        entityDisplayName="Accounts"
        onSerializedChange={handleChange}
      />
    </FluentProvider>
  );
}
```

### Loading Existing FetchXML

Pass existing FetchXML to pre-populate the query builder:

```tsx
const existingFetchXml = `
  <fetch version="1.0">
    <entity name="account">
      <filter type="and">
        <condition attribute="name" operator="like" value="%Contoso%" />
        <condition attribute="statecode" operator="eq" value="0" />
      </filter>
    </entity>
  </fetch>
`;

<QueryBuilder
  entityName="account"
  initialFetchXml={existingFetchXml}
  onSerializedChange={handleChange}
/>
```

### Getting Values Back

Use `onSerializedChange` to get the query whenever it changes:

```tsx
const handleChange = (result: QueryBuilderApplyResult) => {
  // FetchXML for SDK queries
  console.log(result.fetchXml);
  // <fetch version="1.0"><entity name="account"><filter type="and">...</filter></entity></fetch>

  // OData for Web API  
  console.log(result.odataFilter);
  // name eq 'Contoso' and revenue gt 1000000

  // Just the filter element
  console.log(result.fetchXmlFilter);
  // <filter type="and">...</filter>

  // Current state object (for saving/restoring)
  console.log(result.state);
};
```

### Features

#### Import/Export FetchXML

Users can download the current query as FetchXML or import existing FetchXML:

```tsx
<QueryBuilder
  entityName="account"
  showDownloadFetchXmlButton={true}  // Default: true
  showUploadFetchXmlButton={true}    // Default: true
/>
```

#### Live Preview

Show real-time preview of the generated queries:

```tsx
<QueryBuilder
  entityName="account"
  fields={fields}
  showODataPreview={true}
  showFetchXmlPreview={true}
/>
```

#### Validation with Dynamics 365 API

The Validate button checks query structure and optionally tests against the Dynamics 365 API:

```tsx
<QueryBuilder
  entityName="account"
  fields={fields}
  showValidateButton={true}  // Default: true
/>
```

When running inside Dynamics 365:
- Uses native fetch to `/api/data/v9.2/` endpoints
- Executes a test query with `$top=1&$count=true`
- Shows record count or API error message

When running outside Dynamics 365:
- Shows "API validation unavailable — not running in Dynamics 365 environment"

#### Lookup Fields with Async Search

For lookup-type fields, provide an async search callback:

```tsx
const handleLookupSearch = async (fieldId: string, searchText: string) => {
  const response = await fetch(`/api/${fieldId}?search=${searchText}`);
  const data = await response.json();
  return data.map(item => ({
    key: item.id,
    text: item.name,
    secondaryText: item.code,
  }));
};

<QueryBuilder
  entityName="account"
  fields={fields}
  onLookupSearch={handleLookupSearch}
/>
```

#### Debug Tracing

Enable debug tracing to see what's happening inside the component:

```tsx
<QueryBuilder
  entityName="account"
  fields={fields}
  onTrace={(message, data) => {
    console.debug(
      '%c FluentUI-Extended ',
      'background: #845EF7; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
      message,
      data || ''
    );
  }}
/>
```

This is useful for:
- Debugging related entity field loading
- Tracking optionset metadata fetching
- Understanding when API calls are made
- Troubleshooting field resolution issues

### Standalone Usage (Outside Dynamics 365)

When not running in Dynamics 365, provide fields manually:

```tsx
const fields: QueryBuilderField[] = [
  { id: 'name', label: 'Account Name', dataType: 'string' },
  { id: 'revenue', label: 'Annual Revenue', dataType: 'number' },
  { id: 'statecode', label: 'Status', dataType: 'optionset', options: [
    { label: 'Active', value: 0 },
    { label: 'Inactive', value: 1 },
  ]},
];

<QueryBuilder
  entityName="account"
  fields={fields}
  onSerializedChange={handleChange}
/>
```

### QueryBuilder Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `entityName` | `string` | - | Logical name of the entity (required) |
| `entityDisplayName` | `string` | - | Display name shown in header |
| `fields` | `QueryBuilderField[]` | - | Fields for filtering (auto-loaded via Web API if omitted) |
| `initialFetchXml` | `string` | - | FetchXML to pre-populate the query builder |
| `initialState` | `QueryBuilderState` | - | Initial query state object |
| `onSerializedChange` | `(result: QueryBuilderApplyResult) => void` | - | Called when query changes |
| `onLookupSearch` | `(fieldId: string, searchText: string) => Promise<LookupOption[]>` | - | Lookup field search handler |
| `showODataPreview` | `boolean` | `false` | Show OData filter preview |
| `showFetchXmlPreview` | `boolean` | `false` | Show FetchXML preview |
| `showResetToDefaultButton` | `boolean` | `true` | Show Reset button |
| `showDownloadFetchXmlButton` | `boolean` | `true` | Show Download FetchXML button |
| `showUploadFetchXmlButton` | `boolean` | `true` | Show Import FetchXML button |
| `showValidateButton` | `boolean` | `true` | Show Validate button |
| `showDeleteAllFiltersButton` | `boolean` | `true` | Show Delete All button |
| `onTrace` | `(message: string, data?: any) => void` | - | Debug/trace callback for component behavior |

### QueryBuilderField

```ts
interface QueryBuilderField {
  id: string;           // Logical attribute name
  label: string;        // Display label
  dataType: 'string' | 'number' | 'datetime' | 'boolean' | 'optionset' | 'lookup';
  options?: Array<{ label: string; value: number }>;  // For optionset fields
}
```

### QueryBuilderApplyResult

```ts
interface QueryBuilderApplyResult {
  state: QueryBuilderState;      // Current query state
  fetchXmlFilter: string;        // Just the <filter> element
  fetchXml: string;              // Complete FetchXML document
  odataFilter: string;           // OData $filter value
}
```

### Programmatic API

#### Serialize State

```ts
import { serializeQueryBuilderState } from 'fluentui-extended';

const result = serializeQueryBuilderState(state, fields, 'account');
console.log(result.fetchXml);
console.log(result.odataFilter);
```

#### Parse FetchXML

```ts
import { parseFetchXmlToState } from 'fluentui-extended';

const result = parseFetchXmlToState(fetchXmlString, fields);
if (result.state) {
  // Use result.state to populate QueryBuilder
} else {
  console.error(result.error);
}
```

#### Validate State

```ts
import { validateQueryBuilderState } from 'fluentui-extended';

const result = validateQueryBuilderState(state, fields);
if (!result.isValid) {
  result.errors.forEach(err => {
    console.log(`${err.fieldLabel}: ${err.message}`);
  });
}
```

### Supported Operators

| Data Type | Operators |
|-----------|-----------|
| `string` | Contains, Does Not Contain, Starts With, Ends With, Equals, Not Equals, Is Empty, Has Value |
| `number`, `datetime` | Greater Than, Greater Than Or Equal, Less Than, Less Than Or Equal, Between, Equals, Not Equals, Is Empty, Has Value |
| `optionset`, `lookup`, `boolean` | Equals, Not Equals, Is Empty, Has Value |

---

## Acknowledgments

This library extends [Microsoft's Fluent UI React v9](https://react.fluentui.dev/) components. Thank you to Microsoft and the Fluent UI team for creating and maintaining such an excellent design system.

- [Fluent UI React](https://react.fluentui.dev/)
- [Fluent UI GitHub](https://github.com/microsoft/fluentui)
- [Fluent 2 Design System](https://fluent2.microsoft.design/)

---

## Changelog

> Version format: `YYYY.M.DD` (e.g., `2026.8.30` = August 30, 2026)

### 2026.8.30

- ✨ Added multi-entity filter pattern with drill-down header ("← All" back button) in test harness
- ✨ Added "Details Only (No Secondary Text)" example to test harness
- ✨ Support for React elements in `secondaryText` and `details[].value` (Badges, icons, styled text)
- ♻️ Improved `aria-selected`/`aria-disabled` attribute handling
- 📝 Documentation overhaul with complete API reference and examples

### 2026.6.12

- ✨ Added React 19 support to peerDependencies
- 📝 Updated README with cross-document support documentation

### 2026.2.19

- 🐛 Fixed cross-document dismiss in Dynamics 365 iframes using `ownerDocument`

### 2026.2.17

- 🐛 Removed `requestAnimationFrame` — handler registers immediately
- 🐛 Switched to capture phase for dismiss handler to prevent D365 DOM interference

### 2026.2.15

- ✨ Added controlled `open` and `onOpenChange` props for programmatic dropdown control
- 🐛 Removed `requestAnimationFrame` from dismiss handler

### 2026.2.13

- ♻️ Rebuilt popup from scratch using custom element (Fluent UI Popover had unexpected behavior)

### 2026.2.11

- 🐛 Added `onOpenChange` callback to sync internal state with Popover dismiss events (outside click, Escape, focus loss)

### 2026.2.10

- 🐛 Fixed Lookup not allowing space character in search input

### 2026.2.8

- ✨ **QueryBuilder**: Native API integration for field metadata
- ✨ **QueryBuilder**: Lookup field support with related entity validation

### 2026.2.7

- ♻️ Removed `Xrm` global dependency — now uses native `/api/data/v9.2/` fetch calls

### 2026.2.6

- ♻️ **QueryBuilder**: Refactored to reuse shared components and styles

### 2026.2.5

- ✨ **QueryBuilder**: Initial release (beta) — Advanced Find-style query builder
- ♻️ **Lookup**: Changed from options-only to popup-based rendering

### 2026.2.3

- ✨ Added `id` prop — auto-generated if not provided

### 2026.2.2

- 🐛 Fixed classic JSX transform for React 16 compatibility
- ✨ Added React 16.8+ support

### 2026.2.1

- 🎉 Initial release
- ✨ Lookup component with async search, expandable details, header/footer

## License

MIT
