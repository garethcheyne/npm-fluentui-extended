# QueryBuilder

An Advanced Find-style query builder for Dynamics 365: AND/OR condition groups, FetchXML in and out, OData where it can express the query, and validation against the Web API.

The QueryBuilder component provides an Advanced Find-style interface for building complex queries against Dynamics 365 entities.

## Basic Usage (Dynamics 365)

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

## Loading Existing FetchXML

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

## Getting Values Back

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

## Features

### Import/Edit/Export FetchXML

Download the current query as FetchXML, import FetchXML from elsewhere, or open the current
query as editable FetchXML:

```tsx
<QueryBuilder
  entityName="account"
  showDownloadFetchXmlButton={true}  // Default: true
  showUploadFetchXmlButton={true}    // Default: true
  showEditFetchXmlButton={true}      // Default: true
/>
```

**Import FetchXML** opens an empty dialog for pasting in a query from elsewhere.

**Edit FetchXML** opens the same dialog prefilled with the current query's FetchXML, so you can
tweak it in place or select-all and paste a different query over it. Applying rebuilds the
builder from whatever is in the box. If the XML doesn't parse, your text is kept and the error
is shown inline.

### Live Preview

Show real-time preview of the generated queries. The previews can also be toggled from the
toolbar, so these props set the *initial* visibility rather than hiding the previews outright:

```tsx
<QueryBuilder
  entityName="account"
  fields={fields}
  showODataPreview={true}
  showFetchXmlPreview={true}
  showPreviewToggleButtons={true}  // Default: true
/>
```

### Queries That OData Cannot Express

FetchXML has operators the OData `$filter` syntax has no equivalent for — relative dates
(`last-x-days`, `this-month`), fiscal periods, user context (`eq-userid`) and hierarchy
operators (`under`, `above`). These are evaluated by the FetchXML engine itself.

When a query uses one, it is **omitted from the OData filter** and reported on the result:

```tsx
<QueryBuilder
  entityName="account"
  fields={fields}
  onSerializedChange={(result) => {
    if (result.odataUnsupported.length > 0) {
      // The OData filter is NOT equivalent to the FetchXML - use result.fetchXml instead
      console.warn('Not expressible in OData:', result.odataUnsupported);
    }
  }}
/>
```

Each entry gives the field and operator that could not be translated:

```ts
{ fieldId: 'createdon', fieldLabel: 'Created On', operator: 'last-x-days', operatorLabel: 'Last X Days' }
```

The OData preview shows the same information as a warning. Use `isOperatorConvertibleToOData`
to check a single operator yourself.

### Validation with Dynamics 365 API

The Validate button checks query structure and optionally tests against the Dynamics 365 API:

```tsx
<QueryBuilder
  entityName="account"
  fields={fields}
  showValidateButton={true}  // Default: true
/>
```

Validation goes through the library's shared Web API client:
- Inside Dynamics 365 the default relative `/api/data/v9.2` path works as is; standalone or behind a dev proxy, `setWebApiBaseUrl` and `setWebApiFetch` apply
- Executes a test query with `$top=1&$count=true`
- Shows record count or API error message

When running outside Dynamics 365:
- Shows "API validation unavailable — not running in Dynamics 365 environment"

### Lookup Fields with Async Search

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

### Debug Tracing

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

## Standalone Usage (Outside Dynamics 365)

Outside Dynamics 365, either point the Web API client at your org or dev proxy with
`setWebApiBaseUrl` / `setWebApiFetch` and let fields load from metadata as usual, or provide them
manually and make no metadata requests at all:

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

## Layout and Scrolling

The header and toolbar stay pinned while the filter groups and previews scroll together as one
region. That scroll only engages when the parent constrains the height — give the wrapper a fixed
`height` (or `maxHeight`) and the component fills it:

```tsx
<div style={{ height: 500, display: 'flex', flexDirection: 'column' }}>
  <QueryBuilder entityName="account" entityDisplayName="Accounts" />
</div>
```

In an unconstrained parent the component simply grows to fit its content and the page scrolls instead.

## Query Options

The root `<fetch>` element carries the same attributes the Dynamics advanced-find editor emits:

```xml
<fetch version="1.0" mapping="logical" no-lock="false" distinct="true">
```

`distinct` defaults to `true`, which matters once related-entity filters are in play — a single
record can otherwise match several linked rows and appear more than once. Override per instance:

```tsx
<QueryBuilder entityName="account" distinct={false} noLock top={50} />
```

These props take precedence over whatever an imported query carried. When no prop is set, options
parsed from `initialFetchXml` are preserved rather than dropped on the next serialize.

## QueryBuilder Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `entityName` | `string` | - | Logical name of the entity (required) |
| `entityDisplayName` | `string` | - | Entity name used in the default heading ("Query Builder: {entityDisplayName}") |
| `title` | `ReactNode \| false` | `"Query Builder: {entityDisplayName}"` | Heading above the toolbar. Pass text or an element to replace it, or `false` to hide it |
| `fields` | `QueryBuilderField[]` | - | Fields for filtering (auto-loaded via Web API if omitted) |
| `initialFetchXml` | `string` | - | FetchXML to pre-populate the query builder |
| `initialState` | `QueryBuilderState` | - | Initial query state object |
| `distinct` | `boolean` | `true` | Emit `distinct="…"` on the root `<fetch>` |
| `noLock` | `boolean` | `false` | Emit `no-lock="…"` on the root `<fetch>` |
| `top` | `number` | - | Emit `top="N"` to cap the row count; omitted when unset |
| `onSerializedChange` | `(result: QueryBuilderApplyResult) => void` | - | Called when query changes |
| `onLookupSearch` | `(fieldId: string, searchText: string) => Promise<LookupOption[]>` | - | Lookup field search handler |
| `showODataPreview` | `boolean` | `false` | Initial visibility of the OData filter preview |
| `showFetchXmlPreview` | `boolean` | `false` | Initial visibility of the FetchXML preview |
| `showPreviewToggleButtons` | `boolean` | `true` | Show toolbar buttons that toggle the previews |
| `showResetToDefaultButton` | `boolean` | `true` | Show Reset button |
| `showDownloadFetchXmlButton` | `boolean` | `true` | Show Download FetchXML button |
| `showUploadFetchXmlButton` | `boolean` | `true` | Show Import FetchXML button |
| `showEditFetchXmlButton` | `boolean` | `true` | Show Edit FetchXML button |
| `showValidateButton` | `boolean` | `true` | Show Validate button |
| `showDeleteAllFiltersButton` | `boolean` | `true` | Show Delete All button |
| `onTrace` | `(message: string, data?: any) => void` | - | Debug/trace callback for component behavior |

## QueryBuilderField

```ts
interface QueryBuilderField {
  id: string;           // Logical attribute name
  label: string;        // Display label
  dataType: 'string' | 'number' | 'datetime' | 'boolean' | 'optionset' | 'lookup';
  options?: Array<{ label: string; value: string | number }>;  // Optionset and boolean fields
}
```

Options are loaded automatically from entity metadata when `fields` is omitted. Boolean fields
pick up their Dynamics labels (for example "Allowed" / "Not Allowed" rather than Yes / No), with
values `'1'` and `'0'` to match the FetchXML representation.

## QueryBuilderApplyResult

```ts
interface QueryBuilderApplyResult {
  state: QueryBuilderState;      // Current query state
  fetchXmlFilter: string;        // Just the <filter> element
  fetchXml: string;              // Complete FetchXML document
  odataFilter: string;           // OData $filter value
  odataQuery?: string;           // Full OData query URL (requires entitySetName)
  odataUnsupported: QueryBuilderODataUnsupported[];  // Conditions OData cannot express
}

interface QueryBuilderODataUnsupported {
  fieldId: string;        // e.g. "createdon"
  fieldLabel: string;     // e.g. "Created On"
  operator: string;       // e.g. "last-x-days"
  operatorLabel: string;  // e.g. "Last X Days"
}
```

When `odataUnsupported` is non-empty, `odataFilter` is **not** equivalent to `fetchXml` — the
untranslatable conditions have been left out. Use `fetchXml` to run the query.

## Programmatic API

### Serialize State

```ts
import { serializeQueryBuilderState } from 'fluentui-extended';

const result = serializeQueryBuilderState(state, fields, 'account');
console.log(result.fetchXml);
console.log(result.odataFilter);
```

### Parse FetchXML

```ts
import { parseFetchXmlToState } from 'fluentui-extended';

const result = parseFetchXmlToState(fetchXmlString, fields);
if (result.state) {
  // Use result.state to populate QueryBuilder
} else {
  console.error(result.error);
}
```

### Validate State

```ts
import { validateQueryBuilderState } from 'fluentui-extended';

const result = validateQueryBuilderState(state, fields);
if (!result.isValid) {
  result.errors.forEach(err => {
    console.log(`${err.fieldLabel}: ${err.message}`);
  });
}
```

## Supported Operators

| Data Type | Operators |
|-----------|-----------|
| `string` | Contains, Does Not Contain, Begins With, Does Not Begin With, Ends With, Does Not End With, Like, Not Like, Equals, Not Equals, Is Empty, Has Value |
| `number` | Greater Than, Greater Than Or Equal, Less Than, Less Than Or Equal, Between, Not Between, Equals, Not Equals, Is One Of, Is Not One Of, Is Empty, Has Value |
| `datetime` | All number comparisons, plus On / On Or Before / On Or After, relative dates (Today, This Month, Last X Days, Older Than X Months, ...) and fiscal period operators |
| `optionset` | Equals, Not Equals, Is One Of, Is Not One Of, Is Empty, Has Value |
| `lookup` | Equals, Not Equals, Is One Of, Is Not One Of, Is Empty, Has Value, plus user-context (Equals Current User, ...) and hierarchy (Under, Above, ...) operators |
| `boolean` | Equals, Not Equals, Is Empty, Has Value |

Operators map to the [FetchXML condition operators][fetchxml-operators]. Note that FetchXML has
no `contains` operator — "Contains" and "Does Not Contain" are serialized as `like` / `not-like`
with `%` wildcards around the value.

Relative date, fiscal period, user-context and hierarchy operators are FetchXML-only and cannot
be expressed in OData — see [Queries That OData Cannot Express](#queries-that-odata-cannot-express).

[fetchxml-operators]: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/operators

