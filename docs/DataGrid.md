# DataGrid

A virtualised, editable data grid built on [TanStack Table](https://tanstack.com/table) and [TanStack Virtual](https://tanstack.com/virtual), styled to sit beside a Dynamics 365 read-only grid on a form.

```tsx
import { DataGrid, type DataGridColumn } from 'fluentui-extended';

const columns: DataGridColumn<QuoteLine>[] = [
  { key: 'productCode', label: 'Code', width: 110 },
  { key: 'productName', label: 'Product', width: 240, editable: true },
  { key: 'category', label: 'Category', groupable: true },
  { key: 'quantity', label: 'Qty', dataType: 'integer', editable: true, summary: 'sum' },
  { key: 'sellEx', label: 'Sell ex', dataType: 'money', editable: true, summary: 'sum' },
];

<DataGrid
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}
  onCellChange={stageEdit}
  selectable
  persist={{ scope: 'quote-lines' }}
/>;
```

The grid renders only the rows in view. Two thousand rows mount as roughly thirty `<tr>` elements, and the scrollbar still reflects the whole set.

## What it handles

| | |
|---|---|
| **Virtualisation** | Row windowing with spacer rows, re-measured on density change |
| **Columns** | Drag to reorder, drag the right edge to resize, right-click for a menu, show/hide |
| **Grouping** | One-column grouping with sticky banners, counts, and optional subtotals |
| **Filtering** | A per-column filter row plus a `globalFilter` for free text |
| **Sorting** | Ascending first, whatever the data type |
| **Editing** | Inline editors chosen by data type, with unsaved-edit layering |
| **Density** | `compact` / `comfortable` / `spacious` |
| **Persistence** | Order, widths, visibility, density, sort and grouping, scoped per grid and per org |
| **Aggregation** | A sticky footer of column totals, and per-group subtotals |
| **Rows** | Selection, drag reorder, and visual states for dirty, new, error and muted |

## Peer dependencies

The grid libraries are **optional** peer dependencies. Install them only if you use `DataGrid`:

```bash
npm install @tanstack/react-table @tanstack/react-virtual \
            @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Nothing else in the package imports them, so a consumer using only `Lookup` or `CommandBar` ships none of it.

## Columns

```ts
interface DataGridColumn<T> {
  key: string;              // column id, and the row property read
  label?: string;
  dataType?: 'string' | 'multiline' | 'integer' | 'decimal' | 'money' | 'percent'
           | 'boolean' | 'date' | 'datetime' | 'choice' | 'lookup';
  width?: number;           // default 140
  align?: 'left' | 'center' | 'right';
  editable?: boolean;
  groupable?: boolean;
  sortable?: boolean;       // default true
  filterable?: boolean;     // default true
  summary?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  choices?: DataGridChoice[];
  defaultVisible?: boolean;
  accessor?: (row: T) => unknown;
  format?: (value: unknown, row: T) => string;
  renderCell?: (ctx: DataGridCellContext<T>) => React.ReactNode;
  getCellState?: (ctx: DataGridCellContext<T>) => DataGridCellState | null;
  isCellReadOnly?: (ctx: DataGridCellContext<T>) => boolean;
}
```

`key` may be dotted, so `'product.name'` reads through an expanded record without an accessor.

`dataType` drives four things at once: alignment, the display formatter, the inline editor, and how `summary` aggregates. Setting it is usually enough; reach for `format` or `renderCell` only where a column is genuinely special.

## Unsaved edits

Most grids in a Dynamics app stage changes rather than writing each keystroke. Pass `getCellValue` to layer pending edits over the stored record:

```tsx
<DataGrid
  data={rows}
  columns={columns}
  getRowId={(row) => row.id}
  getCellValue={(row, key, rowId) =>
    pending[rowId]?.[key] !== undefined ? pending[rowId][key] : row[key]
  }
  onCellChange={(row, key, value, rowId) => stage(rowId, key, value, row)}
  getRowState={(_, rowId) => (pending[rowId] ? 'dirty' : null)}
/>
```

Sorting, filtering, grouping and the footer totals all read through `getCellValue`. Without it the grid would order by what the server last returned while showing what the user typed, which reads as the sort being broken.

## Cell and row states

`getRowState` returns `'dirty' | 'new' | 'error' | 'muted' | 'deleted' | 'placeholder'`, drawn as a tinted row with a 3px accent on its left edge. Return a list to layer several — later states are drawn over earlier ones, field by field, so a row that is both excluded and dirty keeps the muted look and gets the dirty accent. Selection is applied last, because it is the state the user just caused.

```tsx
<DataGrid getRowState={(row, rowId) => [row.excluded && 'muted', pending[rowId] && 'dirty'].filter(Boolean)} />
```

`getCellState` returns `'dirty' | 'warn' | 'error' | 'good' | 'override' | 'muted'` per cell, for business rules that flag one number rather than the whole line:

```ts
{
  key: 'margin',
  dataType: 'percent',
  getCellState: (ctx) => (Number(ctx.value) < 10 ? 'error' : null),
}
```

Both sets are open. `rowStates` and `cellStates` add names of your own or restyle built-in ones, merged over the defaults a field at a time — so restyling `error` leaves its text colour and every other state alone. Use Fluent tokens and dark theme follows:

```tsx
<DataGrid
  cellStates={{
    attention: { background: tokens.colorPaletteGoldBackground2, color: tokens.colorPaletteGoldForeground2 },
    error: { background: tokens.colorPaletteRedBackground3 },
  }}
/>
```

A state with no `background` leaves the stripe or the row's own tint showing. The defaults are exported as `BUILTIN_ROW_STATES` and `BUILTIN_CELL_STATES`, the raw palettes as `ROW_STYLE_TOKENS` and `CELL_STYLE_TOKENS`.

`getCellTooltip(ctx)` explains a cell on hover — why it is locked, where a figure came from — in place of the value tooltip. Only the control is wrapped, so an affix's own tooltip keeps working.

## Summaries

`summary` takes a built-in kind or a function over the rows. The function reads effective values, so unsaved edits count:

```ts
{
  key: 'gp',
  summary: (rows, { readValue }) => {
    const sell = rows.reduce((s, r) => s + Number(readValue(r, 'sellEx')), 0);
    const profit = rows.reduce((s, r) => s + Number(readValue(r, 'profit')), 0);
    return sell === 0 ? null : `${((profit / sell) * 100).toFixed(1)}%`;
  },
}
```

A number is formatted like the column; a string or node is rendered as given. `includeInSummary(row, rowId)` leaves rows out of the footer, subtotals and group counts while still showing them, and `groupSubtotalsMinGroups` holds subtotals back until there are that many outermost groups.

## Groups

| Prop | What it does |
|---|---|
| `renderGroupHeader(ctx)` | Replaces the banner's label and count. The chevron and checkbox stay |
| `groupSelection` | A checkbox on each banner selecting that group's rows, with a partial state |
| `groupContextMenu(ctx)` | Commands on right-clicking a banner |
| `onGroupDoubleClick(ctx)` | Double-click on a banner. While set, only the chevron collapses the group |

`ctx` carries the value, column, depth, full `path`, the group's leaf rows and ids, the default label, the count, expansion and selection state, and `toggle` / `toggleSelection`.

With `onRowReorder` set, banners are drop targets. The move reports `toGroup` — the group values at the drop point, outermost first — and `droppedOnGroupHeader`, so one drag can renumber lines and move them into a group.

## Keyboard

With `keyboardNavigation` on (the default):

| Key | Does |
|---|---|
| Arrows | Move the active cell. In a text field that was clicked into, left and right move the caret until it reaches the end it is heading for |
| Enter / Shift+Enter | Commit, and move down / up |
| Tab / Shift+Tab | Commit, and move to the next / previous editable cell, wrapping rows |
| F2 | Select the value for editing; the arrows go back to moving the caret |
| Typing, Backspace, Delete | Over a cell reached by keyboard, replaces the value |
| Ctrl+arrows in a memo editor | Save the note and move |
| Escape | Cancel an edit, then clear the active cell |

Moving through cells without typing stages nothing. Keys pressed inside a cell's own popup — a calendar, a lookup's results — are left to that control.

## Column visibility and views

`columnVisibility` / `onColumnVisibilityChange` control visibility from the app. `forceHiddenColumns` hides columns whatever the user chose, without changing that choice — clear it and exactly what was showing comes back, which is what a "customer view" toggle needs. Columns sharing a `columnGroup` are listed together in the column picker, under a toggle for the whole set.

Named views stay in the app: store `getLayout()` under a name and hand it back to `applyLayout()`. A view saved before a column was added still shows that column.

## Persistence

```tsx
<DataGrid persist={{ scope: 'quote-lines' }} />
```

Layout is stored under `datagrid:<origin>:<scope>:<facet>`. The origin is part of the key because a developer with dev, test and production orgs open in one browser would otherwise share one layout across all three — and a column that exists in only one of them corrupts the other two.

Restore happens during the first render, not in an effect, so the grid paints its saved layout rather than reflowing a frame later. Columns added to the config since a layout was saved are appended rather than dropped, and ids for columns that no longer exist are discarded.

Changing `scope` while the grid is mounted loads that scope's layout, so one grid can keep a layout per record type.

Narrow what is stored with `facets`, disable it entirely with `storage: null`, or clear it from the handle:

```tsx
const grid = useRef<DataGridHandle<Row>>(null);
grid.current?.resetLayout();
```

## Row reordering

Supply `onRowReorder` and the grid grows a drag-handle column:

```tsx
<DataGrid
  onRowReorder={({ rowIds, overRowId, toIndex }) => reorder(rowIds, toIndex)}
/>
```

A drag that starts on a selected row moves the whole selection, sorted into its current visual order.

## The handle

```tsx
const grid = useRef<DataGridHandle<QuoteLine>>(null);

grid.current?.scrollToRow('line-1500', 'center');
grid.current?.highlightRow('line-1500');        // scroll there and outline it briefly
grid.current?.focusColumnFilter('productName'); // opens the filter row first
grid.current?.resetColumnWidths();
const view = grid.current?.getLayout();         // order, widths, visibility, density, sort, grouping
grid.current?.applyLayout({ visibility: { cost: false } });
grid.current?.table;                            // the live TanStack instance
```

## Going headless

Where the shipped render is not enough, `useDataGrid` owns the whole state machine and hands back the table, so a bespoke grid does not have to fork the component:

```tsx
const { table, metrics, columnMap, selectedRowIds, setGroupBy } = useDataGrid({
  data,
  columns,
  getRowId: (row) => row.id,
  persist: { scope: 'quote-lines' },
});
```

`useDataGridStyles`, `DataGridHeaderCell`, `DataGridBodyRow`, `DataGridGroupRow` and `DataGridCell` are all exported, so a custom render can reuse the chrome piecemeal.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | — | Rows. Must be referentially stable |
| `columns` | `DataGridColumn<T>[]` | — | Column config. Must be referentially stable |
| `getRowId` | `(row, index) => string` | array index | Stable row id |
| `getCellValue` | `(row, key, rowId) => unknown` | reads the column | Effective value, for unsaved-edit layering |
| `onCellChange` | `(row, key, value, rowId) => void` | — | Commit an inline edit. Omit for a read-only grid |
| `readOnly` | `boolean` | `false` | Read-only whatever `editable` says |
| `getRowState` | `(row, rowId) => state \| state[]` | — | Row tint, layered when a list |
| `rowStates` / `cellStates` | `Record<string, style>` | built-in set | Add or restyle states |
| `renderRowIndicator` | `(row, rowId) => ReactNode` | — | Badge in the leading column |
| `showEditableHints` | `boolean` | `false` | Underline editable cells |
| `striped` | `boolean` | `true` | Alternate row shading |
| `density` / `defaultDensity` / `onDensityChange` | | `'comfortable'` | Row heights |
| `selectable` | `boolean` | `false` | Leading checkbox column |
| `selectedRowIds` / `onSelectionChange` | `Set<string>` | — | Controlled selection |
| `defaultSorting` / `onSortingChange` | `SortingState` | `[]` | Sorting |
| `showFilters` / `defaultShowFilters` / `onShowFiltersChange` | `boolean` | `false` | Per-column filter row |
| `globalFilter` | `string` | — | Free-text search across visible columns |
| `groupBy` / `defaultGroupBy` / `onGroupByChange` | `string \| null` | `null` | Group-by column key |
| `renderGroupLabel` | `(value, rows) => ReactNode` | raw value | Group banner label |
| `renderGroupHeader` / `groupContextMenu` / `onGroupDoubleClick` | `(ctx) => …` | — | Group banner hooks |
| `groupSelection` | `boolean` | `false` | Select-all checkbox per group |
| `groupSubtotals` | `boolean \| string[]` | `false` | Aggregate row under each group |
| `groupSubtotalsMinGroups` | `number` | `1` | Outermost groups needed before subtotals show |
| `includeInSummary` | `(row, rowId) => boolean` | — | Leave rows out of totals and counts |
| `reorderableColumns` | `boolean` | `true` | Drag columns to reorder |
| `onRowReorder` | `(move: DataGridRowMove<T>) => void` | — | Enables the drag-handle column and group-header drops |
| `columnMenu` | `boolean` | `true` | Right-click menu on headers |
| `persist` | `DataGridPersistence` | — | Layout persistence |
| `columnVisibility` / `onColumnVisibilityChange` | `Record<string, boolean>` | — | Controlled visibility |
| `forceHiddenColumns` | `string[]` | — | Hidden whatever the layout says |
| `toolbar` | `React.ReactNode` | — | Rendered above the header |
| `renderToolbarSearch` | `({ value, onChange }) => ReactNode` | — | Replaces only the built-in search box |
| `statusBar` / `statusBarExtra` | | `true` | Row-count strip |
| `footerSummary` | `boolean` | any `summary` set | Sticky totals row |
| `loading` / `loadingMessage` / `error` / `emptyMessage` | | — | Body replacements |
| `onRowClick` / `onRowDoubleClick` / `onRowContextMenu` | | — | Row events |

## Why the editors stay mounted

Editors are rendered for every visible editable cell rather than swapped in on click. Mounting on click costs a render before the caret lands, which in a virtualised grid reads as a dropped keystroke; keeping them mounted also means tabbing across a row moves through the editors in document order, for free.

Each editor holds a local draft while focused and flushes on blur or Enter. Committing on every keystroke would push a re-render of the whole grid between characters, and committing only on blur loses the edit when a row virtualises away mid-type.

## Why `data` must be stable

A new array identity each render re-creates the table, discarding scroll position, sort, filters and selection. Memoise it:

```tsx
const rows = useMemo(() => [...added, ...(query.data ?? [])], [added, query.data]);
```
