# Changelog

> Version format: `YYYY.M.DD` (e.g., `2026.8.30` = August 30, 2026)

## 2026.9.5

- 🐛 Widened the `@fluentui/react-calendar-compat` peer range to `^0.3.0 || ^0.4.0`. It was pinned
  to `^0.3.0`, so any consumer already on 0.4.x — which current Fluent installs pull in — hit an
  `ERESOLVE` failure and could not install this package at all. Only `Calendar` is imported from it
  and that export is unchanged; the library typechecks, tests and builds against 0.4.6.

## 2026.9.4

> Published first as `2026.8.72`, which carried the wrong month. Same contents; use this one.

- ✨ **[FluentShell](docs/FluentShell.md)** — the outermost element of a Dynamics 365 web resource,
  sizing the app to whatever chrome hosts its iframe. The correct gutter is not a constant: it depends
  on what the host already pads and on where the form's content column sits, and both move with the
  window and the D365 release. The shell walks its own iframe's ancestors for the padding already
  applied, lines its edges up with the form column, and adds only the difference. Ships a console API
  (`__fluentShell`) for measuring and tuning a deployed web resource without a rebuild.
- ✨ **[FluentContainer](docs/FluentContainer.md)** — a card matching the surface D365 draws on a
  model-driven form, measured from a live form rather than approximated: `shadow4`, an 8px radius, and
  a *transparent* hairline border. Clipping is opt-in via `scrolls`, because a shadow paints outside
  the border box and any ancestor clipping at the card's own bounds erases it — a bug that reads as
  "the card looks slightly flat" rather than as anything obviously wrong. In development the container
  warns when its nearest clipping ancestor is too tight; the check compiles out of production.
- ✨ **[D365TestHarness](docs/D365TestHarness.md)** — a local stand-in for the Dynamics 365 form that
  hosts a web resource. On a bare dev server there is no chrome to measure, so `FluentShell` falls
  back to its standalone behaviour and the layout being developed is not the one that ships. The
  harness hosts the app in a genuine same-origin iframe and reproduces the geometry a live form
  measures, so the same gutters resolve locally as in the org. Content is rendered into the frame
  with Fluent's own cross-document support — a Griffel renderer bound to the frame's document —
  rather than by copying stylesheets across. Inactive outside a local host, so the wrapper ships to
  Dynamics as a no-op.
- 🔧 **The test harness is now a simulated Dynamics form.** Every example renders inside a
  `D365TestHarness`, so components are judged at the width and against the chrome they will really
  have, and the component list is the sitemap rather than a tab strip. Each page opens with when to
  reach for the component and when to reach for something else, and each example carries a "Show
  code" panel.
- 🔧 **`npm run gen:samples`** generates those snippets. Per-section samples are the library elements
  lifted from the example files' own source, so the code shown is the code running; per-page samples
  come from the README, whose blocks `verify:readme` compiles. The script also inserts the panels, so
  a new example gets one by being written. Idempotent, and it fails loudly if a source heading moves.
- 🔧 A **Documentation** tab gathers the guidance and every snippet into one reference, assembled
  from the same sources the pages use — so it cannot fall out of step with them.
- 🐛 The ParentPortal harness example imported `../../src/components/ParentPortal`, one level short,
  so it failed to resolve and was never wired to a tab. `tsconfig.json` covers `src/**/*` only, so
  `npm run typecheck` does not see the harness and could not catch it.
- 📝 Component documentation moved to `docs/`, with the README carrying a short showcase and a
  "read more" link. The README is close to the ~64KB cap npm applies to the package page, and two
  components' full reference would have pushed it past — `docs/` is not in `files`, so it costs
  nothing in the published tarball.

- ✨ **[ParentPortal](README.md#parentportal)** — new component that renders Fluent UI content in the
  parent document, escaping iframe boundaries with full Griffel styling and theme token sync. Designed
  for Dynamics 365 web resources where dialogs must float above the D365 page without causing iframe
  resize or scrollbars.
- ✨ **[CommandBar tooltips](README.md#tooltips)** — commands take Fluent tooltips in three forms:
  `title` for a plain line, `title` + `description` for the Fluent 2 rich tooltip, and `tooltip` for
  a fully custom element. `description` accepts markup, so it can carry its own emphasis.
- 🐛 A tooltip on a command with a visible label now appears on hover. Previously tooltips were
  rendered only for icon-only commands, so `title` on a labelled command did nothing.
- 🐛 Fixed tooltips on commands with `subItems`. The tooltip wrapped the `Menu` rather than the
  button inside it, so the ref and hover handlers landed on a component that could not use them and
  the tooltip never opened.
- ♿ The tooltip's `relationship` is now derived from whether the command has a visible label:
  `label` for icon-only commands, `description` otherwise, so a labelled command no longer risks
  announcing its explanation in place of its name.
- 📝 Release history moved out of the README into this file. The README had grown past the ~64KB
  cap npm applies to the readme shown on the package page, so it was being truncated mid-sentence
  and the page rendered without it.

Seven new Dynamics 365 components, plus the shared Web API client they sit on.

- ✨ **[SystemUserPersona](README.md#systemuserpersona)** — a `systemuser` persona with the contact card a
  persona shows on a model-driven form. Loads lazily on hover intent; the record photo is addressed
  by URL rather than selected inline, since `entityimage` is binary and bloats every response.
- ✨ **[OwnerLookup](README.md#ownerlookup)** — a preconfigured `Lookup` for `ownerid`, which is polymorphic:
  an owner is a systemuser *or* a team. Both are searched in parallel, results render as personas or
  team glyphs, selections show as the usual Lookup badges, and multi-select comes from Lookup.
- ✨ **[Lookup hover cards](README.md#hover-cards)** — `showHoverCard` adds a lazy record card to the dropdown
  rows, the resolved badge, or both. Supply `hoverCardColumns` to have it fetched from the Web API,
  or `renderHoverCard` to build the body yourself. Nothing loads until a pointer settles.
- 🔧 **[Generated documentation screenshots](README.md#documentation-screenshots).** `npm run shots` captures
  each component in isolation via `?shot=<id>`, populated from fixtures rather than a live org.
- ✨ `open` on `OptionSetField` and `RecordHoverCard` for rendering an expanded state without
  driving a pointer — used by the captures, and useful in tests.

- 💄 **`filled-darker` is now the default appearance** across every field component — Lookup,
  QueryBuilder, DateTimeField and OptionSetField — matching native Dynamics 365. Fluent's default is
  `outline`. **Breaking for anyone relying on the previous outline look**; pass
  `appearance="outline"` to restore it. See [Appearance](README.md#appearance).
- 💄 **Resolved lookups now render like Dynamics at rest**: table icon or entity image, the record
  name as a link, and a magnifier in place of the chevron. New `entityIcon`, `entityImage`,
  `recordLinkAppearance` and `onRecordClick` props.
- 🐛 **Attribute metadata requests failed against live environments.** `Format` was included in the
  `$select` against the base `Attributes` collection, but it is declared on derived types — Dynamics
  rejects the whole request with *"Could not find a property named 'Format' on type
  'Microsoft.Dynamics.CRM.AttributeMetadata'"*. `Format` and `DateTimeBehavior` are now fetched
  through cast segments and merged in, which also means `DateTimeField`'s metadata auto-load works
  (it could never have resolved a behavior before).

- ✨ **[CommandBar](README.md#commandbar)** — commands that no longer fit collapse into a "More commands" menu
  instead of wrapping or being clipped. Widths are measured from the DOM rather than estimated.
- ✨ **[EntityGrid](README.md#entitygrid)** — a subgrid with columns named from entity metadata, server-side
  paging via `Prefer: odata.maxpagesize` and `@odata.nextLink`, server-side sorting, and lookups
  rendered from their formatted-value annotations rather than as GUIDs.
- ✨ **[DateTimeField](README.md#datetimefield)** — respects the attribute's `DateTimeBehavior`, so `DateOnly`
  and `TimeZoneIndependent` values never pass through UTC and cannot drift a day.
- ✨ **[OptionSetField](README.md#optionsetfield)** — optionset and multi-select picklist field that reads
  global option sets as well as local ones, and round-trips multi-selects as the comma-separated
  string Dynamics stores.
- ✨ **[RecordHoverCard](README.md#recordhovercard)** — lazy record loading gated on hover intent, so dragging
  a pointer across a grid column does not fire a request per row.
- ✨ **[Web API client](README.md#web-api-client)** — one client with a process-wide metadata cache shared by
  the new components. Promises are cached rather than values, so components mounting in the same tick
  share a round trip; failures are not cached. Lookup and QueryBuilder are not yet migrated onto it.
- 🔧 Test harness split into one tab per component.

## 2026.8.40

QueryBuilder layout and query options.

- 🐛 **Toolbar was crushed when the query grew.** In a height-constrained parent the header and
  toolbar were the only flex items able to shrink, so they were compressed and clipped instead of
  the filter list scrolling. Header and toolbar are now pinned, and the filter groups plus previews
  scroll together as one region. See [Layout and Scrolling](README.md#layout-and-scrolling).
- ✨ **Root `<fetch>` query options.** Generated FetchXML now carries `mapping`, `no-lock` and
  `distinct`, matching what the Dynamics advanced-find editor emits. `distinct` defaults to `true`.
  New `distinct`, `noLock` and `top` props override per instance, and options on an imported query
  are preserved through a serialize round-trip rather than silently dropped.
- ✨ Preview cards grow to fit their content instead of scrolling internally.
- 💄 Component header now reads "Query Builder: {entity}" rather than "Edit filters: {entity}".
- 🔧 Test harness split into **Lookup** and **Query Builder** tabs.

## 2026.8.36

QueryBuilder field-type and FetchXML correctness pass.

- 🐛 **Every field resolved as `string`.** `dataTypeFromAttribute` compared `AttributeTypeName.Value`
  (which is suffixed — `MoneyType`, `PicklistType`, `BooleanType`) against unsuffixed names, so only
  lookups were typed correctly. Money fields offered "Contains", optionsets rendered a text box, and
  booleans never reached their branch.
- 🐛 **Optionset and boolean options were never loaded** for main-entity fields. The component's field
  loader fetched attributes and lookup targets but no option metadata.
- 🐛 **Global option sets returned no options** — only `OptionSet` was expanded, never `GlobalOptionSet`.
- 🐛 **Boolean fields** now use their Dynamics labels ("Allowed" / "Not Allowed") instead of hardcoded
  Yes/No, and match on truthiness so a saved `value="1"` no longer displays as "No".
- 🐛 **"Does Not Contain" produced invalid FetchXML** (`operator="not-contain"`, which does not exist).
  Now serialized as `not-like` with `%` wildcards.
- 🐛 **Date picker shifted the day** in UTC+ timezones — `toISOString()` converted local midnight to
  the previous UTC day.
- 🐛 **`IsValidForAdvancedFind` was never requested**, so the filter meant to hide non-filterable
  attributes did nothing.
- 🐛 **"Has Value" left the value box enabled**; no-value operators now disable it correctly.
- 🐛 **"Last X Days" rendered a date picker** instead of a number input.
- 🐛 **`not-between` and fiscal period-and-year operators had no second value input.**
- 🐛 **`link-entity` guessed `from="<entity>id"`**, which is wrong for activity entities
  (`email`, `task`, `appointment` all use `activityid`). Now uses `PrimaryIdAttribute`.
- 🐛 **Invalid OData output.** Untranslatable operators were emitted as a `/* comment */` in the filter
  string; nested related-entity conditions were silently coerced to `eq`. Both are now omitted.
- ✨ **Edit FetchXML** toolbar button — opens the current query as editable FetchXML to tweak or paste
  over (`showEditFetchXmlButton`).
- ✨ **Show/Hide OData and FetchXML** toolbar toggles (`showPreviewToggleButtons`).
- ✨ `QueryBuilderApplyResult.odataUnsupported` reports conditions OData cannot express, surfaced as a
  warning in the OData preview. New `isOperatorConvertibleToOData` helper.
- ✨ Option metadata is fetched once per attribute type rather than once per field.
- 💄 Softer, more rounded containers matching other Dynamics surfaces.
- ⚠️ **Breaking:** `odataUnsupported` is a required field on `QueryBuilderApplyResult`. Consumers only
  reading the result are unaffected; anyone constructing the type will need to add it.

## 2026.8.30

- ✨ Added multi-entity filter pattern with drill-down header ("← All" back button) in test harness
- ✨ Added "Details Only (No Secondary Text)" example to test harness
- ✨ Support for React elements in `secondaryText` and `details[].value` (Badges, icons, styled text)
- ♻️ Improved `aria-selected`/`aria-disabled` attribute handling
- 📝 Documentation overhaul with complete API reference and examples

## 2026.6.12

- ✨ Added React 19 support to peerDependencies
- 📝 Updated README with cross-document support documentation

## 2026.2.19

- 🐛 Fixed cross-document dismiss in Dynamics 365 iframes using `ownerDocument`

## 2026.2.17

- 🐛 Removed `requestAnimationFrame` — handler registers immediately
- 🐛 Switched to capture phase for dismiss handler to prevent D365 DOM interference

## 2026.2.15

- ✨ Added controlled `open` and `onOpenChange` props for programmatic dropdown control
- 🐛 Removed `requestAnimationFrame` from dismiss handler

## 2026.2.13

- ♻️ Rebuilt popup from scratch using custom element (Fluent UI Popover had unexpected behavior)

## 2026.2.11

- 🐛 Added `onOpenChange` callback to sync internal state with Popover dismiss events (outside click, Escape, focus loss)

## 2026.2.10

- 🐛 Fixed Lookup not allowing space character in search input

## 2026.2.8

- ✨ **QueryBuilder**: Native API integration for field metadata
- ✨ **QueryBuilder**: Lookup field support with related entity validation

## 2026.2.7

- ♻️ Removed `Xrm` global dependency — now uses native `/api/data/v9.2/` fetch calls

## 2026.2.6

- ♻️ **QueryBuilder**: Refactored to reuse shared components and styles

## 2026.2.5

- ✨ **QueryBuilder**: Initial release (beta) — Advanced Find-style query builder
- ♻️ **Lookup**: Changed from options-only to popup-based rendering

## 2026.2.3

- ✨ Added `id` prop — auto-generated if not provided

## 2026.2.2

- 🐛 Fixed classic JSX transform for React 16 compatibility
- ✨ Added React 16.8+ support

## 2026.2.1

- 🎉 Initial release
- ✨ Lookup component with async search, expandable details, header/footer
