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

## API Reference

### Lookup Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
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
| `header` | `ReactNode` | - | Header content |
| `footer` | `ReactNode` | - | Footer content |
| `disabled` | `boolean` | `false` | Disable the lookup |

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
  key: string;                    // Unique identifier (required)
  text: string;                   // Display text (required)
  secondaryText?: string;         // Secondary line of text
  icon?: ReactNode;               // Icon component
  details?: LookupOptionDetail[]; // Expandable details (chevron appears)
  data?: unknown;                 // Custom data payload
  disabled?: boolean;             // Disable this option
}

interface LookupOptionDetail {
  label?: string;  // Optional label (e.g., "Phone:")
  value: string;   // Detail value
}
```

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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

This library extends [Microsoft's Fluent UI React v9](https://react.fluentui.dev/) components. Thank you to Microsoft and the Fluent UI team for creating and maintaining such an excellent design system.

- [Fluent UI React](https://react.fluentui.dev/)
- [Fluent UI GitHub](https://github.com/microsoft/fluentui)
- [Fluent 2 Design System](https://fluent2.microsoft.design/)

## License

MIT
