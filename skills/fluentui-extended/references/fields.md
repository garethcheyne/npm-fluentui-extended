# Field components

Form controls that match Dynamics 365 model-driven fields. All import from `'fluentui-extended'`.

Shared rules (verified per component):

- **Appearance.** Every field component defaults `appearance` to `'filled-darker'` (native
  Dynamics; Fluent defaults to `outline`). `FieldAppearance` = `outline | underline |
  filled-darker | filled-lighter | filled-darker-shadow | filled-lighter-shadow` (shadow variants
  deprecated). Do not override it to match Fluent samples.
- **Size.** `size="small"` (24px) for dense layouts: grids, filter bars, toolbars.
- **Labels.** `OwnerLookup`, `AddressLookup`, `OptionSetField`, `DateTimeField` take `label`,
  `validationMessage`, `required` and wrap themselves in a Fluent `Field`. **`Lookup` has no
  `label`** (it extends Fluent `InputProps`): wrap it in `<Field label=...>`.
- **readOnly vs disabled.** Only `Lookup` and `AddressLookup` have `readOnly`: value stays full
  contrast, link and hover card stay live, nothing editable - the Dynamics look for a locked
  field. `disabled` greys it out. `OptionSetField`, `DateTimeField`, `OwnerLookup` have only
  `disabled`.

| Need | Use | Not |
| --- | --- | --- |
| Record reference / any searchable value | `Lookup` | Fluent `Combobox` |
| `ownerid` (user or team) | `OwnerLookup` | `Lookup` wired to `systemusers` |
| Self-referencing table (account → parent account) | `Lookup` + `useHierarchyLookup` | flat `Lookup` |
| Choice / Choices column | `OptionSetField` | Fluent `Dropdown` |
| Date / date-time column | `DateTimeField` | Fluent `DatePicker` + `new Date(value)` |
| Between-dates filter | `DateTimeRangeField` | two hand-wired `DateTimeField`s |
| Display a user with contact card | `SystemUserPersona` | Fluent `Persona` |
| Hover details on any record reference | `RecordHoverCard` | custom Popover + fetch |
| Address entry via Google Places | `AddressLookup` | `Lookup` + your own Places calls |

## `inline`: fields inside a cell

`Lookup`, `OptionSetField` and `DateTimeField` take `inline?: boolean` (default `false`). On, the
control is drawn as its value - no fill, border or underline in any state - for a host that is
itself the control and draws the focus ring: a grid cell, a list row. The choice chevron and the
date's clear and calendar buttons come back on hover and focus. A form field leaves it off.
`DataGrid` renders its own editors this way.

```tsx
<OptionSetField inline size="small" options={options} value={value} onChange={setValue} />
```

## Lookup

Searchable single/multi picker styled as a Dynamics lookup; the resolved value renders as a record
link with the entity icon.

```tsx
import { useState } from 'react';
import { Field } from '@fluentui/react-components';
import { Lookup, type LookupOption } from 'fluentui-extended';

function AccountField({ search }: { search: (t: string) => Promise<LookupOption[]> }) {
  const [value, setValue] = useState<LookupOption | null>(null);
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const onSearch = async (text: string) => {
    setLoading(true);
    setOptions(await search(text)); // rows as { key: accountid, text: name, entityName: 'account' }
    setLoading(false);
  };
  return (
    <Field label="Account">
      <Lookup options={options} selectedOption={value} onOptionSelect={setValue}
        onSearchChange={onSearch} disableClientFilter loading={loading} />
    </Field>
  );
}
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `options` | `LookupOption[]` | `[]` | |
| `selectedOption` | `LookupOption \| null` | - | Preferred; survives `options` changing |
| `selectedKey` | `string \| null` | - | Resolves only if the key is in current `options` |
| `onOptionSelect` | `(o: LookupOption \| null) => void` | - | `null` on clear |
| `onSearchChange` | `(text: string) => void` | - | Debounced |
| `disableClientFilter` | `boolean` | `false` | `true` for server-side search |
| `minSearchLength` / `searchDebounceMs` | `number` | `0` / `300` | |
| `loading` | `boolean` | `false` | Spinner |
| `placeholder` / `noResultsMessage` | `string` | `'Search...'` / `'No results found'` | |
| `clearable` | `boolean` | `true` | |
| `readOnly` | `boolean` | `false` | Hides input, search icon and dropdown |
| `disabled` | `boolean` | - | |
| `appearance` | `FieldAppearance` | `'filled-darker'` | |
| `size` | `'small' \| 'medium'` | `'medium'` | No `large` |
| `multiSelect` / `maxSelection` | `boolean` / `number` | `false` / unlimited | With `selectedOptions` or `selectedKeys`, `onOptionsSelect` |
| `entityIcon` / `entityImage` | `ReactNode` / `string` | option `icon` | Before the resolved value; image wins |
| `recordLinkAppearance` | `boolean` | `true` | `false` = plain text value |
| `onRecordClick` | `(o: LookupOption) => void` | - | Overrides default record navigation |
| `editSelectionOnBackspace` | `boolean` | `false` | Backspace turns the value back into search text |
| `searchIcon` | `'always' \| 'whenEmpty'` | `'always'` | |
| `header` / `footer` | `ReactNode` | - | Dropdown chrome (type filter, "+ New") |
| `open` / `onOpenChange` | `boolean` / `(open) => void` | - | Controlled open state |
| `mountNode` | `HTMLElement` | - | Portal target when rendered into a parent document |

`LookupOption`: `key`, `text` required; optional `secondaryText` (ReactNode), `searchFields`
(hidden searchable string), `icon`, `details` (`{ label?, value }[]`, expandable), `data`,
`disabled`, `entityName`, `recordId` (defaults to `key`), `parentKey`, `hasChildren`.

### Dynamics behaviour

- **`entityName` on an option makes it a record reference.** With `entityName` (+ `recordId`, or a
  GUID `key`), clicking the resolved value calls `Xrm.Navigation.openForm({ entityName, entityId })`
  or, outside a form, navigates to `/main.aspx?pagetype=entityrecord&etn=..&id=..`.
  `onRecordClick` overrides; without `entityName` a click just opens the dropdown. The same fields
  drive the built-in hover card.
- **`selectedOption` vs `selectedKey`.** `selectedKey` is looked up in the current `options`, so a
  server search that replaces them loses it. Use `selectedOption` for async data.
- **External reset.** Display = `selectedOption ?? match(selectedKey) ?? internal state`, so
  setting `selectedOption={null}` from outside after a user pick does not clear it. Remount
  (`key={resetCount}`) to reset. Multi-select `selectedOptions={[]}` is honoured.
- **Client filter** matches `text`, `searchFields`, and `secondaryText` only if it is a string -
  put codes in `searchFields` when `secondaryText` is JSX. Set `disableClientFilter` for server
  search, or server results get re-filtered.
- **readOnly** also drops the clear (X) on the value: removing it would be changing it.

### Hierarchical mode

Tree built from each option's `parentKey`, indented by level; popup is an ARIA `tree`.

```tsx
const categories: LookupOption[] = [
  { key: 'elec', text: 'Electrical' },
  { key: 'light', text: 'Lighting', parentKey: 'elec' },
  { key: 'led', text: 'LED downlights', parentKey: 'light' },
];
<Lookup options={categories} hierarchical defaultExpanded={1} selectableParents={false} showPath
  selectedOption={value} onOptionSelect={setValue} />; // "Electrical › Lighting › LED downlights"
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `hierarchical` | `boolean` | `false` | Off: `parentKey` ignored |
| `defaultExpanded` | `'all' \| 'none' \| number` | `'all'` | `1` = top level open; lazy nodes start closed |
| `onLoadChildren` | `(o) => Promise<LookupOption[] \| void> \| LookupOption[] \| void` | - | First expand of a `hasChildren` node with no children |
| `selectableParents` | `boolean` | `true` | `false`: parents only expand/collapse |
| `showPath` / `pathSeparator` | `boolean` / `string` | `false` / `' › '` | Resolved value shows ancestors |
| option `parentKey` | `string \| null` | - | Level derived; unknown parent → top level |
| option `hasChildren` | `boolean` | - | Chevron for children not loaded yet |

- `onLoadChildren` returns the children (their `parentKey` defaults to the node's key) or nothing
  after you add them to `options`. A node that loads empty loses its chevron; a rejected load
  closes the node so the next expand retries.
- Typing opens the tree to the matches with ancestors dimmed; no folding while searching. With
  `disableClientFilter` everything returned is shown, opened.
- `showPath` remembers every option seen, so the path survives a server search replacing
  `options`.

### useHierarchyLookup

For Dataverse tables with a hierarchical self-relationship (account, business unit, custom).
Reads the relationship from metadata, loads roots, lazy-loads children, searches server-side
returning each match with its ancestors.

```tsx
import { Lookup, useHierarchyLookup } from 'fluentui-extended';

const hierarchy = useHierarchyLookup('account', { filter: 'statecode eq 0' });
<Lookup {...hierarchy} selectedOption={value} onOptionSelect={setValue} showPath />;
```

`useHierarchyLookup(entityLogicalName: string, options?: UseHierarchyLookupOptions)` returns
`HierarchyLookupProps` = `{ hierarchical: true, options, loading, onSearchChange, onLoadChildren,
disableClientFilter: true }`.

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `filter` | `string` (OData) | - | Roots, children, matches; ancestors fetched regardless |
| `select` | `string[]` | - | Extra columns, on `option.data` (raw row) |
| `top` | `number` | 250 children / 25 matches | |
| `parentAttribute` | `string` | from relationship | Needed when the table has none (otherwise throws) |
| `toOption` | `(record: HierarchyRecord, option: LookupOption) => LookupOption` | - | Add `secondaryText`, `icon` |
| `onError` | `(error: Error) => void` | - | List keeps what it had |

Built options carry `key`/`recordId` = id, `entityName` = table, `parentKey`, `hasChildren`,
`data` = raw row, so navigation and hover cards work. Options are read at call time: inline
objects do not refetch, and changing `filter` does not reload roots until the table name changes
or a search runs. Also exported: `getHierarchyRelationship`, `getHierarchyChildren`,
`searchHierarchy`, `clearHierarchyCache`.

### Hover-card props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `showHoverCard` | `boolean` | `false` | No DOM wrapper until enabled |
| `hoverCardColumns` | `string[]` | - | Fetched via `RecordHoverCard`; options need `entityName` (+ `recordId` if `key` is not the GUID) |
| `renderHoverCard` | `(o: LookupOption) => ReactNode` | - | Custom body; `null` suppresses; beats `hoverCardColumns` |
| `hoverCardTarget` | `'list' \| 'rest' \| 'both'` | `'both'` | Dropdown rows, resolved value, or both |
| `hoverCardDelayMs` | `number` | `400` | Hover intent before open + fetch |
| `hoverCardActions` | `ReactNode` | - | Card footer |

Lazy: nothing fetched until a card opens. Column caveats: see RecordHoverCard.

## OwnerLookup

Preconfigured `Lookup` for polymorphic `ownerid` (systemuser **or** team): runs the searches,
renders avatars, shows the persona card on hover. Use for every owner field; the default
`types={['systemuser']}` is a people-only picker.

```tsx
import { OwnerLookup, type OwnerRecord } from 'fluentui-extended';

const [owner, setOwner] = useState<OwnerRecord | null>(null);
<OwnerLookup label="Owner" types={['systemuser', 'team']} selectedOwner={owner} onOwnerSelect={setOwner} />;
// Save: { 'ownerid@odata.bind': `/${owner.type === 'team' ? 'teams' : 'systemusers'}(${owner.id})` }
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `selectedOwner` / `onOwnerSelect` | `OwnerRecord \| null` | - | Controlled single select |
| `multiSelect` | `boolean` | `false` | With `selectedOwners`, `onOwnersSelect`, `maxSelection` |
| `types` | `('systemuser' \| 'team')[]` | `['systemuser']` | Both → All/Users/Teams header |
| `owners` | `OwnerRecord[]` | - | Static roster, no queries, client filtering |
| `onSearch` | `(text) => Promise<OwnerRecord[]> \| OwnerRecord[]` | - | Replaces built-in queries |
| `searchTop` / `includeDisabled` | `number` / `boolean` | `15` per type / `false` | |
| `presence` | `Record<string, PresenceBadgeStatus>` | - | By owner id; users only |
| `showHoverCard` | `boolean` | `true` | Users: `SystemUserCard`; teams: description, BU, admin |
| `additionalContact` / `cardActions` | `SystemUserContactItem[]` / `ReactNode` | - | |
| `onOwnerClick` | `(owner: OwnerRecord) => void` | - | Click on resolved name |
| `minSearchLength` / `searchDebounceMs` | `number` | `0` / `300` | `0` searches on focus |
| `placeholder` / `noResultsMessage` | `string` | `'Search users and teams...'` / `'No users or teams found'` | |
| `clearable` / `appearance` / `size` | | `true` / `'filled-darker'` / `'medium'` | |
| `label` / `validationMessage` / `required` / `disabled` / `onSearchError` | | - | No `readOnly` |

`OwnerRecord`: `id`, `name`, `type`, optional `jobtitle`, `email`, `phone`, `mobile`, `address`,
`businessUnit`, `isdisabled`, `description`, `administrator`.

**Dynamics behaviour.** Users and teams are queried in parallel, users first; one failing still
returns the other. Users: enabled interactive accounts only. Teams: `teamtype eq 0` (access and
AAD teams cannot own records). Options carry `entityName` = `owner.type`, so without
`onOwnerClick` a click opens the user/team form. Teams presence is not in the Web API - supply
`presence`. Same external-reset caveat as Lookup.

## AddressLookup

Preconfigured `Lookup` over Google Places with a map hover card; returns the address flattened
into columns. For address entry, not Dataverse records.

```tsx
import { AddressLookup, type PlaceAddress } from 'fluentui-extended';

const [address, setAddress] = useState<PlaceAddress | null>(null);
<AddressLookup apiKey={googleKey} label="Address" value={address} onSelect={(a) => setAddress(a)}
  countries={['nz', 'au']} stateShortName countryShortName />;
// Map to columns yourself: street → address1_line1, city → address1_city, postcode → address1_postalcode
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `apiKey` | `string` | required | Maps JavaScript API + Places API; origin allowed |
| `value` / `onSelect` | `PlaceAddress \| null` | - | `onSelect(address, place)`; `(null, null)` on clear |
| `formatValue` | `(a: PlaceAddress) => string` | one-line address | `(a) => a.street` for a street-only field |
| `countries` / `searchTypes` | `string \| string[]` / `string[]` | - / `['address']` | Max 5 countries; `['establishment']`, `['geocode']` |
| `stateShortName` / `countryShortName` | `boolean` | `false` | `NSW` / `AU` |
| `allowFreeText` | `boolean` | `false` | Typed text as an address (no place id/coordinates) |
| `unitPlacement` | `'building' \| 'street'` | `'building'` | Where "Level 5/135 ..." goes |
| `showMapCard` | `boolean` | `true` | Plus `mapCardTarget` (`'both'`), `mapCardDelayMs` (`400`), `mapZoom` (`15`), `cardActions` |
| `minSearchLength` | `number` | `3` | Google bills per request |
| `readOnly` | `boolean` | - | Prefer over `disabled` for a locked field |
| `footer` | `ReactNode` | count + "Powered by Google" | Keep the attribution in a replacement |
| `appearance` / `size` | | `'filled-darker'` / `'medium'` | |

`PlaceAddress`: `placeId, formattedAddress, building, street, suburb, city, state, postcode, country, latitude, longitude`.

## OptionSetField

Choice / Choices field: numeric values, options from metadata (local **and global** option sets),
multi-select picklists round-tripped. Use instead of Fluent `Dropdown` for any choice column.

```tsx
import { OptionSetField, formatMultiSelectValue } from 'fluentui-extended';

<OptionSetField label="Industry" entityName="account" attributeName="industrycode"
  value={record.industrycode} onChange={(v) => setIndustry(v as number | null)} />;

<OptionSetField label="Interests" entityName="contact" attributeName="new_interests" multiselect
  value={record.new_interests} // "1,2" or [1, 2]
  onChange={(v) => save({ new_interests: Array.isArray(v) ? formatMultiSelectValue(v) : null })} />;
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `options` | `OptionSetOption[]` | - | Absent/empty + `entityName`/`attributeName` → auto-load |
| `entityName` / `attributeName` | `string` | - | Metadata auto-load |
| `value` | `number \| number[] \| string \| null` | - | Accepts `"1,2"` |
| `onChange` | `(v: number \| number[] \| null) => void` | - | Emits numbers, never the string form |
| `multiselect` | `boolean` | `false` | Lower-case `s` (Lookup is `multiSelect`) |
| `clearable` | `boolean` | `true` | Single: re-picking the current option clears it |
| `placeholder` | `string` | `'---'` | Dynamics' empty display |
| `showColors` / `asBadge` | `boolean` | `false` | Metadata colour swatch / coloured pill |
| `appearance` | `FieldAppearance` | `'filled-darker'` | |
| `size` | `'small' \| 'medium' \| 'large'` | Combobox default (`medium`) | |
| `label` / `validationMessage` / `required` / `disabled` / `onLoadError` | | - | No `readOnly` |

`OptionSetOption`: `{ value: number; label: string; color?: string | null; disabled?: boolean;
parentValue?: number | null }`.

### Hierarchy

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `hierarchical` | `boolean` | `false` | Indent by `parentValue`; every level open |
| option `parentValue` | `number \| null` | - | Parent's value |
| `getParentValue` | `(o, all) => number \| null \| undefined` | - | For metadata-loaded options; beats `parentValue` |
| `selectableParents` | `boolean` | `true` | `false`: parents become headings |
| `showPath` / `pathSeparator` | `boolean` / `string` | `false` / `' › '` | |

```tsx
<OptionSetField entityName="product" attributeName="new_category" hierarchical showPath
  getParentValue={(o) => (o.value % 100 === 0 ? null : Math.floor(o.value / 10) * 10)}
  value={value} onChange={setValue} />
```

Dataverse choices carry no hierarchy; it always comes from the caller. If the hierarchy is real
data, model a self-referencing table and use a hierarchical `Lookup`.

### Dynamics behaviour

- **Global option sets** keep values on `GlobalOptionSet` and leave `OptionSet` empty; auto-load
  reads both. Hand-rolled metadata code that reads only `OptionSet` gets an empty list.
- **Multi-select picklists** are stored and written as `"1,2"`. `value` accepts that; `onChange`
  emits `number[]`, so serialize with `formatMultiSelectValue` before PATCH (`parseSelectedValues`
  goes the other way).
- Auto-load runs only when `options` is absent/empty; the control is disabled while loading.

## DateTimeField

Date / date-time / time picker that reads and writes per the column's `DateTimeBehavior`. Use for
every Dataverse DateTime column.

```tsx
import { DateTimeField } from 'fluentui-extended';

<DateTimeField label="Est. close date" behavior="DateOnly"
  value={record.estimatedclosedate} onChange={(stored) => save({ estimatedclosedate: stored })} />;
// stored === "2026-08-06", never an ISO timestamp
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `value` | `string \| Date \| null` | - | Pass the string Dynamics returns |
| `onChange` | `(value: string \| null, date: Date \| null) => void` | - | `value` serialized for `behavior` |
| `behavior` | `'UserLocal' \| 'DateOnly' \| 'TimeZoneIndependent'` | `'UserLocal'` | |
| `entityName` / `attributeName` | `string` | - | Read `behavior` from metadata; prop used until resolved |
| `showTime` | `boolean` | `false` | Ignored for `DateOnly` |
| `timeOnly` | `boolean` | `false` | Emits `"HH:mm"`; Date anchored to 1970-01-01 |
| `timeIntervalMinutes` / `timeFormat` | `number` / `'12h' \| '24h'` | `30` / `'24h'` | |
| `minTime` / `maxTime` | `string` (`HH:mm`) | - | |
| `allowFreeType` | `boolean` | `false` | Typed numeric dates read day-first per locale/`displayFormat` |
| `closeOnSelect` | `boolean` | `true` | `false` waits for Done |
| `displayFormat` / `formatDate` | `string` / `(d) => string` | locale | Tokens `YYYY MMMM MMM MM Do DD D dddd ddd HH hh h mm ss A a` |
| `showHint` | `boolean` | `false` | Behavior hint (never for UserLocal) |
| `placeholder` / `clearable` | `string` / `boolean` | `'Select a date...'` / `true` | |
| `appearance` / `size` | `FieldAppearance` / `'small' \| 'medium'` | `'filled-darker'` / `'medium'` | |
| `label` / `validationMessage` / `required` / `disabled` / `onLoadError` | | - | No `readOnly` |

### Dynamics behaviour

| Behavior | Stored as | `onChange` emits | Display |
| --- | --- | --- | --- |
| `UserLocal` | UTC instant | ISO UTC (`toISOString()`) | Browser timezone |
| `DateOnly` | Calendar date | `"YYYY-MM-DD"` | Never shifted |
| `TimeZoneIndependent` | Wall clock, no zone | `"YYYY-MM-DDTHH:mm:ss"` (no `Z`) | As entered |

- Drift trap: `new Date('2026-08-06')` is UTC midnight (the 5th west of UTC), and `toISOString()`
  on a local date shifts the day east of UTC. The field parses DateOnly/TimeZoneIndependent from
  string components - pass the raw stored string, not a `Date` you built with `new Date(str)`.
- `behavior` must match the column or values move. Unsure? Pass `entityName` + `attributeName`.
- Metadata sets `behavior` only, not whether time shows: set `showTime` for Date-and-Time columns.
- Exported helpers: `parseStoredValue(value, behavior)`, `formatStoredValue(date, behavior)`,
  `parseFreeFormDateTime(input, behavior, dayFirst?)`, `isDayFirst(displayFormat?, locale?)`.

## DateTimeRangeField

Start + end `DateTimeField` pair for "between" inputs, one callback with both.

```tsx
import { DateTimeRangeField } from 'fluentui-extended';

<DateTimeRangeField label="Booking window" behavior="UserLocal" showTime
  value={{ start: range.startValue, end: range.endValue }}
  onChange={({ startValue, endValue }) => setRange({ startValue, endValue })} />
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `value` | `{ start?: string \| Date \| null; end?: string \| Date \| null }` | - | |
| `onChange` | `(r: { startValue, endValue, startDate, endDate }) => void` | - | Strings + Dates |
| `startLabel` / `endLabel` | `string \| ReactElement` | `'Start'` / `'End'` | |
| `startPlaceholder` / `endPlaceholder` | `string` | `'Start date...'` / `'End date...'` | |
| `layout` | `'horizontal' \| 'vertical'` | `'horizontal'` | |
| other `DateTimeFieldProps` | | as DateTimeField | `behavior`, `showTime`, `size`, `appearance` go to both |

No start ≤ end check; validate and set `validationMessage` yourself. Pass `behavior` explicitly:
the combined state uses the prop (default `UserLocal`), not metadata.

## SystemUserPersona

Avatar + name + job title for a `systemuser`, with the Dynamics contact card on hover. Display
only; use `OwnerLookup` to pick.

```tsx
import { SystemUserPersona } from 'fluentui-extended';

<SystemUserPersona userId={row._ownerid_value}
  name={row['_ownerid_value@OData.Community.Display.V1.FormattedValue']} presence="available" />
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `userId` | `string` | - | Loaded **when the card opens**, not on mount |
| `user` | `SystemUserRecord` | - | Skip loading |
| `name` / `secondaryText` / `tertiaryText` | | from record | `tertiaryText` (e.g. BU) at `large` only |
| `imageUrl` | `string \| null` | record photo | `null` forces initials |
| `presence` | `PresenceBadgeStatus` | - | From the host; not in the Web API |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | |
| `avatarOnly` / `showSecondaryText` | `boolean` | `false` / `true` | Hide job title for stable row height |
| `showHoverCard` / `hoverCardDelayMs` | `boolean` / `number` | `true` / `500` | |
| `additionalContact` / `cardActions` | `SystemUserContactItem[]` / `ReactNode` | - | |
| `onClick` | `(user: SystemUserRecord) => void` | - | Fires only once the record is loaded or supplied |

- **Given only a `userId`, the user loads straight away** so the name shows at rest. Users are
  cached by id for the life of the page (`clearSystemUserCache()` resets it), so a column naming
  the same people requests each person once. Given a `name` as well, the load waits for the card.
  With neither `userId` nor `user`, nothing renders.

`SystemUserCard` (exported): the card body outside a popover. Props `user: SystemUserRecord |
null`, `loading: boolean`, `error: string | null` (required), `imageUrl?`, `presence?`,
`additionalContact?`, `actions?`.

## RecordHoverCard

Wrap any anchor (link, grid cell) to show a record card on hover, fetched lazily.

```tsx
import { Link } from '@fluentui/react-components';
import { RecordHoverCard } from 'fluentui-extended';

<RecordHoverCard entityName="account" recordId={row.accountid}
  columns={['accountnumber', 'telephone1']} actions={<Link onClick={open}>Open record</Link>}>
  <Link>{row.name}</Link>
</RecordHoverCard>
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `children` | `ReactElement` | required | Anchor |
| `entityName` / `recordId` | `string` | - | Required for Web API load |
| `columns` | `string[]` | primary name only | Raw `$select` names |
| `record` | `RecordHoverCardRecord` | - | `{ title, subtitle?, details?, icon?, data? }`; skips loading |
| `mapRecord` | `(raw) => RecordHoverCardRecord` | - | Shape the card yourself |
| `hoverDelayMs` | `number` | `400` | `hoverDelayMs` here, `hoverCardDelayMs` on Lookup |
| `actions` | `ReactNode` | - | Footer |
| `disabled` / `open` / `onLoadError` | | - | Disable keeping markup / force open |

- Fetch: `<EntitySetName>(<id>)?$select=<primary name>,<columns>`; labels from attribute metadata
  (cached). Result cached per anchor; failures retry.
- `columns` go straight into `$select`: a lookup column must be `_primarycontactid_value`, not
  `primarycontactid`.
- Formatted values are requested (`Prefer: odata.include-annotations`), so lookup and choice
  columns show their names and labels, not GUIDs and numbers.
