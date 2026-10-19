# DataGrid: enhancements needed to replace the project grids

**Status:** mostly built; open questions reviewed, follow-ups proposed · **Written:** 2026-09-16 · **Updated:** 2026-09-16 · **Component:** `src/components/DataGrid` (unreleased)

## Goal

`DataGrid` should be able to replace the two grids we built by hand in Dynamics projects, so that new projects use the library instead of building another grid:

| Project | Grid code |
|---|---|
| **PriceListGrid** | `HNAU-Dynamics365-ProductManagmentToolkit\ProductManagmentToolkit\ProductManagmentToolkit.Assets\React-PriceListGrid\src\components\PricelistGrid.tsx` and `PricelistGrid\` |
| **ProductQuoteGrid** | `HNAU-Dynamics365-ProductQuoteGrid\ProductQuoteGrid\ProductQuoteGrid.Assets\Scripts\hnc_\App\ProductGrid\src\components\ProductGrid\` (`ProductGrid.tsx` is ~230KB) |

This document lists what DataGrid already covers, what it was missing, and the order to build it in. Both grids were compared against the DataGrid source as it stood on the date above.

**Design rule for every item below:** add a generic hook that a consumer configures, not a feature named after one project. "Custom cell states" rather than "an `attention` state"; "a group header slot" rather than "task headers".

Each item now carries a status. Where what was built differs from the original proposal, the item says so. Anything that needs a decision is in [Open questions](#open-questions) at the end.

---

## Summary

| # | Enhancement | PriceListGrid | ProductQuoteGrid | Size | Status |
|---|---|:-:|:-:|---|---|
| 1 | Custom cell states and colours | needed | needed | S | ✅ Done |
| 2 | Cell tooltip hook | needed | needed | S | ✅ Done |
| 3 | Several row states at once, plus `deleted` / `placeholder` | needed | needed | S–M | ✅ Done (see Q1) |
| 4 | Group header slot and actions | nice to have | needed | M | 🟡 Partly done: group reordering not built (Q2) |
| 5 | Spreadsheet keyboard editing | nice to have | needed | M | ✅ Done (see Q5) |
| 6 | Row drag reports the target group | — | needed | S | ✅ Done, not yet checked in a browser |
| 7 | Empty groups | — | needed | M | ⏳ Not started (Q3) |
| 8 | Custom subtotal/footer calculations | — | needed | S | 🟡 Partly done: subtotal label span not built (Q6) |
| 9 | App-controlled column visibility and named views | — | needed | M | ✅ Done, including the `persist.scope` bug |
| 10 | Row indicator badge, editable-field hint, row flash | — | needed | S | ✅ Done |
| 11 | Toolbar search slot | needed | — | S | ✅ Done |

**Build order**

The original order said ProductQuoteGrid could switch over after steps 1–3. That was wrong: items 8, 9 and 10 are marked *needed* for ProductQuoteGrid but sat in step 4. The corrected order:

1. Items 1–3, plus the `persist.scope` fix from item 9. Small, and needed by both grids. After this step **PriceListGrid can switch over** (once released). — ✅ built
2. Item 5. The biggest risk for ProductQuoteGrid users, who rely on this keyboard behaviour today. — ✅ built
3. Items 4, 6 and 7. One piece of work on how group rows are built and dragged. — 🟡 item 7 and group reordering remain
4. Items 8, 9 and 10. All needed by ProductQuoteGrid. — 🟡 subtotal label span remains
5. Item 11. — ✅ built

**ProductQuoteGrid can switch over** once item 7, group reordering (Q2) and the subtotal label (Q6) are resolved, or once those are agreed to be things users can live without for a while.

**Not yet verified:** everything above is covered by unit and render tests (`DataGrid.states.test.ts`, `DataGrid.enhancements.test.tsx`), but not in a browser or the test harness. Row drag onto a group header (item 6) is the part most worth checking by hand, since dnd-kit cannot be driven in jsdom.

## Follow-up work

The suggested answers in [Open questions](#open-questions) imply the changes below. None is built yet. Each needs its question signed off first; the order is the suggested build order.

| # | Change | From | Size | Blocks ProductQuoteGrid? |
|---|---|---|---|---|
| F1 | `getGroupSortValue(ctx)`, a per-level sort for groups | Q2 | S | Yes — needed by F2 and F3 |
| F2 | Group reordering: `reorderableGroups: boolean \| ((depth) => boolean)`, grip on the banner, `onGroupReorder({ columnKey, value, depth, toIndex, before, after, toParentPath })` | Q2 | M | Yes |
| F3 | Empty groups: `extraGroups`, one level, placed by F1's sort, hidden under a filter | Q3, item 7 | M | Yes |
| F4 | Subtotal and footer labels: `renderSubtotalLabel(ctx)` spanning up to the first visible column with a `summary`; `renderFooterLabel`, blank by default | Q6, item 8 | S–M | Yes |
| F5 | Footer rows: include rows in collapsed groups (a bug, see item 8), and add `footerScope: 'filtered' \| 'all'` | Q6, item 8 | S | Yes — ProductQuoteGrid's footer ignores the filter |
| F6 | `isRowReadOnly(row, rowId)` | Q1, item 3 | S | Yes |
| F7 | `ctx.summaries` for function summaries, so a GP% total can read the group's other totals | Q7, item 8 | S | No — re-summing in the function works |
| F8 | Double-click on the group label only, not the whole banner | Q4, item 4 | S | No |
| F9 | Editable hint: 1px `colorBrandBackgroundStatic` underline across the whole cell; same token as `accent-color` for checkboxes in the grid | Q9, item 10 | S | No |
| F10 | `forceHiddenReason` shown as a tooltip on forced columns in the picker; `columnGroup` headings in the standalone `DataGridColumnPicker` | Q8, item 9 | S | No |
| F11 | `highlightRow`: expand a collapsed group to reach the row; default 2000ms to match ProductQuoteGrid | Findings, item 10 | S | No |
| F12 | Group checkbox: decide whether it selects rows inside a collapsed group (it does now; ProductQuoteGrid doesn't) | Findings, item 4 | S | Decide before migrating |
| F13 | Docs only: `toIndex` meaning for row drops; subtotals follow the filter; lookups cover a cell state (known limitation); left/right arrow change in the release notes | Q5, Q6, Q10, item 6 | S | No |

---

## Already covered

Nothing to build here. These rows map existing grid behaviour onto DataGrid props, which is also a starting checklist for migrating either grid.

| Existing behaviour | DataGrid |
|---|---|
| Business-rule fill on a cell (PriceListGrid `cellRules.ts`) | `column.getCellState(ctx)`, now any name registered in `cellStates` (item 1) |
| Cell locked by a rule, a vendor quote, or the sell-price lock | `column.isCellReadOnly(ctx)` |
| Whole grid locked by the parent record | `readOnly` |
| Dirty outline on a changed cell | `column.isCellDirty(ctx)` |
| Unsaved edits shown over stored values | `getCellValue(row, key, rowId, baseValue)` |
| Excluded / dirty / new rows | `getRowState`, now with layering (item 3) |
| `$` / `%` that switches with another field; [SAP] badge; up/down cost and price arrows; lock icon | `prefix` / `suffix` as a function of `ctx` returning a node |
| Money shows 2 decimals, raw value while focused | Built into `TextEditor` |
| Choice badges with Dataverse colours (Override Method, Range, Cost Origin, Status) | `dataType: 'choice'` + `choices[].color` → `OptionSetField` badge |
| Read-only flags as a tick or cross (inSync, Core, BC, CS, NR…) | `booleanDisplay: 'icon'` + `booleanLabels` |
| Product picker on a new row | `lookup` + `searchLookup` + `onLookupSelect` |
| Lookup opens the record in Dynamics | `lookup` + `getLookupValue` + `onRecordClick` |
| Memo editor popover with character counter | `dataType: 'multiline'` + `maxLength` |
| Product image with hover preview | `dataType: 'image'` + `getImageSrc` |
| Virtual profit / GP columns | `computed` |
| Negative numbers in red | `negativeIsRed` |
| Footer totals | `summary` + `footerSummary` |
| Group subtotals | `groupSubtotals` (item 8 added the rest) |
| Nested grouping (Task → Group) | `groupBy: string[]` (see items 4 and 7) |
| Collapse state survives a data refresh | Already `autoResetExpanded: false` in `useDataGrid.ts` — PriceListGrid's workaround is not needed |
| Product-type icon, Condition Contracts popover, loading skeleton | `renderCell` |
| Row context menu that acts on the whole selection | `rowContextMenu(row, rowId, selectedRowIds)` |
| Ctrl / Shift row selection | `selectable` + `multiSelect` |
| Sort, filter row, resize, column drag, header menu, density, virtualisation | Built in |
| Saved column layout | `persist` |
| Extra toolbar commands (Save, Import, Export, Rules…) | `toolbarItems` |
| Edits commit on blur / Enter | Built in (same as ProductQuoteGrid; PriceListGrid currently stages on every keystroke) |

Not checked item by item: ProductQuoteGrid's header menu (column-width prompt, hide, reset one column's width) against `DataGridColumnMenu.tsx`. The library menu has move left/right, so this is probably mostly covered. Confirm it during migration.

---

## 1. Custom cell states and colours

**Status: ✅ Done**

**Problem.** `DataGridCellState` was a fixed union (`dirty | warn | error | good | override | muted`), mapped to fixed classes in `DataGridCell.tsx` (`CELL_STATE_CLASS`) with colours from `CELL_STYLE_TOKENS` in `DataGrid.tokens.ts`. Neither grid fits it:

| Needed by | State | What it looks like today |
|---|---|---|
| PriceListGrid | error | `colorPaletteRedBackground3` fill, `colorNeutralForegroundOnBrand` text |
| PriceListGrid | good | `colorPaletteGreenBackground3` fill, on-brand text |
| PriceListGrid | goodText | `colorPaletteGreenForeground1` text, **no fill** |
| ProductQuoteGrid | warn | `colorPaletteRedBackground1` fill, `colorPaletteRedForeground1` text, plus a below-minimum icon |
| ProductQuoteGrid | attention | `colorPaletteGoldBackground2` fill, `colorPaletteGoldForeground2` text (the Min % cell when the row's margin is below it) |
| ProductQuoteGrid | override | `colorPaletteGreenBackground1` fill (the library uses blue) |

The library's own `error` and `good` use the lighter `Background1` fills, which are weaker than PriceListGrid's legacy red and green.

**Built.**

```ts
interface DataGridCellStateStyle {
  background?: string;
  color?: string;
  fontWeight?: number | string;
  border?: string; // drawn as an inset outline
}

// DataGridProps
cellStates?: Record<string, DataGridCellStateStyle>;

// DataGridColumn
getCellState?: (ctx) => DataGridCellState | (string & {}) | null | undefined;
```

- `cellStates` entries merge over the built-in ones field by field (`BUILTIN_CELL_STATES`), so `{ error: { background } }` keeps `error`'s text colour and weight.
- Styles reach the `<td>` as custom properties (`--fue-cell-bg` and so on), read by one static class per property. A class is only applied when its property is set, so a state with no `background` leaves the row's stripe, selection or dirty tint showing.
- Filled Fluent controls (`.fui-Input`, `.fui-Combobox`) go transparent at rest so the state shows behind an editor, and get their fill back while focused.
- `cellStateClass` was replaced by `cellStateProps(styles, state, custom)`, which returns `{ className, style }`.

**Acceptance**
- [x] A consumer can add a state that exists only in their project and have it render.
- [x] A consumer can restyle a built-in state without touching the others.
- [x] A state with no `background` leaves the row's stripe, selection or dirty tint visible underneath.
- [x] The state still shows when the cell holds an editor (input, choice). Lookups draw their own `filled-darker` surface, which is not overridden — check in the browser.
- [x] Values are Fluent tokens, so dark theme works without a second palette.

---

## 2. Cell tooltip hook

**Status: ✅ Done**

**Problem.** Both grids set hover text that explains a cell. DataGrid's `CellTooltip` showed the value, or for boolean icons the `booleanLabels` / Yes / No.

- PriceListGrid: why a cell is locked, e.g. "Calculated by Dynamics — not editable", "Not in use — the price is decided elsewhere on this row" (`columns.ts` `getReadOnlyTitle`, `cells.tsx` `INACTIVE_REASON`).
- ProductQuoteGrid: `tooltipContent` on `EditableCell`, e.g. "Overriding vendor quote contract reference".

**Built.**

```ts
// DataGridColumn
getCellTooltip?: (ctx) => React.ReactNode | null | undefined;
```

When it returns content, that tooltip is shown and the value tooltips inside the cell stand down. An icon's label tooltip is kept as an `aria-label` so the icon still has a name. When it returns null, the current behaviour is unchanged.

**Acceptance**
- [x] Works on read-only cells and on editable ones.
- [x] Doesn't break an affix's own tooltip: only the control is wrapped, not the prefix or suffix.

---

## 3. Several row states at once, plus `deleted` and `placeholder`

**Status: ✅ Done**, apart from making deleted rows read-only (Q1)

**Problem.** `getRowState` returned one `DataGridRowState` (`default | selected | dirty | new | muted | error`), and `DataGridBodyRow.tsx` applied a single class. Both grids layer states:

- PriceListGrid: excluded (muted) **and** dirty.
- ProductQuoteGrid (`DraggableRow.tsx`): placeholder, negative profit, dirty, deleted, selected, in that order, with later ones drawn on top.

ProductQuoteGrid also has two states the library didn't have (`src/config/rowStyleTokens.ts`):
- `deleted`: red tint, struck-through text; the row stays visible until save so it can be restored.
- `placeholder`: berry tint with an accent stripe.

**Built.**

```ts
// DataGridProps
getRowState?: (row, rowId) => RowState | RowState[] | null | undefined;
rowStates?: Record<string, {
  background?: string; backgroundHover?: string; accent?: string;
  color?: string; textDecoration?: string; opacity?: number;
}>;
```

- A list is applied in order, later states on top, field by field: a muted row that is also dirty keeps the muted opacity and gets the dirty accent. Selection is applied last and only replaces what it sets.
- `deleted` and `placeholder` are built-in states. Strike-through reaches into inputs too.
- `rowStates` merges over the built-in ones (`BUILTIN_ROW_STATES`), the same way as `cellStates`. `color` was added to the style, which the proposal did not have.
- Rows receive their states as one joined string, so returning a new array each render does not defeat the row memo.

**Acceptance**
- [x] A dirty row that is also excluded shows both the dirty accent and the muted look.
- [ ] A deleted row is struck through **and can't be edited** — struck through, yes; read-only is not built. The proposal only covered styling. See Q1.
- [x] Its context menu still opens (for Restore).

---

## 4. Group header slot and actions

**Status: 🟡 Partly done.** Group reordering is not built (Q2).

**Problem.** `DataGridGroupRow.tsx` drew a chevron, a label and a count; `renderGroupLabel` only replaced the label. ProductQuoteGrid's group and task headers (`ProductGrid.tsx`, `GroupHeaderDropRow` / `TaskHeaderDropRow`) also have:

- a select-all checkbox for the rows in that group, with a partial state; — ✅ `groupSelection`
- rename on double-click; — ✅ `onGroupDoubleClick` (the rename UI stays in the project)
- a right-click menu (rename and others); — ✅ `groupContextMenu`
- a drag handle to reorder task groups; — ⏳ not built, Q2
- a drop target, so dragging rows onto the header moves them into that group; — ✅ item 6
- a `#n` badge before task names. — ✅ through `renderGroupHeader`

PriceListGrid's move-to-group commands (`GroupingMenu.tsx`, `SetGroupingDialog.tsx`) would also fit a group context menu.

**Built.**

```ts
interface DataGridGroupContext<T> {
  value: unknown;
  columnKey: string;
  depth: number;
  path: Array<{ columnKey: string; value: unknown }>; // added: outermost first
  rows: Row<T>[];                                     // leaf rows only
  rowIds: string[];
  label: React.ReactNode;                             // added: the default label
  count: number;                                      // added: honours includeInSummary
  expanded: boolean;
  toggle: () => void;
  selection: 'none' | 'some' | 'all';
  toggleSelection: () => void;
}

// DataGridProps
renderGroupHeader?: (ctx) => React.ReactNode; // replaces label and count; chevron and checkbox stay
groupContextMenu?: (ctx) => CommandBarItem[] | null;
onGroupDoubleClick?: (ctx) => void;
groupSelection?: boolean;
```

Differences from the proposal:
- While `onGroupDoubleClick` is set, a click on the banner no longer collapses the group; the chevron becomes a button and does. Otherwise every double-click collapses and re-opens the group. See Q4.
- Group counts used to include the inner banners of a nested group. They now count leaf rows only.
- `reorderableGroups` / `onGroupReorder` are not built.

**Acceptance**
- [ ] The group checkbox selects and clears only that group's visible rows, and shows a partial state. — Partial state works. But "visible" is not what was built: the checkbox acts on every row in the group that passes the filters, **including rows inside a collapsed group**. ProductQuoteGrid only selects rows on screen. See F12.
- [x] The group banner stays pinned to the left when the grid is scrolled sideways, including custom content (it renders inside the existing sticky cell).
- [x] Collapse state survives a data refresh — this was already the case (`autoResetExpanded: false`).

---

## 5. Spreadsheet keyboard editing

**Status: ✅ Done** (see Q5 on Enter)

**Problem.** `handleKeyDown` in `DataGrid.tsx` handled the arrow keys, Enter (move down) and Escape (clear the active cell). Left and right were ignored while inside an input. ProductQuoteGrid (`EditableCell.tsx`) behaves like Excel, and its users rely on it:

| Key | ProductQuoteGrid | DataGrid before | DataGrid now |
|---|---|---|---|
| A printable character on a focused cell | Starts editing and replaces the value with that character | No | ✅ Arriving by keyboard selects the value, so typing replaces it. Typing while focus is on the cell rather than its input focuses the input first |
| Backspace / Delete | Starts editing with an empty value | No | ✅ Same mechanism |
| F2 / Enter on a cell | Edit with the whole value selected | F2 only in memo cells | ✅ F2 selects the value and hands the arrows back to the caret. Enter still moves down (Q5) |
| Enter while editing | Commit and move down | Moves down | ✅ Commit and move down; Shift+Enter moves up |
| Tab / Shift+Tab | Commit and move to the next / previous **editable** cell, wrapping rows | No | ✅ |
| Arrows while editing | Commit and move | Up/down only | ✅ Up/down always; left/right at the caret's edge, or always when the cell was reached by keyboard |
| Ctrl+arrows in a memo editor | Commit and move | No | ✅ |
| Escape while editing | Cancel | Cancel | Cancel |
| Moving between cells without typing | Doesn't mark the row dirty | Needs checking | ✅ Tested: tabbing through stages nothing |

Also fixed on the way: keys pressed inside a cell's own popup (the date picker's calendar, the memo textarea) used to bubble up through the React portal and move the active cell. They are now ignored unless they are Ctrl+arrows in the memo editor.

The review note still applies: after a move, the grid focuses the first `input`, `select` or `[tabindex="0"]` in the target cell. Choice and lookup cells are reached through their combobox input; the memo cell through its trigger.

Checked against ProductQuoteGrid's behaviour (Q5):
- **Number cells** have their whole value selected on arrival, the same as text cells. They are `type="text"` inputs, so `select()` works; a render test covers Tab onto Qty. This is better than ProductQuoteGrid today, where typing into a number cell reached by Tab appends.
- **Left/right after a click** move the caret until it reaches an edge. ProductQuoteGrid jumps to the next cell straight away. Users arriving by keyboard see no difference. Put this in the release notes (F13).
- **Ctrl+Z / Ctrl+Y** are left alone: the grid ignores keys with Ctrl or Cmd held, except Ctrl+arrows in the memo editor, and never prevents their default. ProductQuoteGrid's page-level undo keeps working.

**Acceptance**
- [x] Tabbing through a row of editable cells without typing leaves the row clean.
- [x] Navigation scrolls a virtualised row into view before focusing it.
- [x] Choice and lookup cells open on Enter rather than being stepped over, and don't take typed-over characters.

---

## 6. Row drag reports the target group

**Status: ✅ Done.** Not yet checked in a browser.

**Problem.** `DataGridRowMove` had `rowIds`, `rows`, `overRowId` and `toIndex`. With grouping on, a drop can land in a different group, or on a group header. ProductQuoteGrid uses one drag to renumber `lineitemnumber` **and** reassign the group or task.

**Built.**

```ts
interface DataGridRowMove<T> {
  rowIds: string[];
  rows: T[];
  overRowId: string;   // a row id, or the group row's id on a header drop
  toIndex: number;     // on a header drop: the position straight after the rows above it
  toGroup: Array<{ columnKey: string; value: unknown }>;
  droppedOnGroupHeader: boolean;
}
```

Group headers are drop targets whenever `onRowReorder` is set. Paths come from `groupPaths(modelRows)`, which is exported and unit-tested.

What the fields mean, checked against the code:
- **`toIndex` on a row drop** is the target row's current index among the data rows on screen — its slot, as `arrayMove` uses it. The grid does not say "above" or "below". ProductQuoteGrid inserts below the target when dragging down within the same group and above otherwise; it can work that out from `toIndex` and the moved rows' current positions. Needs saying in the docs (F13).
- **`toIndex` on a header drop** counts the data rows above the header, which is the group's first row when it has any on screen. This settles the review question about a drop with no neighbouring row.
- **`toGroup` on a header drop** holds the path down to that header and no further. A drop on an outer (task) header therefore reports only the outer level. ProductQuoteGrid's rule — a drop on a task header clears the inner group — can be applied from that directly.
- **A blank group value** is reported as whatever the rows hold (`''`, `null` or `undefined`), not normalised. Dropping onto an "(Ungrouped)" band reports that value (Q3).

**Acceptance**
- [x] Dragging a selection from group A into group B reports B's value in `toGroup` (unit-tested through `groupPaths`; check the drag by hand).
- [x] Dropping on a collapsed group header works — the banner is a drop target whether or not it is expanded.
- [x] Rows can't be dropped onto subtotal rows — they are not drop targets.

---

## 7. Empty groups

**Status: ⏳ Not started.** Needs answers to Q3 first.

**Problem.** TanStack builds groups only from rows that exist. ProductQuoteGrid shows a task header before any lines are in it (`pendingEmptyTasks`) so users can drag lines into it, and shows an "(Ungrouped)" band.

**Proposal.**

```ts
// DataGridProps
extraGroups?: Array<{ path: Array<{ columnKey: string; value: unknown }>; label?: React.ReactNode }>;
```

These are merged into the display list as groups with a count of 0, in their sorted position. They render through `renderGroupHeader` (item 4) and accept drops (item 6).

Groundwork already in place: `groupPaths` and the drop handling work from the display list rather than from a group's rows, so a synthetic banner with no rows will still report a path and a `toIndex`.

**Acceptance**
- An empty group shows with a count of 0 and can be dropped onto.
- Once a row is moved into it, it becomes an ordinary group without flicker or a duplicate.
- A filter hides empty groups unless they are listed in `extraGroups`.

---

## 8. Custom subtotal and footer calculations

**Status: 🟡 Partly done.** The subtotal label span is not built (Q6).

**Problem.** `DataGridSummary` is `sum | avg | count | min | max`. ProductQuoteGrid's subtotal GP% (in the MU/GP column) is total profit ÷ total sell, a ratio that can't be built from those. ProductQuoteGrid also:
- only shows subtotal rows when there are two or more groups (one group would just repeat the footer); — ✅
- leaves pending-delete rows out of subtotals and group counts; — ✅
- spans the "Subtotal · Group (n)" label across the leading columns that have no total. — ⏳ Q6

**Built.**

```ts
// DataGridColumn
summary?: DataGridSummary | ((rows: T[], ctx: { readValue: (row: T, key: string) => unknown; rowIds: string[] }) => unknown);

// DataGridProps
groupSubtotalsMinGroups?: number;                      // default 1; counts outermost groups
includeInSummary?: (row: T, rowId: string) => boolean;
```

- A number or string result is formatted like a cell in the column and carries its affixes. Anything else (a node) renders as it is. See Q7.
- `includeInSummary` also applies to the counts on group banners.
- Subtotals are now computed from a group's leaf rows. They used `subRows`, which for an outer group of a nested grid are the inner banners, so nested subtotals were wrong.
- A function summary that returns `null` or `''` leaves the cell blank, which ProductQuoteGrid needs when total sell is zero (Q7).

Which rows each total uses, checked against the code:
- **Subtotals** use every row in the group that passes the filters, less `includeInSummary` exclusions. They follow the filter, as ProductQuoteGrid's do.
- **The footer** uses the data rows currently in the row model. That follows the filter too, and it also **leaves out rows inside collapsed groups**, so collapsing a group changes the footer total. That is a bug. ProductQuoteGrid's footer also ignores the filter. See F5.

**Acceptance**
- [x] A function summary gets effective values (unsaved edits included) and runs for both the footer and subtotals.
- [x] Rows excluded by `includeInSummary` don't count towards group totals, but still render.

---

## 9. App-controlled column visibility and named views

**Status: ✅ Done**

**Problem.** Column visibility was internal to `useDataGrid`; `DataGridProps` had no controlled visibility. ProductQuoteGrid needs:
- **Visibility groups:** toolbar toggles that show or hide sets of columns together (A Description, B Ratings, C Other Fields, D Vendor Quote Info; `visibilityGroup` in `types/grid.ts`). — ✅ `columnGroup`
- **Customer View:** hides every `customerSensitive` column and overrides the user's own choices while it's on. — ✅ `forceHiddenColumns`
- **Named saved views:** order, widths and visibility saved under a name, applied and deleted (`SavedView` in `store/gridStore.ts`). — ✅ `getLayout` / `applyLayout`
- **Per-scope layouts:** a different saved layout per entity and quote type. — ✅ fixed, see below

**Correction to the original draft.** It said `persist.scope` "probably covers" per-scope layouts. It did not: `usePersistedState` only read storage on mount, and because the write effect depended on the key, changing `scope` wrote the current layout straight into the new scope, overwriting what was saved there. Changing the key now reloads during render and skips that write.

**Built.**

```ts
// DataGridProps
columnVisibility?: Record<string, boolean>;
onColumnVisibilityChange?: (next: Record<string, boolean>) => void;
forceHiddenColumns?: string[];

// DataGridColumn
columnGroup?: string;

// DataGridHandle (also returned by useDataGrid)
getLayout: () => DataGridLayout; // order, sizing, visibility, density, sorting, grouping
applyLayout: (layout: Partial<DataGridLayout>) => void;
```

- Forced and grouped columns are hidden on the way to the table, never written into stored visibility. Visibility changes from the column menu and picker are resolved against the user's own choices, not what is on screen. Before, hiding one column while grouped saved the grouped column as hidden too.
- In the built-in toolbar's column picker, columns sharing a `columnGroup` are listed under a toggle for the whole group. Forced columns are shown but disabled (Q8).
- `applyLayout` merges the order the same way a restored layout does, so a view saved before a column existed still shows that column. It writes through to `persist`.

**Acceptance**
- [x] Turning Customer View off restores the visibility the user had before.
- [x] Changing `persist.scope` while mounted loads that scope's layout.

---

## 10. Row indicator badge, editable-field hint, row flash

**Status: ✅ Done**

Three small items from ProductQuoteGrid:

- **Row indicator.** The drag-handle cell shows a badge with the number of edited fields, or `+` for a new row (`DraggableRow.tsx`). — ✅ `renderRowIndicator?: (row, rowId) => ReactNode`. Rendered in place of the drag grip. The leading column is reserved whenever this is set, even without `onRowReorder`.
- **Editable-field hint.** A "Show editable fields" toggle underlines every editable cell (`CELL_STYLE_TOKENS.editableHint`). — ✅ `showEditableHints?: boolean`. Draws a 2px `colorBrandStroke2` inset underline on the whole cell, affixes included, without changing its height. ProductQuoteGrid uses 1px `colorBrandBackgroundStatic` (Q9, F9).
- **Row flash.** The product finder scrolls to a row and briefly outlines it. — ✅ `DataGridHandle.highlightRow(rowId, { durationMs })`. Scrolls the row to the centre (not smoothly) and outlines it for 1500ms by default. ProductQuoteGrid uses 2000ms. Neither expands a collapsed group: the library finds nothing to scroll to and still sets the outline, which then shows nowhere (F11).

---

## 11. Toolbar search slot

**Status: ✅ Done**

**Problem.** PriceListGrid's toolbar search is a `Lookup` that suggests matching products as you type and filters the grid on select (`PricelistGridToolbar.tsx`). The built-in toolbar has a plain search box, and replacing it with `toolbar` means rebuilding filters, density, column picker and layout reset as well.

**Built.** `renderToolbarSearch?: (props: { value: string; onChange: (text: string) => void }) => ReactNode` replaces only the search box and keeps driving `globalFilter` / `searchColumns`. Setting it also turns the built-in toolbar on, the same as `searchColumns` does.

---

## Stays in the projects

Business logic, not grid features. Don't move these into DataGrid:

- **PriceListGrid:** the pricing-rule cascade (`src/config/cellRules.ts`, which returns a state name for item 1), one-line-per-product checks, Excel import/export and export profiles, the add/edit row dialogs, and price-level header autosave.
- **ProductQuoteGrid:** pricing, GP and sell-price rounding (`utils/pricing.ts`), the pending-edit and save pipeline (`store/editStore.ts`, `hooks/useSaveChanges.ts`), autosave, cross-window save sync, "Identify issues" (filter `data` before passing it in), Field Service task numbering, and every dialog (best price, stock on hand, condition contracts, PDF import, clone…).

In both grids, "muted because a rule takes the field out of play" means read-only through `isCellReadOnly`, not a grey state. PriceListGrid's `muted` rule state must not be passed to `getCellState` as `muted`, or those cells will turn grey.

---

## Migration notes

- **Commit timing changes for PriceListGrid.** It currently stages an edit on every keystroke, so rule colours update while typing. With DataGrid they update on blur or Enter.
- **Row ids.** Both grids use `tmp-<uuid>` for unsaved rows. Pass a stable `getRowId`, or selection and virtualisation break when rows reorder.
- **Controls stay the same.** DataGrid uses `OptionSetField` and `Lookup` inside cells, which PriceListGrid already uses, so badges and lookups will look the same after migration.
- **Breaking change inside the unreleased component.** `cellStateClass` is now `cellStateProps`, and the `rowDirty` / `rowNew` / `rowError` / `rowMuted` and `cellDirty` … `cellMuted` style classes were replaced by the custom-property classes. Nothing released uses them.
- **Release first.** Neither project can use DataGrid until it is exported from a published `fluentui-extended` version. The installed 2026.9.6 package doesn't include it.

---

## Open questions

For review. Each one blocks or shapes remaining work, or confirms a choice made while building.

Each question now has two added parts. **Today** is what the existing grids actually do, read from their source; paths are relative to each project's `src\` folder (ProductQuoteGrid: `...\App\ProductGrid\src\`, PriceListGrid: `...\React-PriceListGrid\src\`). **Suggested answer** is a recommendation based on that, not a decision. Two questions (7 and 9) were asked on a wrong premise; the context corrects them.

**Library check** notes where a suggested answer depends on how DataGrid behaves now; they were checked against the source on the date above. Every question is **awaiting sign-off**. The work each answer implies is listed in [Follow-up work](#follow-up-work).

### 1. Deleted rows and editing (item 3)

Should the grid make a row read-only itself — a new `isRowReadOnly(row, rowId)` prop, or treating the `deleted` state as read-only — or should projects keep doing it through each column's `isCellReadOnly`? A row-level prop is one line for consumers; tying it to the state name couples styling to behaviour.

**Today — ProductQuoteGrid**
- Delete on a saved row calls `markDeleted` (`store/editStore.ts`): the row stays in the grid until Save. Delete on an unsaved `tmp-` row calls `removeNewRow` and the row disappears at once.
- The deleted-row class (`components/ProductGrid/productGridShared.ts`, `rowDeleted`) is red tint, a red inset accent, `line-through`, `opacity: 0.55` **and `pointerEvents: 'none'`**. Every cell editor is also passed `disabled={isReadOnly || isRowDeleted}`, and so is `CostOriginCell`.
- Deleted rows are left out of group counts, subtotals and footer totals (`buildGroupedItems`, `subtotals`, `summaries` in `ProductGrid.tsx`).
- A row can be restored four ways: the row menu's Restore (`RowContextMenu.tsx`, `handleRestore` → `unmarkDeleted`), the restore button in `AuditTrailDrawer.tsx`, Undo (toolbar or Ctrl+Z outside an editor, `ProductGrid.tsx` ~line 1550), and Revert.
- Probably a bug: because the row has `pointer-events: none`, a right-click on a deleted row likely never reaches the row's `onContextMenu`, so the Restore item may be unreachable from the grid itself. Worth confirming in the running app; if so, Restore only works through the audit drawer and Undo today.

**Today — PriceListGrid**
- No deleted state. Deleted rows are removed from the data immediately (`deletedRowIds` filter in `PricelistGrid.tsx`) and only sent to Dataverse on Save.
- Rows bound to a price list rule are refused with a toast rather than deleted, because the rule would add them back.

**Suggested answer.** Add `isRowReadOnly(row, rowId)` rather than tying behaviour to the `deleted` state name. It covers the deleted row, and it also covers PriceListGrid's parent-locked and ProductQuoteGrid's vendor-quote rows without every column repeating the check. Do **not** copy `pointer-events: none`: a read-only row must still take a right-click (for Restore) and show tooltips. The library's `deleted` state should stay styling-only, and its acceptance should include "right-click on a deleted row opens the row menu".

**Library check.** DataGrid's `deleted` state is styling only: no `pointer-events: none`, so a right-click on a deleted row reaches the row menu. The row still takes edits until a project locks its cells. → F6.

### 2. Reordering groups (item 4)

TanStack orders groups by the sort on the grouping column, or by first appearance. For a drag to reorder task groups, who owns the order? The likely answer is that the project keeps a sort-order field and the grid reports `{ columnKey, value, toIndex, depth }` for it to renumber. But then the grid must also sort groups by that field, and there is no hook for that yet. Is a per-level group sort (`getGroupSortValue`) acceptable, and does the drag handle go on the banner or in the leading column?

**Today — ProductQuoteGrid** (all in `components/ProductGrid/ProductGrid.tsx`)

There are two levels, and they are not dragged the same way:

| Level | Shown when | Order | What dragging its header does |
|---|---|---|---|
| **Task** (outer) | Field Service mode is on | `hnc_taskgroupno` ascending, numeric (`buildDisplayItems`) | **Reorders the task.** `handleTaskHeaderDragEnd` gives the dragged task a new number halfway between its new neighbours, or ±1000 at either end, and writes it to every row in the task. An empty task renumbers its pending entry instead. |
| **Group** (inner) | Always | Alphabetical by group name (`localeCompare` in `buildGroupedItems`) | Only in Field Service mode, and only **moves the whole group to another task** (`handleGroupHeaderDragEnd`). Dropping it inside its own task does nothing; groups are never reordered. Outside Field Service mode the header is a drop target only, with no grip. |

- Rows within a group are ordered by `lineitemnumber`, then product description.
- The grip sits **inside the banner**, before the chevron (`GroupHeaderDropRow` / `TaskHeaderDropRow` pass it to the banner as a render prop), not in the leading drag column.
- Headers are also drop targets for rows (item 6).
- Group ids are namespaced per task (`t1000:Vendor A`), so two tasks can each have a group with the same name without their collapse state or subtotals merging.

**Today — PriceListGrid.** No group dragging. Groups are ordered by TanStack's grouping of `hnc_grouping` (or the chosen group-by column).

**Suggested answer.**
- Yes to a per-level sort hook, e.g. `getGroupSortValue(ctx: { columnKey, value, depth, rows }) => number | string`. ProductQuoteGrid returns the task's `hnc_taskgroupno` at depth 0 and the group name at depth 1.
- Report the drag as `onGroupReorder({ columnKey, value, depth, toIndex, before, after })`, where `before` and `after` are the neighbouring groups' values (or null at an end). That is exactly what ProductQuoteGrid needs to compute a midpoint number, and it means the project doesn't have to re-derive the neighbours from the display list.
- Moving an inner group into a different outer group is a separate result from reordering. Either add `toParentPath` to the same payload, or send it through `onRowReorder` as a block move of every row in that group. The first is clearer.
- Put the grip on the banner, as ProductQuoteGrid does. The leading column belongs to rows (grip and `renderRowIndicator`), and banners span it anyway.
- Enable dragging per level (`reorderableGroups: boolean | ((depth) => boolean)`), since ProductQuoteGrid only reorders the outer level.

**Library check.**
- Groups are currently ordered by TanStack: by the sort on the grouping column when there is one, otherwise by first appearance. There is no hook to change that, so F1 has to come before F2.
- Group-namespaced ids are already how TanStack builds group row ids (parent id plus column and value), so two tasks can each have a group with the same name without their collapse state or subtotals merging. No change is needed for that.
→ F1, F2.

### 3. Empty groups (item 7)

- Where does an empty group sit — in its sorted position among real groups, at the end, or at an index the project gives?
- Does ProductQuoteGrid need empty groups at more than one level, or only empty tasks?
- Is "(Ungrouped)" a real empty band, or just the label for rows with a blank group value? The latter is already possible with `renderGroupLabel`.

**Today — ProductQuoteGrid** (`ProductGrid.tsx`, `gridStore.ts`)
- **Only empty tasks, only at the outer level.** The toolbar's Add Task (`handleAddTask`) creates a pending empty task with number *highest task number in use + 1000* (1000 if none) and the name "New Task". These live in `gridStore.pendingEmptyTasks`, not in row data.
- Inner groups are never empty: they only exist because a row has that group value. A new inner group is made by choosing "Create new group from selected" in the grouping menu, which assigns the selected rows straight away.
- **Position:** sorted by task number among the real tasks, so a new one lands at the end because its number is the highest. There is no separate position list.
- An empty task can be renamed (updates the pending entry) and dragged (renumbers it). Dropping rows on it assigns them to that task, and it becomes an ordinary task.
- **Under a filter**, empty tasks are hidden: a task header is only shown when one of its rows matches, or when it is collapsed (`visibleDisplayItems`).
- **"(Ungrouped)" is not an empty band.** It is only the label for rows whose group value is blank (`buildGroupedItems`). Dropping rows onto it sets their group to `''` (`handleRowDragEnd`). It is also renamable, which is how a pile of ungrouped rows becomes a named group.
- Related: with Field Service on, rows with no task are shown under the default task 1000, and an effect saves that assignment for real, so a "(No Task)" band never appears.

**Today — PriceListGrid.** Blank group values show as "(none)" (`components/PricelistGrid/GroupHeaderRow.tsx`). No empty groups.

**Suggested answer.**
- Sorted position, using the same group sort as Q2. That is all ProductQuoteGrid needs, and it avoids a second ordering mechanism.
- One level is enough for now. Keep `extraGroups[].path` so a deeper level can be added later without an API change.
- "(Ungrouped)" needs nothing new: `renderGroupLabel` covers the label. The only requirement is that dropping onto the blank group reports `toGroup` with value `''` (or `null`), which item 6 should already do. Add that as an acceptance check.
- Keep the acceptance rule "a filter hides empty groups", which matches today.

**Library check.** Dropping rows onto a blank-value band already reports that band's value in `toGroup`, as the rows hold it (`''`, `null` or `undefined`) — it is not normalised, so a project should treat all three as "ungrouped". → F3.

### 4. Double-click on a group banner

While `onGroupDoubleClick` is set, only the chevron collapses the group. The alternative is to delay the single-click collapse by ~250ms to see whether a double-click follows, which feels sluggish. Is chevron-only acceptable?

**Today**
- **ProductQuoteGrid:** already chevron-only. Collapse is a separate chevron `<button>`; double-click on the **label** opens Rename; right-click anywhere on the banner opens a menu whose only item is "Rename" (`ProductGrid.tsx`, `openHeaderContextMenu`, `handleRenameGroup`, `handleRenameTask`). Clicking elsewhere on the banner does nothing.
- **PriceListGrid:** a click anywhere on the banner collapses it; there is no double-click or right-click (`GroupHeaderRow.tsx`).

**Suggested answer.** Yes. Chevron-only while `onGroupDoubleClick` is set matches ProductQuoteGrid exactly, and PriceListGrid doesn't set it, so it keeps click-anywhere. Two small additions: attach the double-click to the label rather than the whole banner, so a double-click near the checkbox or grip doesn't open Rename; and keep Enter/Space on the focused banner toggling collapse, so keyboard users don't lose it when the click changes.

**Library check.** Enter and Space on a focused banner still toggle collapse while `onGroupDoubleClick` is set. The double-click is attached to the whole banner cell, so the label-only change is still to do. → F8.

### 5. Enter on a cell (item 5)

The original table asks for "F2 / Enter on a cell: edit with the whole value selected" *and* "Enter while editing: commit and move down". Because DataGrid's editors are always mounted, a focused cell is already "editing", so both can't hold. Enter is kept as commit-and-move-down, and F2 selects the value. Is that the right call for ProductQuoteGrid users?

**Today — ProductQuoteGrid** (`components/ProductGrid/EditableCell.tsx`)

Cells show text until edited, so there are two modes, but in practice users rarely see the first one:
- Enter, F2, a click, or a typed character on a cell switches it to an input.
- **Enter while editing** commits and calls `commitAndNavigate(…, 'ArrowDown')`. That focuses the cell below **and clicks it** (`focusAndEdit`), so the next cell opens straight into editing. Tab, Shift+Tab and the arrows do the same.
- On arrival, a **text** cell has its whole value selected (`el.select()`), so typing replaces it. A **number** cell is only focused, with the caret at the end: it is an `<input type="number">`, where `select()` throws, so typing *appends* unless the edit was started by typing on the resting cell.
- Left/right arrows while editing always commit and move, even with the caret in the middle of the text.
- Moving through a cell without changing it is not treated as an edit.

**Suggested answer.** Keep the decision. Holding Enter moves down a column, each cell arriving with its value selected, which is what ProductQuoteGrid users already get. Two follow-ups:
- Number cells in DataGrid should also select their value on arrival, if they don't already. That is better than today, where typing into a number reached by Tab appends.
- Left/right: DataGrid moves at the caret's edge, or always when the cell was reached by keyboard. ProductQuoteGrid users will mostly arrive by keyboard, so they won't notice. Clicking into a cell and pressing left to move the caret will now work, where today it jumps to the next cell. Mention this in the release notes rather than copying the old behaviour.

Not a grid feature, but check it doesn't clash: ProductQuoteGrid binds Ctrl+Z / Ctrl+Y (undo / redo) at the page level when focus is not in an editor. DataGrid's key handler should leave those keys alone.

**Library check.**
- Number cells already select their value on arrival (render test: Tab onto Qty), so the first follow-up needs no work.
- Ctrl+Z and Ctrl+Y are not touched by the grid's key handler.
→ F13 for the release note; nothing else.

### 6. Subtotal label (item 8)

How should "Subtotal · Group (n)" span the leading columns? Options: a `renderSubtotalLabel(ctx)` placed in the first cell with `colSpan` across the leading columns that have no total; or a fixed label with the count. Which leading columns count — up to the first column with a subtotal?

**Today — ProductQuoteGrid** (`ProductGrid.tsx`, the `item.type === 'subtotal'` branch and the `<tfoot>`)
- **Subtotal row:** the drag-handle and select cells are left blank. The label goes in the **first data column**, with `colSpan` over that column and each next one **until the first column that has a subtotal value**, minimum 1.
  - Only `summary: 'sum'` columns stop the span. The derived GP% columns (see Q7) have no `summary`, so they don't stop it, but they sit after the money columns, so in practice the label ends at Qty or the first money total.
  - Hidden columns are skipped: the span is counted over visible headers.
- **Text:** `Subtotal · {group name} ({count})`, with "(Ungrouped)" for a blank group. The count leaves out pending-delete rows.
- **Look:** 11px, weight 600, uppercase, letter-spacing 0.4px, `colorNeutralBackground3` fill, a top border, the same height as a group banner (`subtotalRow` / `subtotalCell` in `productGridShared.ts`).
- **When shown:** only when the "Show subtotals" option is on **and** there are two or more groups. In Field Service mode that is checked per task: a task with a single inner group gets no subtotal. There is **no task-level subtotal row**.
- **Filtering:** subtotals are summed over the *visible* rows, so they follow the column filters and "Identify issues".
- **Footer is different:** it has **no label at all** (the drag and select cells are one blank cell). It is sticky at the bottom with a `colorBrandBackground2` fill, and it sums **all** rows except deleted ones, **ignoring the filter**. So under a filter the footer and the sum of the subtotals disagree. That may be deliberate (the footer is the quote total) and should be kept.

**Suggested answer.**
- Span up to the first visible column that has a subtotal, as today. Use "has a `summary`" (including function summaries) as the rule rather than "has a value", so the span doesn't change from group to group.
- Offer `renderSubtotalLabel(ctx: DataGridGroupContext)` with a default of `{label} ({count})`. ProductQuoteGrid returns `Subtotal · …`, and the count honours `includeInSummary`, the same as group banners.
- Give the footer the same slot (`renderFooterLabel`), defaulting to nothing, so ProductQuoteGrid is unchanged and other grids can print "Total".
- Document that subtotals follow the filter. Say which rows the footer uses, or add `footerScope: 'filtered' | 'all'`, since ProductQuoteGrid depends on "all".

**Library check.**
- Subtotals follow the filter, as ProductQuoteGrid's do.
- The footer does not match either suggested behaviour. It uses the rows currently in the row model: filtered, and **missing rows inside collapsed groups**. So `footerScope` needs a fix to go with it, and `'filtered'` should mean "every row passing the filter", not "every row on screen".
- The subtotal row has no label cell today; every cell holds its column's total or nothing.
→ F4, F5.

### 7. Formatting a function summary (item 8)

A number returned by a function summary is formatted like the column. Is a `summaryFormat` option needed for a total whose unit differs from the column's? (First asked on the premise that ProductQuoteGrid's MU/GP column shows `$` or `%` per row; it doesn't — see the correction below.)

**Correction.** The MU/GP column does **not** change unit per row. `hnc_markupper_override` is `dataType: 'decimal'` (`config/columns.ts`), and `formatCellValue` shows every decimal as a plain number with 2 decimals and no symbol (`utils/formatting.ts`, `formatDecimal`). Money columns are the only ones with a currency symbol. What *does* change is the **header**: "GP %" or "Markup %", depending on the parent record's pricing method (`ProductGrid.tsx`, column `header`).

**Today — ProductQuoteGrid** (`summaries` and `subtotals` in `ProductGrid.tsx`)
- Two columns get a calculated figure rather than a sum, and neither has `summary` in its config:
  - **Actual GP% (`hnc_markuppercent`)**, following the pricing method: GP = profit ÷ sell × 100; Markup = profit ÷ (sell − profit) × 100.
  - **MU/GP % (`hnc_markupper_override`)**: **always** profit ÷ sell × 100, even while the header reads "Markup %".
- Both use totals of `baseamount` (Total Ex.) and `__profit_total` (Gross Profit), and are only set when total sell is not zero.
- Both are shown as 2-decimal numbers, the same as the cells above them.
- The MU/GP total always being GP while the header can say Markup looks like a bug. Check with the team before copying it into the migration.

**Suggested answer.** No `summaryFormat` is needed for either project: formatting a returned number like the column produces exactly what ProductQuoteGrid shows today. Keep "string or node renders as is" as the escape hatch. Two smaller points:
- The function should be able to read *other columns' totals*, or the project has to add up Total Ex. and Gross Profit again inside each function. Either pass the group's computed sums in `ctx` (e.g. `ctx.summaries: Record<string, unknown>`), or document that the function should re-sum from `rows` and `readValue`.
- Returning `null` should leave the cell blank, which ProductQuoteGrid needs when total sell is zero.

**Library check.**
- A `null` or `''` result already leaves the cell blank.
- A number is formatted with the column's `format`, or its data type and precision, and wears its affixes. A `decimal` column's total shows as a plain 2-decimal number, matching ProductQuoteGrid.
- The function receives only `rows`, `readValue` and `rowIds`, with no other columns' totals.
→ F7.

### 8. Forced columns in the picker (item 9)

Columns hidden by `forceHiddenColumns` are listed but disabled. Should Customer View remove them from the picker entirely? Should the standalone `DataGridColumnPicker` export get `columnGroup` headings too? Only the built-in toolbar's picker has them now.

**Today — ProductQuoteGrid** (`components/ProductGrid/ProductGridToolbar.tsx`, Show/Hide columns menu; `ProductGrid.tsx`, `effectiveColumnVisibility`; `store/gridStore.ts`)
- One menu with three sections:
  1. **Groups:** checkboxes for Description, Ratings, Other Fields, Vendor Quote Info, plus a **Customer View** checkbox.
  2. **Columns:** a *flat* list of every non-hidden column, then Show all and Reset columns.
  3. **Views:** Default (reset), each saved view (Apply / Rename / Delete), and "Save current as view…".
- Groups are **not headings over their columns**. Each group is a single on/off flag that changes which columns are visible by default; the column list below doesn't show which group a column belongs to.
- **Customer View changes the columns section in no way.** Sensitive columns stay listed and enabled, and their checkbox shows the user's own choice (`visibleColumnKeys` ignores Customer View). So with Customer View on, a cost column can show as ticked but not appear, and ticking it does nothing until Customer View is off. When Customer View is turned off, the user's earlier choices come back, because Customer View is applied on top rather than written into the saved visibility.
- Group flags and Customer View are saved **globally**, not per scope; column visibility, order and widths are saved **per scope** (entity and quote type). A saved view captures all of them together: order, widths, column visibility, group flags and Customer View.

**Suggested answer.**
- Keep forced columns **listed but disabled**, with a tooltip such as "Hidden by Customer View", and show them unticked. That is clearer than today's ticked-but-hidden, and it keeps the list stable when Customer View is toggled; removing them makes columns jump around.
- A `forceHiddenReason` (string, or per column) would let ProductQuoteGrid say *why*.
- Yes, give the standalone `DataGridColumnPicker` the same `columnGroup` headings, since ProductQuoteGrid will probably keep its own toolbar and use the picker inside it.
- `columnGroup` as headings is a change from ProductQuoteGrid's "group = one toggle" model, but a better one. The migration maps `visibilityGroup` to `columnGroup`, and the group toggles become the heading checkboxes. The one thing ProductQuoteGrid has that headings don't: a group flag also changes the *default* visibility of its columns. Check whether `columnGroup` toggles write the user's visibility (fine) or need a separate "group default" (probably not needed).
- `getLayout()` doesn't include Customer View or group flags. That's correct: those belong to the project, so ProductQuoteGrid saves them next to the layout in its own views.

**Library check.**
- Forced columns are already listed, disabled and unticked in the built-in toolbar's picker, because the tick reads what is on screen. There is no tooltip saying why.
- A `columnGroup` toggle writes the user's own visibility, never a separate default, and skips forced columns.
- The standalone `DataGridColumnPicker` has no groups and does not know about forced columns.
- `getLayout()` holds only the grid's layout, as the suggested answer expects.
→ F10.

### 9. Editable hint look (item 10)

The hint is a 2px `colorBrandStroke2` underline. What does ProductQuoteGrid's `CELL_STYLE_TOKENS.editableHint` actually use, so the two match?

**Today — ProductQuoteGrid** (`config/cellStyleTokens.ts`, `components/ProductGrid/EditableCell.tsx`, `productGridShared.ts`)
- Token: `editableHint.border = tokens.colorBrandBackgroundStatic`.
- Look: a **1px solid bottom border** in that colour. The resting cell already has a transparent 1px border on all four sides, so turning the hint on doesn't shift anything.
- Applies only when "Show editable fields" is on (Options menu; saved globally) **and** the cell is editable: not on read-only, locked, deleted or read-only-grid cells.
- Cells with a prefix (the [SAP] badge or the cost/price arrows) get the underline on the wrapper, so it runs under the badge as well as the value (`cellWithPrefixHint`). Cost Origin, which has its own editor, is wrapped the same way (`editableHintCell`).
- The same token is used as `accent-color` for the grid's native checkboxes, overriding Dynamics' purple accent.

**Suggested answer.** Change the library to a 1px `colorBrandBackgroundStatic` bottom border, drawn so it doesn't change the cell's height, e.g. an inset box-shadow or an always-present transparent border. Put it on the whole cell, including affixes, so it matches the prefix case. Consider using the same token as `accent-color` for boolean checkboxes inside the grid, which ProductQuoteGrid relies on to avoid Dynamics' purple.

**Library check.**
- The hint is already an inset box-shadow on the whole `<td>`, so it runs under affixes and never changes the cell's height. Only the width and colour need to change.
- Boolean checkboxes in the grid are Fluent `Checkbox`, which draws its own box rather than using `accent-color`. The row and group selection boxes are native inputs, where `accent-color` applies.
→ F9.

### 10. Lookup cells under a cell state (item 1)

Lookups render with `appearance="filled-darker"` and their own surface, which covers a cell state's background. Should lookups go transparent at rest in a stated cell, as inputs and choices now do?

**Today**
- **ProductQuoteGrid:** no Fluent `Lookup` in cells. Lookups are read-only coloured pills (`CellDisplay displayAs="pill"`, brand background) that open the record in Dynamics. No rule state is ever put on a lookup column. The only editable lookup-like cell is the product picker on a blank new row.
- **PriceListGrid:** lookups (Product Name, Price List Rule) are `Lookup` with `filled-darker` (`components/PricelistGrid/cells.tsx`, `RecordLookupCell`). None of the columns the pricing rules style is a lookup (`RULE_STYLED_FIELDS` in `config/cellRules.ts` covers sync, costs, sell prices and the override/rule value and method fields). The rules put their state on the choice cells (Override Method, Rule Method), which item 1 already handles.

**Suggested answer.** Not needed by either project, so leave it for now and don't block migration on it. If it is done later, make it the same "transparent at rest, filled while focused" rule as inputs, so every control behaves the same. Record it as a known limitation in `docs/DataGrid.md`.

---

### Also found while gathering context

Not open questions. Each is now folded into the item it belongs to; the library check says where.

- **Row flash (item 10).** ProductQuoteGrid's finder scrolls the row to the **centre** with smooth scrolling, outlines it for **2000ms**, and does nothing if the row is inside a collapsed group (`ProductGrid.tsx`, `highlightRowId`).
  **Library check:** `highlightRow` already centres the row, without smooth scrolling. It defaults to 1500ms. For a row in a collapsed group it scrolls nowhere but still sets the outline. → F11.
- **Dropping on a task header (item 6).** In ProductQuoteGrid, dropping rows directly on a *task* header puts them at the start of that task **and clears their inner group** (the search for a group header stops at the task header, so the group resolves to `''`). Dropping on an inner *group* header keeps that group.
  **Library check:** already so. A header drop's `toGroup` is the path down to that header, so a drop on a depth-0 header contains only the outer level.
- **Row drop position (item 6).** ProductQuoteGrid inserts **below** the target row when dragging down within the same group, and **above** otherwise (including every cross-group drop). It then gives the moved rows new `lineitemnumber`s between the neighbours, in steps of 10.
  **Library check:** `toIndex` is the target row's current index — "in this row's slot", not "before this row". That is enough to work out above or below. → F13, to document it.
- **Group checkbox (item 4).** ProductQuoteGrid's group and task checkboxes select only rows that are currently *visible* (after filters and collapse), and clearing them leaves hidden selections alone.
  **Library check — this does not match.** The first draft of this note said it did; it doesn't. DataGrid's group checkbox acts on every row in the group that passes the filters, **including rows inside a collapsed group**. Its tick and partial state are worked out over the same set. Clearing leaves selections outside the group alone. → F12.
