# Grids, queries and commands

Four components. Pick by where the rows come from:

| Need | Use |
| --- | --- |
| Rows you already hold (fetched, computed, staged) – editable, virtualised, spreadsheet-style | `DataGrid` |
| Read-only subgrid that fetches its own rows from the Dataverse Web API | `EntityGrid` (**beta**) |
| Advanced Find-style filter editor producing FetchXML / OData | `QueryBuilder` |
| A Dynamics command bar with overflow into "More commands" | `CommandBar` |

All import from `'fluentui-extended'`. Wrap the app in `FluentProvider` (see layout.md).

---

## DataGrid

Bring-your-own-rows grid on TanStack Table + TanStack Virtual. Fetching and saving stay in your code. Handles virtualisation, inline editors chosen by `dataType`, column drag/resize/hide, grouping with subtotals, filtering, footer totals, layout persistence, row drag, fill handle, keyboard navigation.

Optional peer deps – install only when you use `DataGrid` (EntityGrid also imports `@tanstack/react-virtual`):

```bash
npm install @tanstack/react-table @tanstack/react-virtual @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Minimal example: staged edits

```tsx
import * as React from 'react';
import { DataGrid, type DataGridColumn } from 'fluentui-extended';

type Line = { id: string; name: string; status: number | null; qty: number; sell: number; gp: number };

export function Lines({ rows }: { rows: Line[] }) {
  const [pending, setPending] = React.useState<Record<string, Partial<Line>>>({});

  // Both MUST be referentially stable – memoise them.
  const columns = React.useMemo<DataGridColumn<Line>[]>(() => [
    { key: 'name', label: 'Product', editable: true, flex: 1 },
    { key: 'status', label: 'Status', dataType: 'choice', editable: true, groupable: true,
      choices: [{ value: 1, label: 'Open', color: '#0b6a0b' }, { value: 2, label: 'Closed' }] },
    { key: 'qty', label: 'Qty', dataType: 'integer', editable: true, summary: 'sum', width: 70 },
    { key: 'sell', label: 'Sell', dataType: 'money', editable: true, summary: 'sum', prefix: '$' },
    { key: 'gp', label: 'GP', dataType: 'percent', precision: 1 },
  ], []);
  const data = React.useMemo(() => rows, [rows]);

  return (
    <DataGrid<Line>
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      getCellValue={(_row, key, rowId, base) =>
        (pending[rowId] as Record<string, unknown> | undefined)?.[key] ?? base}
      onCellChange={(_row, key, value, rowId) =>
        setPending((p) => ({ ...p, [rowId]: { ...p[rowId], [key]: value } }))}
      getRowState={(_row, rowId) => (pending[rowId] ? 'dirty' : null)}
      selectable
      persist={{ scope: 'quote-lines' }}
    />
  );
}
```

### Column definition (`DataGridColumn<T>`)

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `key` | `string` | required | Column id and row property read. Dotted keys (`'product.name'`) read nested objects. Must not be `__select__` / `__drag__` (`RESERVED_COLUMN_IDS`) |
| `label` / `description` | `string` | `key` / `label` | Header text / header tooltip |
| `dataType` | `DataGridDataType` | string behaviour | Drives alignment, formatter, editor, sort, aggregation |
| `width` / `minWidth` / `maxWidth` | `number` | `140` | px |
| `flex` | `number` | – | Share of leftover width (never shrinks below `width`) |
| `align` | `'left'\|'center'\|'right'` | right for numerics, centre for booleans | |
| `editable` | `boolean` | `false` | Also needs grid-level `onCellChange` and not `readOnly` |
| `sortable` / `filterable` / `movable` / `resizable` | `boolean` | `true` | |
| `groupable` | `boolean` | `false` | Offered in the group-by menu |
| `defaultVisible` | `boolean` | `true` | `false` = hidden until the user shows it |
| `hidden` | `boolean` | – | Never rendered, never offered |
| `pin` | `'left'\|'right'` | – | |
| `summary` | `'sum'\|'avg'\|'count'\|'min'\|'max'` or `(rows, {readValue, rowIds}) => unknown` | – | Footer + group subtotals; function reads effective (edited) values |
| `columnGroup` | `string` | – | Heading in the column picker |
| `choices` / `choiceAsBadge` | `DataGridChoice[]` / `boolean` | – / `true` | `choice` columns |
| `precision` | `number` | 2 for money/decimal/percent, else 0 | Decimal places |
| `negativeIsRed` | `boolean` | `true` for `money` | |
| `maxLength` | `number` | – | Text editor limit |
| `prefix` / `suffix` | `ReactNode \| (ctx) => ReactNode` | – | Affixes (see below) |
| `booleanDisplay` / `booleanLabels` | `'checkbox'\|'icon'` / `{on, off}` | checkbox when editable, icon when not | |
| `computed` | `{ value(ctx), persist?, persistAs?, onEdit? }` | – | Calculated column; `ctx.get/num` read effective values. Read-only unless `onEdit` returns fields to write |
| `accessor` | `(row) => unknown` | – | Reads stored record only (does not follow edits; use `computed` for that) |
| `format` | `(value, row) => string` | – | Overrides the data-type formatter |
| `renderCell` | `(ctx) => ReactNode` | – | Takes over the cell; **suppresses the built-in editor and affixes** |
| `renderHeader` | `(column) => ReactNode` | – | |
| `getCellState` / `getCellTooltip` / `isCellReadOnly` / `isCellDirty` | `(ctx) => …` | – | Per-cell state / hover text / lock / dirty outline |
| `fillable` | `boolean` | `true` when editable, except lookups | Fill-handle per column |
| `tanstack` | `Partial<ColumnDef>` | – | Raw TanStack options merged last |
| Lookup / image fields | | | See sections below |

`DataGridCellContext<T>` handed to every callback: `{ value, row, rowId, column, tableRow, readOnly }` – `value` is already through `getCellValue`.

### dataTypes and what they render

| `dataType` | Display | Editor (when `editable`) | Value passed to `onCellChange` |
| --- | --- | --- | --- |
| `string` (default) | text | plain `<input>` | string |
| `multiline` | text | memo editor | string |
| `integer` / `decimal` / `money` / `percent` | `Intl` formatted (grouped); `percent` appends `%` unless it has a `suffix` | plain `<input>` (numeric chars only), showing the value at the column's precision, ungrouped | number (`integer` truncated), `null` when blank |
| `boolean` | tick/cross icon | checkbox | boolean |
| `date` / `datetime` | `toLocaleDateString` / `toLocaleString` | library `DateTimeField` (`DateOnly` / `UserLocal`, free typing, clear ×) | `'YYYY-MM-DD'` / ISO UTC string, or `null` (clear) |
| `choice` | `OptionSetField` badge | same control, enabled | number (option value) or `null` |
| `lookup` | `Lookup` pill / persona | `Lookup` picker (needs `searchLookup`) | option `key` (id) or `null`, unless `onLookupSelect` |
| `image` | thumbnail + hover preview | none | – |
| any, blank value | em dash | – | – |

### Editing and unsaved-edit layering

| Prop | Signature | Default |
| --- | --- | --- |
| `onCellChange` | `(row, columnKey, value, rowId) => void` | – (omit = read-only grid) |
| `getCellValue` | `(row, columnKey, rowId, baseValue) => unknown` | column's own value |
| `readOnly` | `boolean` | `false` |
| `getRowState` | `(row, rowId) => state \| state[] \| null` | – |
| `rowStates` / `cellStates` | `Record<string, style>` | built-in set |
| `renderRowIndicator` | `(row, rowId) => ReactNode` | – |
| `showEditableHints` | `boolean` | `false` (underlines editable cells) |
| `onFill` | `(fill: DataGridFill<T>) => void` | – (else one `onCellChange` per row) |
| `fillHandle` / `keyboardNavigation` | `boolean` | `true` / `true` (dragging scrolls at the grid's edges; double-clicking the handle fills every shown row below, overwriting) |

- Write the one-liner `(row, key, rowId, base) => pending[rowId]?.[key] ?? base` – falling back to `baseValue` keeps `accessor` and `computed` columns working. Sorting, filtering, grouping and totals all read through `getCellValue`.
- Row states: `'default'|'selected'|'dirty'|'new'|'muted'|'error'|'deleted'|'placeholder'`. Return an array to layer (later wins per field); selection is drawn last.
- Cell states: `'default'|'dirty'|'warn'|'error'|'good'|'override'|'muted'`. Custom names via `cellStates` / `rowStates` (use Fluent `tokens` so dark theme follows).
- `isCellDirty` outlines the single changed cell (yellow); `getRowState` 'dirty' tints the row. Use both.
- Editors stay mounted, hold a local draft while focused, and commit on blur / Enter / Tab. Escape cancels. Moving through cells without typing stages nothing.
- Number cells edit at the decimal places they display (`precision`), without grouping (`1287.50`, not `1,287.50`). Opening and leaving a number cell untouched writes nothing back, so a stored `13.043478` is not rounded to `13.04` by being looked at; only a typed change commits.
- Number/text editors show an ellipsis when the value is wider than the column (as read-only cells do).
- For large drags, implement `onFill` – a 1000-row fill via `onCellChange` is 1000 state updates.

### Choice columns

```ts
{ key: 'statuscode', label: 'Status', dataType: 'choice', editable: true,
  choices: [{ value: 1, label: 'Active', color: '#0b6a0b' }, { value: 2, label: 'Inactive' }] }
```

- The editor coerces `choice.value` with `Number()` (Dataverse option values are ints). **Use numeric values**; string values like `'open'` break the editor (they still display).
- No `choices` → falls back to plain text.
- `choiceAsBadge: false` renders a plain label instead of the coloured pill.

### Lookup columns

| Field | Purpose |
| --- | --- |
| `getLookupValue(ctx) => { id, text, entity?, secondaryText? } \| null` | **Required to show a name.** Without it a stored id renders as raw text (read-only) or as an empty picker (editable) |
| `searchLookup(text, ctx) => Promise<DataGridLookupOption[]>` | Makes the cell a picker. Runs after **2** typed characters, debounced 300 ms, stale results discarded. Option: `{ key, text, secondaryText?, icon?, data? }` |
| `lookupMinSearch` | Characters typed before `searchLookup` runs; default 2. `0` lists options when the dropdown opens, with `text` empty: for a short list the row narrows. Runs only while that cell's dropdown is open |
| `onLookupSelect(option \| null, ctx)` | Replaces the default commit (`onCellChange(row, key, option.key)`); use it to also write denormalised columns from `option.data` |
| `lookupHeader` / `lookupFooter` | `ReactNode \| (ctx, search) => ReactNode`; `null` hides. Defaults: column label / "Type at least 2 characters to search", "Searching…", "N records", "No matching records". `search = { text, minLength, searching, results }` |
| `lookupEntity` | Entity a resolved value opens / hover card targets |
| `onRecordClick(value, ctx)` | Makes the pill clickable (e.g. `Xrm.Navigation.openForm`) |
| `persona` / `getPersonaUser` | Render as avatar + name; only when target entity is `systemuser` |
| `hoverCard` / `hoverCardColumns` / `hoverCardDelayMs` (500) / `renderHoverCard` | Record card on hover; `renderHoverCard` for non-Dataverse data |

```ts
{
  key: 'productId', label: 'Product', dataType: 'lookup', editable: true, lookupEntity: 'product',
  getLookupValue: (ctx) => {
    const p = catalogue.find((x) => x.id === ctx.value);
    return p ? { id: p.id, text: p.name, secondaryText: p.code } : null;
  },
  searchLookup: async (text) => (await searchProducts(text))
    .map((p) => ({ key: p.id, text: p.name, secondaryText: p.code, data: p })),
  onLookupSelect: (opt, ctx) => {
    stage(ctx.rowId, 'productId', opt?.key ?? null);
    stage(ctx.rowId, 'productName', opt?.text ?? '');
  },
  lookupFooter: (_ctx, s) => <Button size="small" onClick={() => createProduct(s.text)}>+ New product</Button>,
}
```

Lookups filter and sort by their displayed name, not the id. Fill handle is off for lookups (it would copy only the id).

### Dataverse-backed columns

`useEntityColumns({ entityName, columns?, loadChoices = true, enabled = true, onError })` builds typed, labelled columns from metadata and returns `{ columns, entity, attributes, loading, error, select, expand, primaryImageAttribute }`. Lookups are keyed `_name_value` (the Web API returns nothing for the bare name), get `getLookupValue` reading the `FormattedValue` annotation or `$expand`, and system person columns (`createdby`, `modifiedby`, …) get persona + hover card. `editable` comes from `IsValidForUpdate`. Query with `Prefer: odata.include-annotations="*"` (exported as `INCLUDE_ANNOTATIONS`) so names arrive. `dataverseCellValue(row, key)` / `dataverseFormattedValue(row, key)` read Dataverse rows.

### Affixes

`prefix` / `suffix` render as plain muted text (`colorNeutralForeground3`, no box or background) in non-shrinking slots hard against the cell edges, so the unit never eats digits. Function form gets the cell ctx (unit from another column):

```ts
{ key: 'margin', dataType: 'percent', suffix: (ctx) => (ctx.row.isMarkup ? 'mk%' : '%') }
```

- A `percent` column **with a `suffix`** does not also print its own `%` (avoids "2.5% %"). Without a suffix the formatter appends `%`.
- An empty-string affix counts as none.
- `renderCell` bypasses affixes.

### Sorting, filtering, grouping, toolbar

| Prop | Type | Default |
| --- | --- | --- |
| `defaultSorting` / `onSortingChange` | TanStack `SortingState` | `[]` |
| `showFilters` / `defaultShowFilters` / `onShowFiltersChange` | `boolean` | `false` (filter row) |
| `globalFilter` | `string` | – |
| `searchColumns` | `string[]` | all visible columns |
| `searchable` | `boolean` | `true` when `searchColumns` or `renderToolbarSearch` is set and no `toolbar` |
| `searchPlaceholder` / `renderToolbarSearch({value,onChange})` | | – |
| `groupBy` / `defaultGroupBy` / `onGroupByChange` | `string \| string[] \| null` (array nests, outermost first) | `null` |
| `renderGroupLabel(value, rows, depth)` / `renderGroupHeader(ctx)` / `groupContextMenu(ctx)` / `onGroupDoubleClick(ctx)` | | – |
| `groupSelection` | `boolean` | `false` |
| `groupSubtotals` | `boolean \| string[]` | `false` |
| `groupSubtotalsMinGroups` / `groupSubtotalLevels` | `number` / `'all'\|'innermost'` | `1` / `'all'` |
| `includeInSummary(row, rowId)` | `boolean` | – (exclude from totals but still render) |
| `toolbar` | `ReactNode` | built-in (replaces it) |
| `toolbarItems` / `toolbarItemsPlacement` | `CommandBarItem[]` / `'start'\|'end'` | – / `'end'` |
| `toolbarSearchOrder` / `toolbarSearchAlign` | `number` / `'left'\|'right'` | `100` / `'right'` |
| `statusBar` / `statusBarExtra` | `boolean` / `ReactNode` | `true` |
| `footerSummary` | `boolean` | `true` when any column has `summary` |
| `loading` / `loadingMessage` / `error` / `emptyMessage` | | `false` / `'Loading…'` / – / `'No rows to show.'` |

Prefer `toolbarItems` over `toolbar`: the built-in bar already carries filters (order 10), group (20), columns (30), density (40), reset (50) and search (100). Each column menu has a Dynamics-style **Filter by** panel (operator + value, Apply/Clear).

### Selection, rows, events

| Prop | Type | Default |
| --- | --- | --- |
| `getRowId` | `(row, index) => string` | array index – **always supply it** |
| `selectable` / `multiSelect` | `boolean` | `false` / `true` (Shift/Ctrl) |
| `selectedRowIds` / `onSelectionChange` | `Set<string> \| string[]` / `(Set<string>) => void` | uncontrolled |
| `onRowReorder(move)` | enables drag handle; `move = { rowIds, rows, overRowId, toIndex, toGroup, droppedOnGroupHeader }` | – |
| `rowContextMenu` | `CommandBarItem[] \| (row, rowId, selectedIds) => CommandBarItem[]` | – |
| `cellContextMenu(ctx)` | `CommandBarItem[] \| null` | – |
| `onRowClick` / `onRowDoubleClick` / `onRowContextMenu` | `(row, rowId, event) => void` | – |
| `onActiveCellChange` | `(cell: {rowId, columnKey} \| null) => void` | – |
| `reorderableColumns` / `columnMenu` / `autoFit` | `boolean` | `true` / `true` / `true` |
| `columnVisibility` / `onColumnVisibilityChange` / `forceHiddenColumns` | | – |
| `striped` | `boolean` | `false` |
| `tanstack` | `Partial<TableOptions<T>>` | – |

### Density and persistence

- `density` / `defaultDensity` / `onDensityChange`: `'compact' | 'comfortable' | 'spacious'`, default `'comfortable'`. Row heights 22 / 28 / 36 px, font 11 / 12 / 13 px (`DENSITY_METRICS`). Embedded controls are pinned to the density height.
- `persist={{ scope, storage?, facets? }}` stores under `datagrid:<origin>:<scope>:<facet>`. Facets: `'order'|'sizing'|'visibility'|'density'|'sorting'|'grouping'` (default all). `storage` defaults to `localStorage`; `null` disables. Restored during first render (no reflow). New columns are appended; removed ones dropped. Changing `scope` loads that scope's layout.
- Imperative handle via `ref` (`DataGridHandle<T>`): `getLayout()`, `applyLayout(partial)`, `resetLayout()`, `resetColumnWidths()`, `scrollToRow(id, align?)`, `scrollToTop()`, `highlightRow(id, {durationMs?})`, `focusColumnFilter(key)`, `table`.
- Headless: `useDataGrid(options)` returns the TanStack table and state; `DataGridCell`, `DataGridHeaderCell`, `DataGridBodyRow`, `DataGridGroupRow`, `useDataGridStyles` are exported.

### Cells: draw values, not fields

The built-in editors – lookup, choice, date, number/text – render as **plain values inside the cell**: no field fill, no border, no underline. The cell itself carries the single focus ring and the white fill while active, the way a Dynamics editable grid does. From `DataGrid.styles.ts`:

| Class | What it does |
| --- | --- |
| `cell` `:focus-within` | White fill (`colorNeutralBackground1`) + 2px brand outline inset `-2px`. The only ring |
| `cellActive` | Same outline on the keyboard-active cell even without DOM focus |
| `editorInput` | Text/number `<input>`: no border, no outline, transparent background, inherits font/alignment, `text-overflow: ellipsis`, spinners hidden |
| `affix` | Unit text in `colorNeutralForeground3`, no fill or border |
| `inline` (on the field) | Lookup, choice and date editors are rendered with the components' own `inline` prop: no fill, border or underline in rest, hover or focus; the chevron and date buttons show on hover/focus |
| `choiceAtRest` | Grid-only: the choice badge's inset set to 2px, level with text in neighbouring cells |
| `editorControl` | Pins embedded controls to `--fue-grid-control-height` and the grid font size |

Rules that follow:

- **Prefer the built-in `dataType`s** (`'lookup'`, `'choice'`, `'date'`, `'datetime'`, numerics) over a `renderCell`. The built-in editors are the library's own `Lookup`, `OptionSetField` and `DateTimeField` rendered with `inline`, which drops their fill, border and underline in every state so the cell's ring is the only one. A `renderCell` holding one of those components must pass `inline` itself, or it keeps its form styling – a "window inside a window" with two focus indicators.
- `renderCell` also drops the built-in editor, affixes and the dirty outline. Use it for display-only content.
- If a custom `renderCell` is unavoidable: render plain text or a Fluent `Badge`, or a library field with `inline` and `size="small"`, and do not add borders, backgrounds, outlines or padding of your own – the cell already supplies the ring, fill and 8px side padding.
- Business-rule colouring belongs in `getCellState` / `cellStates`, not in a `renderCell` background.

### Dynamics behaviour / gotchas

- `data` and `columns` must be referentially stable (`useMemo`). A new array each render rebuilds the table and discards scroll, sort, filters and selection.
- `getRowId` is effectively required: the index fallback breaks selection and virtualisation once rows move.
- Text sorts case-insensitively in natural number order, ascending first. Keys: arrows, Enter/Shift+Enter, Tab/Shift+Tab, F2, type-to-replace, Escape.
- Money columns from `useEntityColumns` get a hard-coded `'$'` prefix; override per column if the org currency differs.

---

## EntityGrid (beta)

Web API-backed read-only subgrid: give it an entity and column logical names, it pages and sorts server-side. Marked **beta** – the only unstable component. Use `DataGrid` instead for editing, grouping, or rows you already have.

```tsx
import { EntityGrid } from 'fluentui-extended';

<EntityGrid
  entityName="account"
  title="Active accounts"
  filter="statecode eq 0"
  height={420}
  selectable
  columns={[
    { name: 'name', width: 260 },
    { name: 'accountnumber' },
    { name: '_primarycontactid_value', label: 'Primary Contact' },
  ]}
  onRecordOpen={(id) => Xrm.Navigation.openForm({ entityName: 'account', entityId: id })}
/>
```

| Prop | Type | Default |
| --- | --- | --- |
| `entityName` | `string` | required |
| `columns` | `EntityGridColumn[]` (`{ name, label?, width?, sortable? = true, render?(formatted, record) }`) | primary name only |
| `filter` | OData `$filter` string | – |
| `defaultSort` | `{ column, direction: 'asc'\|'desc' }` | primary name asc |
| `pageSize` | `number` | `25` paged, `50` otherwise |
| `loadMode` | `'paged'\|'infinite'\|'manual'` | `'paged'` |
| `height` | `number \| string` | – (required for `infinite` / `manual`) |
| `estimatedRowHeight` / `overscan` / `loadThreshold` | `number` | `36` / `5` / `0.8` |
| `title` / `commands` | `ReactNode` | – |
| `selectable` / `onSelectionChange(ids: string[])` | | `false` |
| `onRecordOpen(id, record)` | row click or Enter | – |
| `emptyMessage` / `onLoadError(error)` | | `'No records found'` |
| `enableColumnResize` / `enableColumnPinning` | `boolean` | `false` |
| `onColumnsChange(state)` / `defaultColumnState` | `ColumnState[]` (`{ name, visible, pinned, width? }`) | – |

Dynamics behaviour:

- Uses `webApiGet` (honours `setWebApiBaseUrl` / `setWebApiFetch`). Paging uses `Prefer: odata.maxpagesize=N` and follows `@odata.nextLink`; Previous replays stored URLs. `$count=true` on the first page only.
- Requests `FormattedValue` annotations; cells prefer them, so option sets show labels and lookups show names.
- **Lookup columns** may be named by logical name (`primarycontactid`): the grid reads attribute metadata, requests `_primarycontactid_value` and shows its formatted name, with the label from metadata. A name already in `_x_value` form is used as-is; give it an explicit `label`, as metadata is matched by logical name.
- `filter` and `name`s are inserted into the URL unencoded – build them with proper OData escaping.
- `columns` are compared by content (`name`, `label`, `width`, `sortable`), so inline arrays do not refetch; changing `filter`, sort or `pageSize` reloads from page one and clears selection.
- `enableColumnVisibility` exists in the types but is not implemented.
- Pair with QueryBuilder: pass `result.odataFilter` as `filter` (only when `result.odataUnsupported` is empty).

---

## QueryBuilder

Advanced Find-style editor: AND/OR groups, related-entity (link-entity) conditions, FetchXML import/edit/download, live OData/FetchXML preview, validation against the Web API.

```tsx
import { QueryBuilder, type QueryBuilderApplyResult } from 'fluentui-extended';

<div style={{ height: 500, display: 'flex', flexDirection: 'column' }}>
  <QueryBuilder
    entityName="account"
    entityDisplayName="Accounts"
    initialFetchXml={savedFetchXml}
    title={false}
    onSerializedChange={(r: QueryBuilderApplyResult) => {
      setFetchXml(r.fetchXml);
      setOData(r.odataUnsupported.length === 0 ? r.odataFilter : null);
    }}
  />
</div>
```

| Prop | Type | Default |
| --- | --- | --- |
| `entityName` | `string` | required |
| `entitySetName` / `entityDisplayName` | `string` | fetched / – |
| `title` | `ReactNode \| false` | `"Query Builder: {entityDisplayName \|\| entityName}"` |
| `fields` | `QueryBuilderField[]` | loaded from metadata |
| `relatedEntities` | `QueryBuilderRelatedEntity[]` | auto from lookup fields' `targets` |
| `initialState` / `initialFetchXml` / `defaultState` | | – (`defaultState` is what Reset restores) |
| `distinct` / `noLock` / `top` | `boolean` / `boolean` / `number` | `true` / `false` / – (props override imported values) |
| `appearance` | `FieldAppearance` | `'filled-darker'` |
| `allowGroups` / `allowRelatedEntity` | `boolean` | enabled unless `false` |
| `showODataPreview` / `showFetchXmlPreview` | `boolean` | `false` (initial visibility) |
| `showPreviewToggleButtons`, `showResetToDefaultButton`, `showDownloadFetchXmlButton`, `showUploadFetchXmlButton`, `showEditFetchXmlButton`, `showValidateButton`, `showDeleteAllFiltersButton` | `boolean` | shown unless `false` |
| `onStateChange(state)` | every state change | – |
| `onSerializedChange(result)` | debounced 150 ms | – |
| `onLookupSearch(fieldId, text)` | `Promise<{key, text, secondaryText?}[]> \| …[]` | – |
| `onFetchEntityFields(entityLogicalName)` | `Promise<QueryBuilderField[]>` – replaces metadata fetch for related entities | – |
| `onResetToDefault(state)` / `onDeleteAllFilters()` | | – |
| `onTrace(message, data?)` / `debug` | | – / `false` |

`QueryBuilderField`: `{ id, label, dataType: 'string'|'number'|'datetime'|'boolean'|'optionset'|'lookup', attributeType?, options?: {label, value}[], schemaName?, targets?: QueryBuilderLookupTarget[] }`.

`QueryBuilderApplyResult`: `{ state, fetchXmlFilter, fetchXml, odataFilter, odataQuery?, odataUnsupported: { fieldId, fieldLabel, operator, operatorLabel }[] }`.

### Programmatic helpers (exported from the root)

| Function | Signature |
| --- | --- |
| `serializeQueryBuilderState` | `(state, fields, entityName, entitySetName?) => QueryBuilderApplyResult` |
| `parseFetchXmlToState` | `(xml, fields) => { state: QueryBuilderState \| null; error: string \| null }` |
| `validateQueryBuilderState` | `(state, fields) => { isValid; errors: { groupId, conditionId, fieldLabel, message }[]; apiValidation? }` |
| `validateFetchXmlSyntax` | `(xml) => { valid: boolean; error?: string }` |

```ts
import { parseFetchXmlToState, serializeQueryBuilderState, validateQueryBuilderState } from 'fluentui-extended';

const parsed = parseFetchXmlToState(xml, fields);
if (!parsed.state) throw new Error(parsed.error ?? 'Bad FetchXML');
const check = validateQueryBuilderState(parsed.state, fields);
if (check.isValid) {
  const { fetchXml, odataFilter, odataUnsupported } = serializeQueryBuilderState(parsed.state, fields, 'account', 'accounts');
}
```

`parseFetchXmlToState` uses `DOMParser` (browser / jsdom only). `odataQuery` is only filled when `entitySetName` is passed.

### Dynamics behaviour

- **Metadata, lookup search and validation go through the shared Web API client**, so `setWebApiBaseUrl` / `setWebApiFetch` apply as they do everywhere else. Pass `fields` (and `onFetchEntityFields`, `onLookupSearch`) to avoid network calls altogether.
- Relative dates, fiscal periods, user-context (`eq-userid`) and hierarchy (`under`, `above`) operators cannot be expressed in OData. They are left out of `odataFilter` and listed in `odataUnsupported`; when that is non-empty, run `fetchXml`, not the OData.
- "Contains" serialises as FetchXML `like` with `%` wildcards.
- `distinct` defaults to `true` (matches Advanced Find; matters with link-entities).
- Boolean fields from metadata use the org's labels with values `'1'` / `'0'`.
- `initialFetchXml` is parsed once, after fields load; later changes to the prop are ignored.
- Scrolling: header and toolbar stay pinned only when the parent constrains height; otherwise it grows.
- Validate runs `$filter=…&$top=1&$count=true` against the entity set and shows the count or the API error.

---

## CommandBar

Dynamics-style command bar built from Fluent `Toolbar` + `Overflow`. Commands that do not fit move into a "More commands" menu (widths measured from the DOM). Use it for form/grid commands; DataGrid's toolbar is built on it.

```tsx
import { CommandBar } from 'fluentui-extended';
import { AddRegular, DeleteRegular, SaveRegular } from '@fluentui/react-icons';

<CommandBar
  items={[
    { key: 'save', text: 'Save', icon: <SaveRegular />, appearance: 'primary', onClick: save },
    { key: 'new', text: 'New', icon: <AddRegular />, onClick: add },
    { key: 'delete', icon: <DeleteRegular />, title: 'Delete', description: 'Removes the selected lines.',
      dividerBefore: true, disabled: selected.size === 0, onClick: remove },
    { key: 'export', text: 'Export', subItems: [{ key: 'xlsx', text: 'Excel', onClick: exportXlsx }] },
  ]}
  farItems={[{ key: 'refresh', text: 'Refresh', onClick: refresh }]}
/>
```

| `CommandBarProps` | Type | Default |
| --- | --- | --- |
| `items` | `CommandBarItem[]` | required |
| `farItems` | `CommandBarItem[]` – right group, never collapses | – |
| `size` | `'small'\|'medium'\|'large'` | `'small'` |
| `overflowAriaLabel` | `string` | `'More commands'` |
| `disableOverflow` | `boolean` – scroll instead of collapsing | `false` |
| `className` | `string` | – |

| `CommandBarItem` | Notes |
| --- | --- |
| `key` | required, unique |
| `text` / `icon` (`ReactElement`) | icon-only needs `title` |
| `title` / `description` (`ReactNode`) / `tooltip` (`ReactElement`) | precedence `tooltip` > `title`+`description` > `title`. Icon-only + plain `title` uses `relationship="label"`; labelled commands use `description` |
| `onClick` / `disabled` / `checked` | `checked` renders a toggle |
| `appearance` | `'primary'\|'subtle'\|'transparent'` |
| `subItems` / `menuContent` | menu button; `menuContent` (rendered inside the `MenuPopover`, for `MenuItemRadio` etc.) wins |
| `pinned` | never overflows; clipped if it does not fit |
| `dividerBefore` | divider before the item |
| `content` | arbitrary node instead of a button (no tooltip); pair with `pinned` |
| `order` / `align` (`'left'\|'right'`) | ordering within a section; `right` joins `farItems` |
| `buttonStyle` | inline style on the button |

In the overflow menu a `title`-only tooltip is suppressed (the row shows that text already).
