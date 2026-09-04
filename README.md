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
npm install fluentui-extended \
  @fluentui/react-components \
  @fluentui/react-icons \
  @fluentui/react-datepicker-compat \
  @fluentui/react-calendar-compat
```

## Appearance

Every field-like component in this library takes an `appearance` prop and **defaults it to
`filled-darker`**, which is how Dynamics 365 renders fields natively. Fluent's own default is
`outline`, which reads as foreign on a model-driven form — so the default is deliberately different
from upstream Fluent.

```tsx
<Lookup options={options} />                        // filled-darker
<Lookup options={options} appearance="outline" />   // opt back out
```

Applies to `Lookup`, `QueryBuilder` (every field inside it), `DateTimeField` and `OptionSetField`.
`CommandBar`, `EntityGrid` and `RecordHoverCard` are not field controls and take no `appearance`.

| Value | Notes |
|-------|-------|
| `outline` | Fluent's default |
| `underline` | Not supported by `Textarea`; falls back to `outline` there |
| `filled-darker` | **This library's default** — native Dynamics 365 |
| `filled-lighter` | |
| `filled-darker-shadow` | Deprecated upstream; narrowed to `filled-darker` on dropdowns |
| `filled-lighter-shadow` | Deprecated upstream; narrowed to `filled-lighter` on dropdowns |

The two shadow variants are deprecated in Fluent and will be removed there. They are accepted so
existing callers keep working, but `Combobox` and `Dropdown` never supported them, so a component
containing those narrows to the closest non-shadow fill rather than dropping the value.

## New here? Run the harness

The fastest way to understand this library is to see every component working, in a simulated
Dynamics 365 form, with the code beside it:

```bash
git clone https://github.com/garethcheyne/npm-fluentui-extended.git
cd npm-fluentui-extended
npm install
npm run harness
```

That opens a mock model-driven app — top bar, sitemap, record form — with each component on its own
page: what it is for, when to reach for it, when to reach for something else, and a "Show code"
panel on every example holding the exact source that is running. The **Documentation** entry in the
sitemap gathers all of it in one page.

No Dynamics connection is needed; the examples run on mock data. To point them at a real org, see
[Local development](https://github.com/garethcheyne/npm-fluentui-extended/blob/main/docs/local-development.md).

## Components

### Lookup

A searchable dropdown component styled after Dynamics 365 lookup fields. Supports async search, expandable option details, and customizable header/footer.

![Lookup resolved](assets/screenshot-lookup-rest.png)

![Lookup open](assets/screenshot-lookup-open.png)

### QueryBuilder

An Advanced Find-style query builder for Dynamics 365. Build complex filter conditions with AND/OR logic, serialize to FetchXML or OData, and validate queries against the Dynamics 365 API.

![QueryBuilder](assets/screenshot-querybuilder.png)

### CommandBar

A Dynamics-style command bar. Commands that no longer fit collapse into a "More commands" menu
rather than wrapping to a second row or being clipped.

![CommandBar](assets/screenshot-commandbar.png)

### EntityGrid

> **🚧 Beta** — this is the only component in the library still marked as not yet stable.

A subgrid backed by the Web API: columns named from entity metadata, server-side paging and
sorting, and lookups rendered as names rather than GUIDs.

![EntityGrid](assets/screenshot-entitygrid.png)

### DateTimeField

A date/time field that respects the attribute's Dynamics `DateTimeBehavior`, so `DateOnly` values
cannot drift a day across timezones.

![DateTimeField](assets/screenshot-datetimefield.png)

### OptionSetField

An optionset / multi-select picklist field that loads its options from metadata, including global
option sets, and round-trips multi-selects in the comma-separated form Dynamics stores.

![OptionSetField](assets/screenshot-optionset-closed.png)

![OptionSetField open](assets/screenshot-optionset-open.png)

### RecordHoverCard

A hover card for a record reference. The record is fetched lazily once the pointer settles, and the
result is held so re-opening costs nothing.

![RecordHoverCard](assets/screenshot-hovercard.png)

### SystemUserPersona

A Dynamics systemuser persona with the contact card a persona shows on a model-driven form.

![SystemUserPersona](assets/screenshot-persona.png)

![SystemUserPersona contact card](assets/screenshot-persona-card.png)

### OwnerLookup

A preconfigured `Lookup` for `ownerid`. An owner is a user *or* a team, so both are searched;
selections render as the usual Lookup badges and multi-select comes for free.

![OwnerLookup resolved](assets/screenshot-ownerlookup-rest.png)

![OwnerLookup users and teams](assets/screenshot-ownerlookup-open.png)

### ParentPortal

Renders Fluent UI content in the **parent document**, escaping an iframe boundary with full styling. Designed for Dynamics 365 web resources where dialogs must float above the entire D365 page rather than being trapped inside the iframe.

**Problem:** Fluent UI v9 has no built-in cross-frame portal. `mountNode` targets a DOM node but Griffel injects styles into the iframe's `<head>`. D365's auto-height mechanism detects `scrollHeight` changes and adds scrollbars.

**Solution:** `ParentPortal` creates a container in `window.parent.document`, syncs all Griffel CSSOM rules to the parent, and copies Fluent theme tokens — so components render fully styled in the parent page.

```tsx
import { Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent } from '@fluentui/react-components';
import { ParentPortal } from 'fluentui-extended';

function MyDialog({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <ParentPortal>
        <DialogSurface backdrop={{ appearance: 'dimmed' }}>
          <DialogBody>
            <DialogTitle>Escaped the iframe</DialogTitle>
            <DialogContent>
              This dialog renders in the parent D365 document with full
              Fluent styling — no scrollbars, no forced iframe resize.
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </ParentPortal>
    </Dialog>
  );
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Content to render in the parent document |
| `containerId` | `string` | `'fluentui-extended-parent-portal-root'` | ID for the container element in the parent |
| `syncStyles` | `boolean` | `true` | Sync Griffel stylesheets to the parent |
| `syncTokens` | `boolean` | `true` | Copy Fluent CSS custom properties (theme tokens) |
| `syncInterval` | `number` | `300` | Interval (ms) for CSSOM rule re-sync |
| `containerStyles` | `string` | *(built-in)* | Custom CSS for the parent container |

**How it works:**
1. Creates a `position: fixed` container in `window.parent.document.body`
2. Uses `React.createPortal` to render a `FluentProvider` + children into that container
3. Serializes all `CSSStyleSheet.cssRules` from iframe `<style>` elements (Griffel uses `insertRule()`, so `textContent` is empty) and mirrors them to the parent `<head>`
4. Copies CSS custom properties (`--colorNeutralBackground1`, etc.) from the iframe's `FluentProvider` to the parent container
5. A `MutationObserver` + interval catches lazily-inserted Griffel rules
6. Falls back to in-place rendering if not inside an iframe

> **Requires same-origin:** The iframe and parent must be on the same domain (standard for D365 web resources).

### FluentShell

The outermost element of a Dynamics 365 web resource, fitting the app to whatever chrome hosts its iframe. The right gutter is not a constant - it depends on what the host already pads and where the form's content column sits, both of which move with the window and the D365 release - so `FluentShell` measures both and adds only the difference.

```tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { FluentShell } from 'fluentui-extended';

function Root() {
  return (
    <FluentProvider theme={webLightTheme} style={{ height: '100%' }}>
      <FluentShell>
        <div>app</div>
      </FluentShell>
    </FluentProvider>
  );
}
```

Nothing below it should set an outer margin - the two compound invisibly.
**[Read more &rarr;](https://github.com/garethcheyne/npm-fluentui-extended/blob/main/docs/FluentShell.md)** - props, surface detection, and the console tooling for a deployed web resource.

### FluentContainer

A card matching the surface D365 draws on a model-driven form, measured from a live form: `shadow4`, an 8px radius, and a **transparent** hairline border on the neutral page ground.

```tsx
import { FluentContainer } from 'fluentui-extended';

function Cards() {
  return (
    <FluentContainer fill scrolls="vertical" padding="none">
      <div>grid</div>
    </FluentContainer>
  );
}
```

**[Read more &rarr;](https://github.com/garethcheyne/npm-fluentui-extended/blob/main/docs/FluentContainer.md)** - props, and why clipping is opt-in.

### D365TestHarness

A local stand-in for the D365 form that will host a web resource. On a bare dev server there is no chrome to measure, so `FluentShell` falls back to standalone behaviour and the layout you develop is not the one that ships. The harness hosts your app in a genuine same-origin iframe and reproduces the geometry a live form measures, so the same gutters resolve locally as in the org.

```tsx
import { D365TestHarness, FluentShell } from 'fluentui-extended';

function Root() {
  return (
    <D365TestHarness recordName="Boomer iMAC" entityName="Price List">
      <FluentShell>
        <div>app</div>
      </FluentShell>
    </D365TestHarness>
  );
}
```

It is inactive outside a local host, so the same tree ships to Dynamics unwrapped.
**[Read more &rarr;](https://github.com/garethcheyne/npm-fluentui-extended/blob/main/docs/D365TestHarness.md)**
Setting this up in your own project also needs a dev-server proxy to reach Dataverse from `localhost`: see **[Local development](https://github.com/garethcheyne/npm-fluentui-extended/blob/main/docs/local-development.md)**.

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

Run the test harness with `npm run harness` to see all examples in action. The harness is split into
one tab per component, so each can be viewed and screenshotted on its own.

| Example | Tab | Description |
|---------|-----|-------------|
| **Basic Lookup** | Lookup | Simple lookup with expandable details, no header/footer |
| **Header & Footer** | Lookup | D365-style with "Accounts" header and "New" / "Advanced" footer links |
| **Details Only (No Secondary Text)** | Lookup | Options with icons + details but no secondary text; demonstrates icon centering on single-line text |
| **Multi-Entity Filter** | Lookup | Toggle between Accounts/Contacts with drill-down header pattern (← All) |
| **Dynamic Search (Async API)** | Lookup | Simulated 800ms API delay with loading spinner; auto-loads top 5 on open |
| **Live Dynamics Lookup** | Lookup | Connects to real D365 environment via Xrm.WebApi (when connected) |
| **QueryBuilder** | Query Builder | Full Advanced Find-style query builder with FetchXML serialization |
| **Unknown / Invalid Fields** | Query Builder | FetchXML referencing attributes that match no known field, each flagged inline |
| **Command Bar** | Command Bar | Nine commands collapsing into an overflow menu; narrow the window to watch them move |
| **Pinned / no overflow** | Command Bar | A pinned command that never collapses, and horizontal scrolling with overflow disabled |
| **Entity Grid** | Entity Grid | Server-paged accounts with sorting, selection and formatted lookup values (needs a connection) |
| **DateTimeBehavior** | Fields | One picked date serialized three ways, showing which behaviours pass through UTC |
| **OptionSetField** | Fields | Single-select with metadata colours, and a multi-select round-tripping as "1,2" |
| **Record Hover Card** | Hover Card | Static and live record cards with lazy loading on hover intent |

## API Reference

### Resolved Lookup (rest state)

Once a record is selected and the dropdown is closed, the field renders the way a resolved lookup
does on a Dynamics form: the table's icon (or its entity image), the record name as a link, a clear
button, and a magnifier rather than a chevron.

```tsx
<Lookup
  options={options}
  selectedOption={selected}
  onOptionSelect={setSelected}
  entityIcon={<BuildingRegular />}                      // falls back to the option's own icon
  entityImage={account.entityimage_url}                 // wins over the icon when the table has one
  onRecordClick={(option) => openRecord(option.key)}    // clicking the name opens the record
/>
```

If the selected option carries Dynamics record metadata (`entityName` plus `recordId` or `key`), the
Lookup now behaves like a native Dynamics field by default:

- Clicking the resolved value opens the record
- `Xrm.Navigation.openForm(...)` is used when available
- Outside a form, it falls back to a Dynamics `main.aspx` entity-record URL

Pass `onRecordClick` to override that default navigation. Set `recordLinkAppearance={false}` to render
the value as plain input text instead.

### Lookup Setup Modes

The same component supports three distinct setups:

#### 1. Plain custom values

Use this when the lookup is just a searchable picker and does not represent a Dynamics table row.

```tsx
const options: LookupOption[] = [
  { key: 'draft', text: 'Draft' },
  { key: 'submitted', text: 'Submitted' },
  { key: 'approved', text: 'Approved' },
];

<Lookup
  options={options}
  selectedOption={selected}
  onOptionSelect={setSelected}
/>
```

Only `key` and `text` are required. In this mode there is no record navigation and no Web API-backed
hover card unless you provide your own custom card body.

#### 2. Dynamics-backed records

Use this when each option represents a real Dataverse / Dynamics record.

```tsx
const options: LookupOption[] = [
  {
    key: '00000000-0000-0000-0000-000000000001',
    text: 'Contoso Ltd',
    entityName: 'account',
    recordId: '00000000-0000-0000-0000-000000000001',
  },
];

<Lookup
  options={options}
  selectedOption={selected}
  onOptionSelect={setSelected}
/>
```

When `entityName` and `recordId` are present, the selected value can behave like a native Dynamics
lookup link and the built-in record hover card can fetch the record lazily.

#### 3. Dynamics-backed records with hover cards

Turn on `showHoverCard` when you want the lookup to reveal record details on hover.

```tsx
<Lookup
  options={options}
  selectedOption={selected}
  onOptionSelect={setSelected}
  showHoverCard
  hoverCardColumns={['accountnumber', 'telephone1', 'primarycontactid']}
  hoverCardTarget="both"
/>
```

Two hover-card modes are supported:

- Built-in record card: provide `entityName` and `recordId` on each option, plus `hoverCardColumns`
- Custom card body: provide `renderHoverCard={(option) => ...}`

If a rest-state hover card is active, the component does not also show the compacted-value tooltip on
that same surface.

### Lookup Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | auto-generated | Unique identifier for the lookup |
| `appearance` | `FieldAppearance` | `'filled-darker'` | See [Appearance](#appearance) |
| `entityIcon` | `React.ReactNode` | option's `icon` | Table icon shown at rest |
| `entityImage` | `string` | - | Entity image URL, shown in place of the icon |
| `recordLinkAppearance` | `boolean` | `true` | Render the resolved value as a link |
| `onRecordClick` | `(option: LookupOption) => void` | - | Overrides the default Dynamics record navigation when the resolved value is clicked |
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
| `disableClientFilter` | `boolean` | `false` | Disable client-side filtering of options. Use this when filtering is performed server-side via `onSearchChange` |
| `showHoverCard` | `boolean` | `false` | Reveal a hover card on lookup rows and/or the resolved value |
| `hoverCardColumns` | `string[]` | - | Columns fetched and listed by the built-in record card |
| `renderHoverCard` | `(option: LookupOption) => ReactNode` | - | Build the hover card body yourself |
| `hoverCardTarget` | `'list' \| 'rest' \| 'both'` | `'both'` | Which lookup surfaces offer the hover card |
| `hoverCardDelayMs` | `number` | `400` | Hover-intent delay before opening the card |
| `hoverCardActions` | `ReactNode` | - | Footer actions rendered on the card |
| `searchFields` | `string` | - | Hidden searchable text (never rendered). Use this to include additional searchable content (codes, IDs) while displaying JSX in `secondaryText` |

### Client-Side Filtering

By default, the Lookup component filters options client-side as the user types. The filtering logic works as follows:

1. **Primary field (`text`)** — Always searched, regardless of other props
2. **Search fields (`searchFields`)** — If provided, this hidden text is searched (useful when `secondaryText` is JSX)
3. **Secondary text (`secondaryText`)** — Only searched if it's a string (JSX elements are skipped)

This allows you to use rich JSX (badges, icons) in `secondaryText` while still providing searchable text via `searchFields`:

```tsx
const options: LookupOption[] = [
  {
    key: 'PROD-001',
    text: 'Acme Widget',                           // Always searchable
    searchFields: 'PROD-001 SKU-12345 acme-widget', // Hidden searchable text
    secondaryText: (                               // Rich display (not searchable)
      <span style={{ display: 'flex', gap: 4 }}>
        <Badge size="small">PROD-001</Badge>
        <Badge size="small" color="brand">SKU-12345</Badge>
      </span>
    ),
  },
];
```

**Server-Side Filtering:** When using `onSearchChange` to fetch results from an API, set `disableClientFilter={true}` to prevent the client from re-filtering server results:

```tsx
<Lookup
  options={apiResults}
  onSearchChange={(searchText) => fetchFromApi(searchText)}
  disableClientFilter={true}  // API already filtered the results
  loading={isLoading}
/>
```

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
  searchFields?: string;            // Hidden searchable text (never rendered)
  icon?: ReactNode;                 // Icon component (e.g., <BuildingRegular />)
  details?: LookupOptionDetail[];   // Expandable details (chevron appears)
  data?: unknown;                   // Custom data payload for your app
  disabled?: boolean;               // Disable this option
  entityName?: string;              // Dynamics table logical name, e.g. 'account'
  recordId?: string;                // Dynamics record GUID; falls back to key when omitted
}

interface LookupOptionDetail {
  label?: ReactNode;  // Optional label (e.g., "Phone:" or a Badge)
  value: ReactNode;   // Detail value - string or JSX element
}
```

> **Note:** Both `secondaryText` and `details` support React elements, not just strings. See [Rich Secondary Text](#rich-secondary-text-with-react-elements) for examples. When using JSX in `secondaryText`, use `searchFields` to provide hidden searchable text (see [Client-Side Filtering](#client-side-filtering)).

`entityName` plus `recordId` are what switch a generic option into a Dynamics-backed record option.
That metadata is used by the default selected-value navigation path and by the built-in hover-card
fetch path.

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

#### Import/Edit/Export FetchXML

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

#### Live Preview

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

#### Queries That OData Cannot Express

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

### Layout and Scrolling

The header and toolbar stay pinned while the filter groups and previews scroll together as one
region. That scroll only engages when the parent constrains the height — give the wrapper a fixed
`height` (or `maxHeight`) and the component fills it:

```tsx
<div style={{ height: 500, display: 'flex', flexDirection: 'column' }}>
  <QueryBuilder entityName="account" entityDisplayName="Accounts" />
</div>
```

In an unconstrained parent the component simply grows to fit its content and the page scrolls instead.

### Query Options

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

### QueryBuilder Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `entityName` | `string` | - | Logical name of the entity (required) |
| `entityDisplayName` | `string` | - | Display name shown in header |
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

### QueryBuilderField

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

### QueryBuilderApplyResult

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

---

## CommandBar

Fluent ships `Toolbar` and `Overflow` as separate primitives. `CommandBar` composes them into the
behaviour a command bar needs: commands that no longer fit move into a "More commands" menu instead
of wrapping or being clipped. Widths are measured from the live DOM, so label length and icons are
accounted for rather than estimated.

```tsx
import { CommandBar } from 'fluentui-extended';
import { AddRegular, EditRegular, DeleteRegular } from '@fluentui/react-icons';

<CommandBar
  items={[
    { key: 'new', text: 'New', icon: <AddRegular />, appearance: 'primary', onClick: handleNew },
    { key: 'edit', text: 'Edit', icon: <EditRegular />, onClick: handleEdit },
    { key: 'delete', text: 'Delete', icon: <DeleteRegular />, dividerBefore: true, onClick: handleDelete },
    {
      key: 'export',
      text: 'Export',
      subItems: [{ key: 'excel', text: 'Export to Excel', onClick: handleExport }],
    },
  ]}
/>
```

### CommandBar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `CommandBarItem[]` | - | Commands rendered from the left (required) |
| `farItems` | `CommandBarItem[]` | - | Right-aligned commands; never collapse |
| `size` | `'small' \| 'medium' \| 'large'` | `'small'` | Button size |
| `disableOverflow` | `boolean` | `false` | Scroll horizontally instead of collapsing |
| `overflowAriaLabel` | `string` | `'More commands'` | Label for the overflow trigger |

`CommandBarItem` carries `key`, `text`, `icon`, `onClick`, `disabled`, `appearance`, `checked` (renders
a toggle), `subItems` (renders a menu button, preserved as a submenu when overflowed), `dividerBefore`,
and `pinned`. A pinned command never collapses — use it sparingly, because one that does not fit is
clipped rather than moved.

### Tooltips

Commands take Fluent tooltips in three forms, and they show on hover and focus whether or not the
command has a visible label.

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Tooltip heading. Also the accessible name for icon-only commands |
| `description` | `React.ReactNode` | Body text under the title. Its presence makes the tooltip rich |
| `tooltip` | `React.ReactElement` | Fully custom content; overrides `title`/`description` as the body |

```tsx
<CommandBar
  items={[
    // Plain — a single line of text
    { key: 'edit', text: 'Edit', title: 'Edit the selected record' },

    // Rich — semibold heading over a body line
    {
      key: 'new',
      text: 'New',
      title: 'New record',
      description: 'Opens a blank form for this table.',
    },

    // description takes markup, so it can carry its own emphasis
    {
      key: 'delete',
      text: 'Delete',
      title: 'Delete',
      description: <>Permanently removes it. <strong>This cannot be undone.</strong></>,
    },

    // Fully custom content
    {
      key: 'flow',
      text: 'Flow',
      title: 'Flow',
      tooltip: (
        <span>
          <strong>Power Automate</strong>
          <br />Run or manage flows for this record.
        </span>
      ),
    },
  ]}
/>
```

**Accessibility.** The tooltip's `relationship` is chosen for you from whether the command has a
visible label. An icon-only command with a plain `title` uses `relationship="label"`, so the tooltip
becomes its accessible name. A command with visible text uses `relationship="description"`, leaving
the label as the name — otherwise a screen reader would announce the explanation instead of the
command. When a rich or custom tooltip is used on an icon-only command, `title` still supplies a
short accessible name rather than the whole tooltip body being read out, so it is worth setting
alongside `tooltip`.

Inside the overflow menu, only `description` and `tooltip` produce a tooltip. A `title`-only one is
suppressed there, since the menu row already displays that exact text.

---

## EntityGrid

> **🚧 Beta.** EntityGrid is the only component still marked as not yet stable.

A subgrid backed by the Web API. `DataGrid` renders rows you already have; `EntityGrid` fetches them.

Paging uses `Prefer: odata.maxpagesize` and follows `@odata.nextLink`, rather than `$top`/`$skip` —
Dynamics does not support `$skip` for arbitrary offsets, and `$top` suppresses the paging cookie
entirely. Because `nextLink` only moves forward, the URL of each visited page is kept so Previous can
replay it.

```tsx
import { EntityGrid } from 'fluentui-extended';

<EntityGrid
  entityName="account"
  title="Accounts"
  height={420}
  pageSize={25}
  selectable
  columns={[
    { name: 'name', width: 260 },
    { name: 'accountnumber' },
    { name: 'primarycontactid', label: 'Primary Contact' },
  ]}
  onRecordOpen={(id) => Xrm.Navigation.openForm({ entityName: 'account', entityId: id })}
/>
```

Cells prefer the `@OData.Community.Display.V1.FormattedValue` annotation Dynamics attaches, which is
what renders a lookup as a name and an optionset as its label rather than a GUID or an integer. The
grid requests those annotations for you.

### EntityGrid Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `entityName` | `string` | - | Entity logical name (required) |
| `columns` | `EntityGridColumn[]` | primary name attribute | Columns to render |
| `filter` | `string` | - | OData filter applied to every page |
| `defaultSort` | `EntityGridSort` | primary name ascending | Initial sort |
| `pageSize` | `number` | `25` | Rows per page |
| `selectable` | `boolean` | `false` | Show selection checkboxes |
| `onRecordOpen` | `(id, record) => void` | - | Row activation handler |
| `onSelectionChange` | `(ids: string[]) => void` | - | Selection handler |
| `height` | `number \| string` | - | Fixed height for the scrolling body |

`EntityGridColumn` carries `name`, `label` (defaults to the metadata display name), `width`,
`sortable`, and `render(formatted, record)` for custom cells.

Pair it with QueryBuilder by passing that component's `odataFilter` output as `filter`.

---

## DateTimeField

Dynamics has three `DateTimeBehavior` values and they do not agree on what a stored string means, so
a single `new Date(value)` is wrong for two of the three:

| Behavior | Stored as | Conversion |
|----------|-----------|------------|
| `UserLocal` | UTC | Converted to the user's timezone |
| `DateOnly` | Calendar date, no time or zone | None — must never shift |
| `TimeZoneIndependent` | Wall-clock, no zone | None — shown exactly as entered |

The trap is that `new Date('2026-08-06')` parses as UTC midnight, which renders as the 5th anywhere
west of Greenwich, while `toISOString()` on a local date shifts the day for any user east of it.
`DateTimeField` handles both explicitly.

```tsx
import { useState } from 'react';
import { DateTimeField, DateTimeRangeField } from 'fluentui-extended';

function Example() {
  const [value, setValue] = useState<string | null>(null);
  const [range, setRange] = useState({
    startValue: null as string | null,
    endValue: null as string | null,
  });

  return (
    <>
      <DateTimeField
        label="Estimated Close Date"
        behavior="DateOnly"
        value={value}
        onChange={(stored) => setValue(stored)}  // "2026-08-06", never an ISO timestamp
      />

      <DateTimeRangeField
        label="Booking window"
        showTime
        value={{ start: range.startValue, end: range.endValue }}
        onChange={({ startValue, endValue, startDate, endDate }) => {
          setRange({ startValue, endValue });
          console.log(startDate, endDate);
        }}
      />
    </>
  );
}
```

Pass `entityName` and `attributeName` to read the behavior from metadata instead of declaring it.
The conversion helpers are exported for use outside the component:

```ts
import { parseStoredValue, formatStoredValue } from 'fluentui-extended';

const date = parseStoredValue('2026-08-06', 'DateOnly');   // local midnight on the 6th
const stored = formatStoredValue(date, 'DateOnly');        // "2026-08-06"
```

`DateTimeRangeField` is a composed helper for "between" inputs. It renders a start and end
`DateTimeField` side by side and emits both the serialized values (`startValue`, `endValue`) and the
resolved `Date` objects (`startDate`, `endDate`) in one callback.

### DateTimeField Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| Date \| null` | - | Stored value, interpreted per `behavior` |
| `onChange` | `(value: string \| null, date: Date \| null) => void` | - | Serialized value plus the Date |
| `behavior` | `DateTimeBehavior` | `'UserLocal'` | How the attribute is stored |
| `showTime` | `boolean` | `false` | Show a time picker; ignored for `DateOnly` |
| `timeIntervalMinutes` | `number` | `30` | Spacing of the time dropdown entries |
| `entityName` / `attributeName` | `string` | - | Read `behavior` from metadata |
| `clearable` | `boolean` | `true` | Show a clear button |

---

## OptionSetField

```tsx
import { OptionSetField } from 'fluentui-extended';

// Options loaded from metadata
<OptionSetField entityName="account" attributeName="industrycode" value={value} onChange={setValue} />

// Multi-select picklist
<OptionSetField
  options={options}
  multiselect
  value={values}              // accepts [1, 2] or the stored "1,2"
  onChange={(next) => setValues(next as number[])}
/>
```

Two Dynamics details this handles that a plain `Dropdown` does not. A **global option set** leaves
`OptionSet` empty and puts its values on `GlobalOptionSet` instead — reading only the former is why a
dropdown that should be populated comes back empty. And a **multi-select picklist** stores its value
as a comma-separated string, so `"1,2"` and `[1, 2]` have to mean the same thing; `parseSelectedValues`
and `formatMultiSelectValue` are exported for that conversion.

When an option set has many values, the popup list stays constrained and scrolls inside the listbox
instead of growing indefinitely. The control also supports typing to filter options by label, which
is especially useful for long status-reason, industry, or category lists.

### OptionSetField Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `OptionSetOption[]` | - | Options; omit to auto-load from metadata |
| `entityName` / `attributeName` | `string` | - | Required for metadata auto-load |
| `multiselect` | `boolean` | `false` | Multi-select picklist behaviour |
| `value` | `number \| number[] \| string \| null` | - | Accepts every stored form |
| `onChange` | `(value: number \| number[] \| null) => void` | - | Selection handler |
| `showColors` | `boolean` | `false` | Render metadata colours as swatches |
| `clearable` | `boolean` | `true` | Allow clearing the selection |

### OptionSetField Behaviour

- Type in the field to filter the available options by label
- Long option lists are capped and scroll inside the popup
- `multiselect` keeps the Dynamics-style multi-value semantics while still allowing filter-by-typing
- `value` still accepts Dynamics' stored comma-separated string form for multi-select picklists

---

## RecordHoverCard

```tsx
import { RecordHoverCard } from 'fluentui-extended';

<RecordHoverCard
  entityName="account"
  recordId={record.accountid}
  columns={['accountnumber', 'telephone1', 'primarycontactid']}
  actions={<Link onClick={open}>Open record</Link>}
>
  <Link>{record.name}</Link>
</RecordHoverCard>
```

The record is fetched only after the pointer has settled on the anchor for `hoverDelayMs` (400 by
default) — without that delay, dragging a pointer across a grid column fires a request per row. The
result is held for the life of the anchor, so re-opening the same card costs nothing, while a failure
is not cached so the next hover retries.

Pass `record` directly to skip loading entirely when the calling grid already has the data.

### RecordHoverCard Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactElement` | - | Anchor element (required) |
| `entityName` / `recordId` | `string` | - | Required to load via the Web API |
| `columns` | `string[]` | primary name only | Columns to request and show |
| `record` | `RecordHoverCardRecord` | - | Supply the record and skip loading |
| `mapRecord` | `(raw) => RecordHoverCardRecord` | - | Map a raw record onto the card |
| `hoverDelayMs` | `number` | `400` | Delay before a hover triggers a fetch |
| `actions` | `React.ReactNode` | - | Footer commands |

---

## SystemUserPersona

A Dynamics `systemuser` persona: avatar, name, job title, and the contact card a persona shows on a
model-driven form. The record loads lazily — only once the pointer settles on the persona — so a grid
column of them costs one request per card actually looked at, not one per row.

```tsx
import { SystemUserPersona } from 'fluentui-extended';

<SystemUserPersona
  userId={record._ownerid_value}
  presence="available"                  // Teams presence: supply it, Dynamics does not expose it
  cardActions={<Link onClick={open}>Open record</Link>}
/>
```

Pass `user` instead of `userId` to skip loading when the caller already has the record. The photo is
addressed at `systemusers(id)/entityimage/$value` rather than selected as a column — `entityimage` is
binary, and selecting it inline bloats every search response. Pass `imageUrl={null}` to force initials.

### SystemUserPersona Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | - | systemuser GUID to load |
| `user` | `SystemUserRecord` | - | Supply the record and skip loading |
| `presence` | `PresenceBadgeStatus` | - | Teams presence badge |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Avatar and text scale |
| `avatarOnly` | `boolean` | `false` | Hide the name; it moves to a tooltip |
| `showHoverCard` | `boolean` | `true` | Reveal the contact card on hover |
| `additionalContact` | `SystemUserContactItem[]` | - | Extra rows in the Contact section |
| `cardActions` | `React.ReactNode` | - | Footer content on the card |
| `onClick` | `(user) => void` | - | Called when the name is clicked |

`SystemUserCard` is exported separately for rendering the card body outside a popover.

---

## Hover Cards

Any `Lookup` can reveal a record card when the pointer settles on an option — in the dropdown, on the
resolved badge, or both. It is off by default and adds no wrapper to the DOM until enabled.

```tsx
<Lookup
  options={accounts.map((a) => ({ ...a, entityName: 'account' }))}
  showHoverCard
  hoverCardColumns={['accountnumber', 'telephone1', 'primarycontactid']}
  hoverCardActions={<Link onClick={open}>Open record</Link>}
/>
```

![Lookup with a hover card](assets/screenshot-lookup-hovercard.png)

Each option carries its own reference — `entityName`, plus `recordId` when the key is not the GUID —
and that is what the card fetches from. Loading is **lazy and gated on hover intent**: nothing is
requested until a pointer has rested on a row for `hoverCardDelayMs` (400 by default), so a list of
fifty results costs no extra requests until one is actually hovered, and dragging across the list
fires nothing at all. Results are cached per anchor; failures are not, so the next hover retries.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showHoverCard` | `boolean` | `false` | Enable the card |
| `hoverCardColumns` | `string[]` | - | Columns fetched and listed on the card |
| `renderHoverCard` | `(option) => ReactNode` | - | Build the body yourself; return `null` to suppress |
| `hoverCardTarget` | `'list' \| 'rest' \| 'both'` | `'both'` | Which surfaces offer the card |
| `hoverCardDelayMs` | `number` | `400` | Hover-intent delay before opening and fetching |
| `hoverCardActions` | `React.ReactNode` | - | Footer content on the card |

---

## OwnerLookup

`ownerid` is polymorphic: an owner is a **systemuser or a team**. `OwnerLookup` is a preconfigured
`Lookup` that knows this — it owns the querying and how owners present, and hands everything else to
Lookup, so the resolved value is the same badge any lookup uses and multi-select needs no extra work.

```tsx
import { OwnerLookup } from 'fluentui-extended';

<OwnerLookup
  label="Owner"
  selectedOwner={owner}
  onOwnerSelect={setOwner}
  onOwnerClick={(o) => openRecord(o.type, o.id)}
/>

// Multi-select
<OwnerLookup multiSelect selectedOwners={owners} onOwnersSelect={setOwners} />
```

![OwnerLookup multi-select](assets/screenshot-ownerlookup-multi.png)

`types` defaults to `['systemuser']`. Pass both and the lookup **grows a header automatically**,
letting the user narrow to Users or Teams the way a polymorphic Dynamics lookup does — no extra
wiring:

```tsx
<OwnerLookup types={['systemuser', 'team']} selectedOwner={owner} onOwnerSelect={setOwner} />
```

![OwnerLookup users and teams](assets/screenshot-ownerlookup-open.png)

Users and teams are queried in parallel and merged with users first, matching how the Dynamics owner
lookup groups results. One type failing does not lose the other — a caller with no read access to
teams still gets users. Users are filtered to enabled interactive accounts, and teams to
`teamtype eq 0`: access teams and AAD-managed teams cannot own records, so offering them would
produce an unassignable selection.

Hovering a user shows the full persona contact card; a team shows its description, business unit and
administrator. Pass `types={['systemuser']}` for a people-only picker.

### OwnerLookup Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedOwner` | `OwnerRecord \| null` | - | Selection (controlled) |
| `onOwnerSelect` | `(owner \| null) => void` | - | Selection handler |
| `multiSelect` | `boolean` | `false` | Render selections as badges |
| `selectedOwners` / `onOwnersSelect` | | - | Multi-select selection |
| `types` | `OwnerType[]` | `['systemuser']` | Pass both to get the Users/Teams header |
| `owners` | `OwnerRecord[]` | - | Supply a roster instead of querying |
| `onSearch` | `(text) => Promise<OwnerRecord[]>` | - | Custom search |
| `includeDisabled` | `boolean` | `false` | Include disabled user accounts |
| `presence` | `Record<string, PresenceBadgeStatus>` | - | Presence keyed by owner id |
| `showHoverCard` | `boolean` | `true` | Contact card on results and badges |
| `onOwnerClick` | `(owner) => void` | - | Called when a resolved name is clicked |

---

## Documentation Screenshots

Component screenshots are generated, not taken by hand:

```bash
npm run shots              # capture everything into assets/
npm run shots lookup-open  # or just one
```

`?shot=<id>` on the harness renders a **single populated component** with no surrounding chrome —
no header, no tabs, no sibling examples — inside a fixed-width `#shot-frame`. The capture script
visits each one and screenshots that element, so the output is already a tight crop at a stable size,
with no manual cropping. `?shot=index` lists what is available.

Components that open a surface get one shot per state (`lookup-rest` / `lookup-open`,
`optionset-closed` / `optionset-open` / `optionset-multi`), because a capture script cannot reliably
drive a pointer, and those states are what the docs need to show.

Data-backed components are populated from fixtures rather than a live org: shot mode swaps the
library transport via `setWebApiFetch`, so captures never depend on what happens to be in someone's
environment and no real customer data reaches the docs. Add or edit shots in
[`testHarness/shots/registry.tsx`](testHarness/shots/registry.tsx).

---

## Web API Client

The metadata-aware components share one Web API client with a process-wide metadata cache, so two
components mounting in the same tick share a single round trip. Metadata is immutable for the life of
a page, and failures are not cached.

```ts
import { setWebApiBaseUrl, setWebApiFetch, getEntityDefinition, clearMetadataCache } from 'fluentui-extended';

// Standalone / SPA usage - defaults to a relative path, which works inside Dynamics
setWebApiBaseUrl('https://contoso.crm.dynamics.com/api/data/v9.2');

// Supply your own authenticated transport
setWebApiFetch((url, init) => authenticatedFetch(url, init));

const definition = await getEntityDefinition('account');  // EntitySetName, PrimaryIdAttribute, ...
```

Exports: `webApiGet`, `setWebApiFetch`, `setWebApiBaseUrl`, `getWebApiBaseUrl`, `WebApiError`,
`getEntityDefinition`, `getEntityAttributes`, `getEntityOptionSets`, `getAttributeOptions`,
`clearMetadataCache`.

> **Note:** Lookup and QueryBuilder still use their own internal fetch logic and do not yet share
> this client.

---

## Acknowledgments

This library extends [Microsoft's Fluent UI React v9](https://react.fluentui.dev/) components. Thank you to Microsoft and the Fluent UI team for creating and maintaining such an excellent design system.

- [Fluent UI React](https://react.fluentui.dev/)
- [Fluent UI GitHub](https://github.com/microsoft/fluentui)
- [Fluent 2 Design System](https://fluent2.microsoft.design/)

---

## Changelog

Release history lives in [CHANGELOG.md](CHANGELOG.md).

> Version format: `YYYY.M.DD` (e.g., `2026.8.30` = August 30, 2026)

## License

MIT
