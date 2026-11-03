---
name: fluentui-extended
description: Build Dynamics 365 / Dataverse UI with the fluentui-extended React library (Fluent UI v9) so it looks and behaves like a native model-driven app. Use when code imports 'fluentui-extended'; when building a D365 web resource, custom page or React app that must match the Dynamics 365 look and feel; or when you need a lookup (including hierarchical), choice / option set field, Dataverse date field, owner or user picker, editable grid, Advanced Find style query builder, command bar, record hover card, or a layout that fits a D365 form iframe.
---

# fluentui-extended

React components on Fluent UI v9 that reproduce what Dynamics 365 draws natively: lookups,
choices, dates, owners, editable grids, Advanced Find, command bars, record cards, and the shell a
web resource sits in. They also absorb the Dataverse details a plain Fluent control gets wrong
(DateOnly drift, global option sets, multi-select picklists stored as `"1,2"`, polymorphic owners).

Reach for a component here before hand-building one from raw Fluent. The point of the library is
that it already looks like Dynamics; most mistakes come from restyling it until it no longer does.

## Setup

```bash
npm install fluentui-extended @fluentui/react-components @fluentui/react-icons \
  @fluentui/react-datepicker-compat @fluentui/react-calendar-compat
# DataGrid only (optional peers):
npm install @tanstack/react-table @tanstack/react-virtual @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

```tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { FluentShell, setWebApiBaseUrl } from 'fluentui-extended';

// Inside Dynamics the default relative path (/api/data/v9.2) already works - skip this.
// Standalone or on a dev server, point at the org or at your dev proxy:
setWebApiBaseUrl(import.meta.env.DEV ? '/api/data/v9.2' : `${window.location.origin}/api/data/v9.2`);

<FluentProvider theme={webLightTheme} style={{ height: '100%' }}>
  <FluentShell>{/* app */}</FluentShell>
</FluentProvider>;
```

Metadata-aware components (`OptionSetField`, `DateTimeField`, `EntityGrid`, hover cards, owner and
user search, `useHierarchyLookup`) call the Web API through one shared client. Supply your own
transport with `setWebApiFetch(fn)` when you hold a token or an `Xrm`-backed fetch. Local
development against a real org needs a dev-server proxy; see `references/layout.md`.

## Pick the component

| You need | Use | Reference |
| --- | --- | --- |
| A lookup field (search a table, pick a record) | `Lookup` | fields.md |
| A lookup over a parent/child table (account → parent account, categories) | `Lookup` + `hierarchical`, or `useHierarchyLookup(table)` | fields.md, dataverse.md |
| `ownerid` (user **or** team) | `OwnerLookup` | fields.md |
| An address with Google Places search | `AddressLookup` | fields.md |
| A choice / option set / multi-select picklist | `OptionSetField` | fields.md |
| A date or date-time attribute | `DateTimeField` (`DateTimeRangeField` for a range) | fields.md |
| A person (created by, owner, assigned to) | `SystemUserPersona` | fields.md |
| A card on hover for any record reference | `RecordHoverCard`, or `showHoverCard` on `Lookup` | fields.md |
| An editable, virtualised grid over rows you load | `DataGrid` | grids.md |
| A read-mostly subgrid straight from the Web API | `EntityGrid` (beta) | grids.md |
| Advanced Find / filter builder, FetchXML in and out | `QueryBuilder` | grids.md |
| A ribbon / command bar that overflows into "More" | `CommandBar` | grids.md |
| The outer frame of a web resource | `FluentShell` | layout.md |
| A form-style card section | `FluentContainer` | layout.md |
| A dialog that covers the whole D365 page, not just the iframe | `ParentPortal` | layout.md |
| A local stand-in for the D365 form hosting your web resource | `D365TestHarness` | layout.md |
| Raw Dataverse calls (metadata, users, owners, hierarchies) | `webApiGet`, `getEntityDefinition`, ... | dataverse.md |

## Look like Dynamics

**Leave the defaults alone.** Every field component defaults `appearance` to `filled-darker` —
grey fill, no outline, a brand underline when focused — because that is how Dynamics draws a field.
Fluent's own default is `outline`, which reads as foreign on a model-driven form. Do not pass
`appearance="outline"` to make it "look like the other inputs"; change the other inputs instead.

**Match the control to where it sits.** The same value is drawn differently by context, and
getting this wrong is the most common way a page stops looking native:

| Where | How |
| --- | --- |
| Form section | Defaults (`filled-darker`, medium). Fields are column-width, not page-width (about 420px max). Labels via the component's `label` prop or a Fluent `<Field label>`. Sections inside `FluentContainer`. |
| Grid cell | Use `DataGrid` column `dataType`s (`'lookup'`, `'choice'`, `'date'`, `'money'`, ...). The grid draws each cell as its **value** — no field fill, border or underline — and the *cell* carries the single focus ring and turns white while active. If a custom `renderCell` must hold a library field, pass it `inline` (and `size="small"`); without it a `Lookup` / `OptionSetField` / `DateTimeField` keeps its form styling and draws a box inside the cell ("window in a window"). |
| Dense surfaces: query rows, toolbars, filter panels | `size="small"` on field components. |
| Dialog in a web resource | `const mountNode = useParentPortalMount()` and `<DialogSurface mountNode={mountNode}>`, so the dialog covers the whole D365 page rather than the iframe. `<ParentPortal>` is for non-portal content. A `Lookup` inside the dialog takes the same `mountNode`, or its list renders back in the iframe. |
| Page frame | `FluentShell` outermost and nothing below it sets an outer margin; the two compound invisibly. |
| Value shown but not editable | `Lookup readOnly` (keeps the record link and hover card) rather than `disabled` (greyed, reads as broken). A read-only grid boolean shows a tick/cross icon, not a disabled checkbox. |

**One box per value.** Do not wrap library fields in your own bordered or shaded container, and
do not add a second focus ring. Nested chrome is what makes a custom page look home-made next to
a native one.

**Records read as links.** Give each `LookupOption` its `entityName` (and `recordId` when the key
is not the GUID): the resolved value then renders as a link that opens the record, and hover cards
can fetch it. People render as `SystemUserPersona`, as Dynamics does for created-by / owner columns.

**Use the theme, not colours.** Style with Fluent `tokens` and `makeStyles`; hex values break dark
mode and high contrast. Option set colours come from metadata (`showColors` / `asBadge`).

## Dataverse rules the components rely on

- **Dates** — pass the attribute's `DateTimeBehavior` (or `entityName` + `attributeName` so the
  field reads it). `DateOnly` values must not go through a timezone conversion or they drift a day.
- **Choices** — `OptionSetField` reads global option sets as well as local ones, and accepts and
  emits the multi-select picklist's stored `"1,2"` form (`parseSelectedValues`, `formatMultiSelectValue`).
- **Server-side search** — `onSearchChange` + `disableClientFilter` + `loading`, and keep the pick
  in `selectedOption` (not `selectedKey`): the options change with every keystroke and a key alone
  stops resolving.
- **Hierarchies** — choices have none in Dataverse; supply `parentValue`. Tables can: a
  self-referential relationship marked hierarchical (account, business unit, product, custom
  tables). `useHierarchyLookup('account')` reads it from metadata and wires a `Lookup` in one line.
- **Owners** are polymorphic (user or team); use `OwnerLookup`, not a `Lookup` over `systemuser`.

## Mistakes to avoid

- Restyling fields to `outline`, or adding borders, shadows or backgrounds around them.
- Library field components in a DataGrid `renderCell` (or any table cell / list row) without `inline`.
- `selectedKey` with server-side search — the selection vanishes when results change.
- Client-filtering results the server already filtered (forgetting `disableClientFilter`).
- Dialogs rendered inside the web resource iframe instead of through `useParentPortalMount`.
- DataGrid `'lookup'` columns without `getLookupValue`: a stored id then shows as raw text.
- DataGrid `'choice'` values that are not numbers: they display, but editing converts with `Number()`.
- Rebuilding a hierarchy's `level` yourself — pass only the parent; the level is derived.
- Unstable `data` / `columns` arrays to `DataGrid` (recreated each render) — memoise them.
- `VITE_`-prefixed secrets: Vite ships them to the browser. Keep secrets in the dev proxy.

## References

- `references/fields.md` — Lookup (incl. hierarchy), OwnerLookup, AddressLookup, OptionSetField,
  DateTimeField, SystemUserPersona, RecordHoverCard.
- `references/grids.md` — DataGrid, EntityGrid, QueryBuilder, CommandBar.
- `references/layout.md` — FluentShell, FluentContainer, ParentPortal, D365TestHarness, local dev.
- `references/dataverse.md` — the Web API client, metadata, users and owners, hierarchies.

The package README (`node_modules/fluentui-extended/README.md`) has every prop table, and the repo's
test harness (`pnpm run harness`) shows each component running in a mock model-driven form.
