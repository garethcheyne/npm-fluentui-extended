import type * as React from 'react';
import type {
  Cell,
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnSizingState,
  ExpandedState,
  GroupingState,
  Header,
  Row,
  SortingState,
  Table,
  TableOptions,
  VisibilityState,
} from '@tanstack/react-table';
import type { CommandBarItem } from '../CommandBar';
import type { SystemUserRecord } from '../../api/systemUser';

/**
 * Row shape the grid works with. A record of columns keyed by their `key`, which
 * is all the grid needs — anything richer belongs to the consumer and reaches
 * cell renderers through `row.original`.
 */
export type DataGridRow = Record<string, unknown>;

/**
 * What a column holds. This drives alignment, the default formatter, the
 * default editor, sorting and aggregation, so it is worth getting right even
 * when a custom `renderCell` is supplied.
 */
export type DataGridDataType =
  | 'string'
  | 'multiline'
  | 'integer'
  | 'decimal'
  | 'money'
  | 'percent'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'choice'
  | 'lookup'
  | 'image';

export type DataGridAlign = 'left' | 'center' | 'right';

/** Footer and group-subtotal aggregation. */
export type DataGridSummary = 'sum' | 'avg' | 'count' | 'min' | 'max';

/** What a function summary is handed alongside the rows it covers. */
export interface DataGridSummaryContext<T extends DataGridRow = DataGridRow> {
  /** Effective value of a column on one of the rows, unsaved edits included. */
  readValue: (row: T, columnKey: string) => unknown;
  /** Ids of the rows, in the same order. */
  rowIds: string[];
}

/**
 * A calculation over the rows in a group or the whole grid.
 *
 * For totals the built-in kinds cannot express: a GP% that is total profit over
 * total sell is a ratio of two sums, not the average of each row's percentage.
 * A number or string result is formatted like a cell in the column; anything
 * else is rendered as it is.
 */
export type DataGridSummaryFn<T extends DataGridRow = DataGridRow> = (
  rows: T[],
  ctx: DataGridSummaryContext<T>,
) => unknown;

/** Row height presets. Compact is deliberately tight — pixels are rows of data. */
export type DataGridDensity = 'compact' | 'comfortable' | 'spacious';

/** Row height metrics for one density, in pixels. */
export interface DataGridDensityMetrics {
  row: number;
  group: number;
  header: number;
  filter: number;
  /** Height an embedded Fluent control is pinned to. */
  control: number;
  fontSize: number;
  lineHeight: number;
}

/** Modifier keys held when a row was clicked. */
export interface DataGridSelectModifiers {
  /** Add to, or remove from, the current selection. */
  ctrl?: boolean;
  /** Extend from the last row clicked to this one. */
  shift?: boolean;
}

/** The cell the keyboard and the fill handle act on. */
export interface DataGridCellRef {
  rowId: string;
  columnKey: string;
}

/** A completed fill-handle drag. */
export interface DataGridFill<T extends DataGridRow = DataGridRow> {
  columnKey: string;
  /** The cell dragged from, whose value is being copied. */
  sourceRowId: string;
  sourceRow: T;
  /** The value being written, already read through `getCellValue`. */
  value: unknown;
  /** Rows the drag covered, in visual order. Excludes the source. */
  targetRowIds: string[];
  targetRows: T[];
}

/** A single choice for a `choice` column. */
export interface DataGridChoice {
  value: string | number;
  label: string;
  /** Optional swatch, e.g. the colour Dataverse stores against an option. */
  color?: string;
}

/**
 * Visual state applied to a whole row. Consumers return one of these from
 * {@link DataGridProps.getRowState} rather than styling rows themselves, so
 * every grid in the suite reads the same way.
 */
export type DataGridRowState =
  | 'default'
  | 'selected'
  | 'dirty'
  | 'new'
  | 'muted'
  | 'error'
  | 'deleted'
  | 'placeholder';

/**
 * How a row state is drawn. Every field is optional, and a field left out lets
 * whatever is underneath show through — the stripe, or an earlier state.
 */
export interface DataGridRowStateStyle {
  background?: string;
  /** Defaults to `background`. */
  backgroundHover?: string;
  /** The 3px bar down the row's leading edge. */
  accent?: string;
  color?: string;
  textDecoration?: string;
  opacity?: number;
}

/** Visual state applied to a single cell. */
export type DataGridCellState =
  | 'default'
  | 'dirty'
  | 'warn'
  | 'error'
  | 'good'
  | 'override'
  | 'muted';

/**
 * How a cell state is drawn. Values are CSS, and are meant to be Fluent tokens
 * so dark theme follows without a second palette.
 */
export interface DataGridCellStateStyle {
  background?: string;
  color?: string;
  fontWeight?: number | string;
  /** A CSS border shorthand, drawn inside the cell, e.g. `1px solid red`. */
  border?: string;
}

/** Everything a cell renderer or editor is handed. */
export interface DataGridCellContext<T extends DataGridRow = DataGridRow> {
  /** The effective value, after {@link DataGridProps.getCellValue} has run. */
  value: unknown;
  row: T;
  rowId: string;
  column: DataGridColumn<T>;
  /** The TanStack row, for grouping/expansion/selection APIs. */
  tableRow: Row<T>;
  /** True when the grid as a whole, or this cell in particular, is read-only. */
  readOnly: boolean;
}

/** A resolved reference shown in a `lookup` cell. */
export interface DataGridLookupValue {
  id: string;
  text: string;
  /** Entity to open on click. Defaults to the column's `lookupEntity`. */
  entity?: string;
  secondaryText?: React.ReactNode;
}

/**
 * Content shown hard against one edge of a cell, inside the control's box.
 *
 * Use it for the unit a number is in — `$` leading, `%` trailing — or for a
 * small status icon. It is a function as often as not, because the unit
 * frequently depends on another column on the same row.
 */
export type DataGridAffix<T extends DataGridRow = DataGridRow> =
  | React.ReactNode
  | ((ctx: DataGridCellContext<T>) => React.ReactNode);

/**
 * What a calculated column is handed when it works out its value.
 *
 * `get` and `num` read *effective* values — the stored field with any unsaved
 * edit already layered on — so a calculation stays right while the user types
 * rather than lagging a save behind.
 */
export interface DataGridComputeContext<T extends DataGridRow = DataGridRow> {
  row: T;
  rowId: string;
  column: DataGridColumn<T>;
  /** Effective value of another column on this row. */
  get: (columnKey: string) => unknown;
  /** As {@link get}, coerced to a number, with 0 for blank or unparseable. */
  num: (columnKey: string) => number;
}

/**
 * A column whose value is worked out rather than read.
 *
 * The default is a purely virtual column: it exists in the grid, sorts,
 * filters, groups and totals like any other, and is never written back. Set
 * {@link persist} when the calculated figure is a real field the record is
 * expected to carry — a line total that reports elsewhere, say.
 */
export interface DataGridComputed<T extends DataGridRow = DataGridRow> {
  /** Work out the value for a row. */
  value: (ctx: DataGridComputeContext<T>) => unknown;

  /**
   * Write the calculated value back when a row is edited.
   *
   * Off by default, which keeps the column local to the grid. Dataverse
   * rejects writes to rollup and calculated attributes, so leave this off for
   * anything the platform computes server-side.
   */
  persist?: boolean;

  /** Field to write to when persisting. Defaults to the column key. */
  persistAs?: string;

  /**
   * Accept edits to this column and turn them into writes on other fields.
   *
   * This is what makes a margin column typeable: entering 30% sets the sell
   * price rather than storing "30". Return the fields to write. Without it a
   * calculated column is read-only, since there is nowhere to put the value.
   */
  onEdit?: (
    value: unknown,
    ctx: DataGridComputeContext<T>,
  ) => Record<string, unknown> | void;
}

/**
 * A grid column.
 *
 * `key` doubles as the TanStack column id and, unless {@link accessor} says
 * otherwise, as the property read off the row. Dotted keys resolve through
 * nested objects, so `'product.name'` works without an accessor.
 */
export interface DataGridColumn<T extends DataGridRow = DataGridRow> {
  /** Unique column id. Also the row property read, unless `accessor` is set. */
  key: string;
  /** Header text. Defaults to `key`. */
  label?: string;
  /** Tooltip on the header. Defaults to `label`. */
  description?: string;
  /** Drives formatting, alignment, sorting and the default editor. */
  dataType?: DataGridDataType;
  /** Starting width in pixels. Defaults to 140. */
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  /**
   * Share of any width left over once every column has its own.
   *
   * A grid narrower than its container otherwise leaves a band of empty space
   * down the right-hand side. Mark one column `flex: 1` and it absorbs the
   * surplus; mark several and they divide it in proportion, so `flex: 2` takes
   * twice what `flex: 1` does. Shrinking below `width` never happens — once the
   * columns no longer fit, the grid scrolls sideways as before.
   */
  flex?: number;
  /** Cell alignment. Defaults to right for numerics, centre for booleans. */
  align?: DataGridAlign;
  /** Hidden until the user turns it on. Defaults to true. */
  defaultVisible?: boolean;
  /** Never offered in the column menu, and never rendered. */
  hidden?: boolean;
  /** Allow inline editing. Defaults to false. */
  editable?: boolean;
  /** Offer this column in the group-by menu. Defaults to false. */
  groupable?: boolean;
  /** Allow sorting. Defaults to true. */
  sortable?: boolean;
  /** Allow the filter row to filter on this column. Defaults to true. */
  filterable?: boolean;
  /** Allow drag-reordering and resizing. Defaults to true. */
  movable?: boolean;
  resizable?: boolean;
  /**
   * Aggregate shown in the footer and in group subtotal rows. A function is
   * handed the rows and returns the figure, for totals that are not a plain sum.
   */
  summary?: DataGridSummary | DataGridSummaryFn<T>;
  /**
   * Heading this column sits under in the column picker. Columns sharing one
   * are listed together, with a toggle that shows or hides the whole set.
   */
  columnGroup?: string;
  /** Options for a `choice` column. */
  choices?: DataGridChoice[];
  /** Render a `choice` cell as a coloured badge. Defaults to true. */
  choiceAsBadge?: boolean;
  /** Max characters accepted by the default text editor. */
  maxLength?: number;
  /** Decimal places for numeric formatting. Defaults to 0 / 2 by data type. */
  precision?: number;
  /** Render negative numbers in red. Defaults to true for `money`. */
  negativeIsRed?: boolean;
  /** Pin the column to the left or right edge. */
  pin?: 'left' | 'right';

  // ── Affixes ──────────────────────────────────────────────────────────────

  /** Unit or icon hard against the leading edge of the cell, e.g. `$`. */
  prefix?: DataGridAffix<T>;
  /** Unit or icon hard against the trailing edge of the cell, e.g. `%`. */
  suffix?: DataGridAffix<T>;

  // ── Booleans ─────────────────────────────────────────────────────────────

  /**
   * How a boolean reads. `icon` shows a tick or a cross, which is what a
   * read-only flag wants — a disabled checkbox invites a click that cannot do
   * anything. Defaults to `checkbox` when editable, `icon` when not.
   */
  booleanDisplay?: 'checkbox' | 'icon';
  /** Tooltips for the two icon states. */
  booleanLabels?: { on: string; off: string };

  // ── Lookups ──────────────────────────────────────────────────────────────

  /** Entity a resolved `lookup` value opens. */
  lookupEntity?: string;
  /**
   * Render a resolved reference as a Dynamics persona — avatar coin then name —
   * rather than as a reference pill.
   *
   * Set automatically for the system person columns, which is how Dynamics draws
   * them. Only applies where the reference actually points at a `systemuser`:
   * `ownerid` can hold a team, and a team with a person's coin beside it is
   * simply wrong.
   */
  persona?: boolean;
  /**
   * Supply the user record for a persona instead of letting it fetch one.
   *
   * Use where the row already carries the details, or where there is no Web API
   * behind the grid at all.
   */
  getPersonaUser?: (ctx: DataGridCellContext<T>) => SystemUserRecord | null;
  /**
   * Reveal a record card when the pointer settles on a resolved reference.
   * Set automatically for the system audit columns, where "who is this person"
   * is the whole reason the column is on the grid.
   */
  hoverCard?: boolean;
  /**
   * Columns the hover card fetches and lists. Dataverse-only: the card is
   * populated from the Web API using the reference's entity and id.
   */
  hoverCardColumns?: string[];
  /**
   * How long the pointer must rest before a hover card opens. Defaults to 500ms.
   *
   * Worth raising on a grid people scroll quickly: the wheel brings rows to a
   * stationary cursor, and a card that opens too eagerly appears over content
   * the user was reading.
   */
  hoverCardDelayMs?: number;
  /**
   * Build the card yourself, from data you already hold. Takes precedence over
   * `hoverCardColumns`, and is what lets a grid over a non-Dataverse API offer a
   * card at all — there is no Web API behind it to fetch one from.
   */
  renderHoverCard?: (value: DataGridLookupValue, ctx: DataGridCellContext<T>) => React.ReactNode;
  /** Resolve the row's stored value into something a lookup can show. */
  getLookupValue?: (ctx: DataGridCellContext<T>) => DataGridLookupValue | null;
  /**
   * Search for a `lookup` cell's replacement value. Supplying this turns an
   * empty lookup cell into a picker that queries as the user types, so the whole
   * table is reachable from the cell rather than only a preloaded page.
   */
  searchLookup?: (text: string) => Promise<DataGridLookupOption[]>;
  /** Commit a picked lookup value. Falls back to `onCellChange` with the id. */
  onLookupSelect?: (option: DataGridLookupOption | null, ctx: DataGridCellContext<T>) => void;
  /** Open a resolved reference. Without it the value is not clickable. */
  onRecordClick?: (value: DataGridLookupValue, ctx: DataGridCellContext<T>) => void;

  // ── Images ──────────────────────────────────────────────────────────

  /**
   * Turn the stored value into something an `<img>` can load.
   *
   * Without one the value is used as-is: a URL passes through, and bare base64
   * is given a data-URL prefix. Supply this where the cell holds an id rather
   * than an image — a Dataverse `entityimage` is addressed by record URL, not
   * returned inline.
   */
  getImageSrc?: (ctx: DataGridCellContext<T>) => string | null;
  /** Thumbnail edge length in pixels. Defaults to the row height less padding. */
  imageSize?: number;
  /** How the thumbnail fills its box. Defaults to `contain`. */
  imageFit?: 'contain' | 'cover';
  /**
   * Show a larger copy on hover. Defaults to true — a thumbnail at row height is
   * too small to check anything against, which is the only reason to put an
   * image in a grid.
   */
  imageHoverCard?: boolean;
  /** Longest edge of the hover preview, in pixels. Defaults to 320. */
  imagePreviewSize?: number;

  // ── Escape hatches ───────────────────────────────────────────────────────

  /**
   * Turn this column into a calculated one.
   *
   * The calculation reads other columns through `ctx.get`, so it follows
   * unsaved edits: change the cost and the margin moves with it. By default
   * nothing is written back — the column exists only in the grid.
   */
  computed?: DataGridComputed<T>;

  /**
   * Read the value off the row.
   *
   * Reads the stored record only. For a value derived from other columns that
   * must follow unsaved edits, use `computed` instead.
   */
  accessor?: (row: T) => unknown;

  /**
   * Raw TanStack column options, merged over everything derived above.
   *
   * The way through to anything this component does not surface — a custom
   * `sortingFn`, `filterFn`, `aggregationFn` or `meta`. Nothing is filtered
   * out, so it can also override a default that does not suit.
   */
  tanstack?: Partial<ColumnDef<T, unknown>>;
  /** Turn a value into display text. Overrides the data-type formatter. */
  format?: (value: unknown, row: T) => string;
  /** Take over the cell entirely. Suppresses the default renderer and editor. */
  renderCell?: (ctx: DataGridCellContext<T>) => React.ReactNode;
  /** Take over the header. */
  renderHeader?: (column: Column<T, unknown>) => React.ReactNode;
  /**
   * Per-cell visual state, e.g. flagging a business-rule breach.
   *
   * Any name registered in {@link DataGridProps.cellStates} is accepted as well
   * as the built-in ones.
   */
  getCellState?: (
    ctx: DataGridCellContext<T>,
  ) => DataGridCellState | (string & {}) | null | undefined;
  /**
   * Hover text explaining a cell — why it is locked, where a figure came from.
   * Shown instead of the value tooltip; return null to keep the value tooltip.
   */
  getCellTooltip?: (ctx: DataGridCellContext<T>) => React.ReactNode | null | undefined;
  /** Per-cell read-only override, e.g. a field only editable on certain rows. */
  isCellReadOnly?: (ctx: DataGridCellContext<T>) => boolean;
  /**
   * Whether this cell holds an unsaved edit. Draws the dirty outline on the
   * control itself, which is what distinguishes a changed cell from a changed
   * row when only one column on the row has moved.
   */
  isCellDirty?: (ctx: DataGridCellContext<T>) => boolean;
  /**
   * Offer the fill handle on this column.
   *
   * Defaults to true for an editable column, except for the types where a
   * dragged value would not carry everything the cell shows — a lookup writes an
   * id, and the name beside it belongs to columns the drag knows nothing about.
   */
  fillable?: boolean;
}

/** An option offered by a `lookup` column's search. */
export interface DataGridLookupOption {
  key: string;
  text: string;
  secondaryText?: React.ReactNode;
  /**
   * Shown before the text — a product's photograph, say. Small: the row gives
   * it the same 24px slot a form's lookup does, so a full-size image is a waste
   * of the request rather than a bigger picture.
   */
  icon?: React.ReactNode;
  /** The record behind the option, handed back on select. */
  data?: unknown;
}

/** Which layout facets are persisted, and where. */
export interface DataGridPersistence {
  /**
   * Storage key scope. Layout is written under
   * `datagrid:<origin>:<scope>:<facet>`, so two grids in one app do not collide
   * and two orgs in one browser do not either.
   */
  scope: string;
  /** Defaults to `window.localStorage`. Pass `null` to disable persistence. */
  storage?: Storage | null;
  /** Facets to persist. Defaults to all of them. */
  facets?: Array<'order' | 'sizing' | 'visibility' | 'density' | 'sorting' | 'grouping'>;
}

/** Result of a row-reorder drag. */
export interface DataGridRowMove<T extends DataGridRow = DataGridRow> {
  /** Ids being moved, in their current visual order. */
  rowIds: string[];
  /** Rows being moved, in the same order. */
  rows: T[];
  /**
   * Id the drop landed on — a row id, or the TanStack id of a group row when
   * {@link droppedOnGroupHeader} is true.
   */
  overRowId: string;
  /**
   * Index the block should end up at, within the currently rendered rows. For a
   * drop on a group header, the position straight after the rows above it — the
   * first row of that group when it has any on screen.
   */
  toIndex: number;
  /** Group values at the drop position, outermost first. Empty when ungrouped. */
  toGroup: Array<{ columnKey: string; value: unknown }>;
  /** True when dropped on a group header rather than on a row. */
  droppedOnGroupHeader: boolean;
}

/** A group banner, as handed to the group hooks. */
export interface DataGridGroupContext<T extends DataGridRow = DataGridRow> {
  value: unknown;
  /** The column this level groups on. */
  columnKey: string;
  /** 0 for the outermost band. */
  depth: number;
  /** Group values from the outermost band down to this one. */
  path: Array<{ columnKey: string; value: unknown }>;
  /** The data rows in the group, after filtering, whether or not it is expanded. */
  rows: Row<T>[];
  rowIds: string[];
  /** The label the grid would draw by default. */
  label: React.ReactNode;
  /** Rows counted, honouring `includeInSummary`. */
  count: number;
  expanded: boolean;
  toggle: () => void;
  selection: 'none' | 'some' | 'all';
  /** Select every row in the group, or clear them if all already are. */
  toggleSelection: () => void;
}

/** A saved column layout, as read by `getLayout` and written by `applyLayout`. */
export interface DataGridLayout {
  order: string[];
  sizing: Record<string, number>;
  visibility: Record<string, boolean>;
  density: DataGridDensity;
  sorting: SortingState;
  grouping: string[];
}

/** Imperative handle for driving the grid from outside. */
export interface DataGridHandle<T extends DataGridRow = DataGridRow> {
  /** The current layout, for storing under a name. */
  getLayout: () => DataGridLayout;
  /** Apply a stored layout, or part of one. Written through to `persist` as well. */
  applyLayout: (layout: Partial<DataGridLayout>) => void;
  /** Scroll a row into view and outline it briefly, to show where something landed. */
  highlightRow: (rowId: string, options?: { durationMs?: number }) => void;
  /** The live TanStack table instance. */
  table: Table<T>;
  /** Scroll a row into view by id. */
  scrollToRow: (rowId: string, align?: 'start' | 'center' | 'end' | 'auto') => void;
  scrollToTop: () => void;
  /** Drop every stored width back to the column defaults. */
  resetColumnWidths: () => void;
  /** Drop the whole persisted layout — order, widths, visibility, density. */
  resetLayout: () => void;
  /** Focus the filter input for a column, opening the filter row if needed. */
  focusColumnFilter: (columnKey: string) => void;
}

/** The grid's own props, before the native div props are mixed in. */
interface DataGridOwnProps<T extends DataGridRow = DataGridRow> {
  /** Rows to render. Keep this referentially stable — memoise it. */
  data: T[];
  /** Column definitions. Keep this referentially stable — memoise it. */
  columns: DataGridColumn<T>[];
  /**
   * Stable id per row. Without one the grid falls back to the array index,
   * which breaks selection and virtualisation the moment rows are reordered.
   */
  getRowId?: (row: T, index: number) => string;

  // ── Reading and writing values ───────────────────────────────────────────

  /**
   * Read a cell's effective value. Override this to layer unsaved edits over
   * the stored record, so the grid shows what the user typed rather than what
   * the server last returned.
   *
   * `baseValue` is what the column itself resolved — through its `accessor`
   * where it has one — so the usual implementation is a one-liner that falls
   * back to it, and a computed column keeps working without special handling:
   *
   * ```ts
   * (row, key, rowId, baseValue) => pending[rowId]?.[key] ?? baseValue
   * ```
   */
  getCellValue?: (row: T, columnKey: string, rowId: string, baseValue: unknown) => unknown;
  /** Commit an inline edit. Omit to leave the grid read-only. */
  onCellChange?: (row: T, columnKey: string, value: unknown, rowId: string) => void;
  /** Read-only for every column, whatever `editable` says. */
  readOnly?: boolean;

  // ── Row presentation ─────────────────────────────────────────────────────

  /**
   * Visual state per row. Return a list to layer several, later ones drawn on
   * top — a row can be both excluded and dirty. Selection is applied last.
   */
  getRowState?: (
    row: T,
    rowId: string,
  ) =>
    | DataGridRowState
    | (string & {})
    | Array<DataGridRowState | (string & {})>
    | null
    | undefined;
  /**
   * Add row states, or restyle built-in ones. Merged over the built-in set a
   * state at a time, so restyling `error` leaves every other state alone.
   */
  rowStates?: Record<string, DataGridRowStateStyle>;
  /** As {@link rowStates}, for the names `getCellState` returns. */
  cellStates?: Record<string, DataGridCellStateStyle>;
  /**
   * Content for the leading column of each row — a count of edited fields, a
   * `+` on a new row. Reserves that column even when rows cannot be dragged.
   */
  renderRowIndicator?: (row: T, rowId: string) => React.ReactNode;
  /** Underline every cell that can be edited, so people can see where to type. */
  showEditableHints?: boolean;
  /** Alternate row shading. Defaults to true. */
  striped?: boolean;
  /** Row height preset. Uncontrolled unless paired with `onDensityChange`. */
  density?: DataGridDensity;
  defaultDensity?: DataGridDensity;
  onDensityChange?: (density: DataGridDensity) => void;

  // ── Selection ────────────────────────────────────────────────────────────

  /** Show the leading checkbox column. Defaults to false. */
  selectable?: boolean;
  /**
   * Shift to extend from the last row clicked, Ctrl (or Cmd) to add or remove
   * one. Defaults to true — a grid where a click can only ever land on one row
   * is the thing people complain about first.
   */
  multiSelect?: boolean;
  /** Controlled selection. Omit for uncontrolled. */
  selectedRowIds?: Set<string> | string[];
  onSelectionChange?: (selectedRowIds: Set<string>) => void;

  // ── Spreadsheet behaviour ────────────────────────────────────────────────

  /**
   * Excel's fill handle: a grip on the active cell that copies its value down
   * (or up) over the rows it is dragged across.
   *
   * Defaults to true wherever the grid is editable. Per-column control is on
   * {@link DataGridColumn.fillable}.
   */
  fillHandle?: boolean;
  /**
   * Called once for a completed fill, instead of one `onCellChange` per row.
   * Use it to write the whole block in a single state update — a thousand-row
   * drag through `onCellChange` is a thousand renders.
   */
  onFill?: (fill: DataGridFill<T>) => void;
  /**
   * Spreadsheet keys. Arrows move the active cell, Enter moves down and Shift+Enter
   * up, Tab and Shift+Tab walk the editable cells wrapping row to row, F2 selects
   * the value for editing, and typing on a cell the keyboard moved to replaces
   * its value. Escape clears the active cell. Defaults to true.
   */
  keyboardNavigation?: boolean;
  /** The active cell changed — through a click, the keyboard, or a fill. */
  onActiveCellChange?: (cell: DataGridCellRef | null) => void;

  // ── Sorting, filtering, grouping ─────────────────────────────────────────

  defaultSorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  /** Show the per-column filter row. Uncontrolled unless paired with the setter. */
  showFilters?: boolean;
  defaultShowFilters?: boolean;
  onShowFiltersChange?: (show: boolean) => void;
  /** Free-text search across every visible column. */
  globalFilter?: string;
  /**
   * Columns the search looks at. Omit, or pass an empty array, to search every
   * visible column.
   *
   * Narrowing this matters on a wide grid: searching "10" across thirty columns
   * matches a quantity, a price, a date and half the product codes, and the
   * result is noise. Naming the two or three columns people actually search on
   * makes the box useful.
   */
  searchColumns?: string[];
  /**
   * Render the built-in toolbar: a search box, a filter toggle, a density menu,
   * a column picker and a layout reset, on this library's own `CommandBar`.
   *
   * Defaults to true once {@link searchColumns} is set. Pass a `toolbar` of your
   * own to replace it, or `false` to have neither.
   */
  searchable?: boolean;
  searchPlaceholder?: string;
  /**
   * Replace only the built-in toolbar's search box — with a `Lookup` that
   * suggests records, say — keeping filters, density and the column picker. The
   * value still drives the grid's search.
   */
  renderToolbarSearch?: (props: {
    value: string;
    onChange: (text: string) => void;
  }) => React.ReactNode;
  /**
   * Column key to group by, or a list to nest groups outermost-first.
   *
   * Uncontrolled unless paired with the setter. `null` or `[]` means no
   * grouping.
   */
  groupBy?: string | string[] | null;
  defaultGroupBy?: string | string[] | null;
  onGroupByChange?: (groupBy: string[]) => void;
  /**
   * Render a group header's label.
   *
   * `depth` is 0 for the outermost band, so a nested grid can label its levels
   * differently. Defaults to the raw group value.
   */
  renderGroupLabel?: (value: unknown, rows: Row<T>[], depth: number) => React.ReactNode;
  /**
   * Replace the label and count on a group banner. The chevron, and the checkbox
   * when {@link groupSelection} is on, stay the grid's.
   */
  renderGroupHeader?: (ctx: DataGridGroupContext<T>) => React.ReactNode;
  /** Commands offered when a group banner is right-clicked. */
  groupContextMenu?: (ctx: DataGridGroupContext<T>) => CommandBarItem[] | null;
  /**
   * Double-click on a group banner, e.g. to rename it. While set, only the
   * chevron collapses the group — a double-click would otherwise collapse and
   * re-open it on the way.
   */
  onGroupDoubleClick?: (ctx: DataGridGroupContext<T>) => void;
  /** A checkbox on each banner that selects the rows in that group. */
  groupSelection?: boolean;
  /**
   * Show an aggregate row under each group.
   *
   * `true` subtotals every column carrying a `summary`. Pass an array of column
   * keys to subtotal only those — a grid often wants a running total on two
   * columns in the footer but only one of them repeated per group. A key with no
   * `summary` on its column defaults to summing.
   */
  groupSubtotals?: boolean | string[];
  /**
   * Fewest outermost groups before subtotals show. Defaults to 1. With a single
   * group a subtotal only repeats the footer, so 2 is often what is wanted.
   */
  groupSubtotalsMinGroups?: number;
  /**
   * Which levels of a nested grouping get a subtotal row. Defaults to `all`.
   *
   * `innermost` puts one only under the bands that actually hold rows, which is
   * what a Task → Group grid usually wants: a subtotal under every level repeats
   * the same figures at each depth.
   */
  groupSubtotalLevels?: 'all' | 'innermost';
  /**
   * Leave rows out of the footer, subtotals and group counts while still
   * rendering them — rows marked for deletion, say.
   */
  includeInSummary?: (row: T, rowId: string) => boolean;

  // ── Column layout ────────────────────────────────────────────────────────

  /** Drag columns to reorder. Defaults to true. */
  reorderableColumns?: boolean;
  /** Drag rows to reorder. Off unless `onRowReorder` is supplied. */
  onRowReorder?: (move: DataGridRowMove<T>) => void;
  /** Right-click menu on column headers. Defaults to true. */
  columnMenu?: boolean;
  /**
   * Stretch the columns to fill the grid's width when they would not otherwise.
   *
   * The surplus goes to whichever columns declare `flex`. Where none does, the
   * last visible column takes it, which is what stops a narrow grid leaving a
   * band of empty space down its right-hand side. Defaults to true.
   */
  autoFit?: boolean;
  /**
   * Persist order, widths, visibility and density across sessions. Changing
   * `scope` while mounted loads that scope's layout.
   */
  persist?: DataGridPersistence;
  /**
   * Controlled column visibility, keyed by column. A column not named is visible
   * unless its `defaultVisible` says otherwise. Omit for uncontrolled.
   */
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  /**
   * Hidden whatever the user or the saved layout says, without changing either —
   * clearing the list brings back exactly what was showing before.
   */
  forceHiddenColumns?: string[];

  // ── Chrome ───────────────────────────────────────────────────────────────

  /** Rendered above the grid, inside its border. Replaces the built-in toolbar. */
  toolbar?: React.ReactNode;
  /**
   * Commands appended to the built-in toolbar.
   *
   * Prefer this over replacing the whole bar with `toolbar`: the built-in one
   * already carries search, filters, grouping, the column picker and the layout
   * reset, and a replacement has to rebuild all of them to add one button.
   */
  toolbarItems?: CommandBarItem[];
  /**
   * Where those commands sit relative to the grid's own.
   *
   * `end` keeps the view controls first, which suits a grid whose toolbar is
   * mostly about looking at data. `start` puts the app's commands first, which
   * is what a grid people *work* in wants: Save and the row actions lead, and
   * filters, grouping and density follow. A divider separates the two sets
   * either way. Defaults to `end`.
   *
   * This is the broad stroke. For finer control give a command its own `order`
   * — and `align` to move it to the far end — which this then no longer decides
   * for it. The built-ins sit at 10 (filters), 20 (group), 30 (columns),
   * 40 (density) and 50 (reset).
   */
  toolbarItemsPlacement?: 'start' | 'end';
  /**
   * Where the search box sits in that same running order, and which end of the
   * bar it belongs to. Defaults to 100 and `right`, which puts it hard right.
   *
   * Because the search takes part in the ordering, a command of your own
   * numbered above it lands *after* it rather than before — a button at 101
   * with `align: 'right'` sits beyond the search, against the trailing edge.
   */
  toolbarSearchOrder?: number;
  toolbarSearchAlign?: 'left' | 'right';
  /** Show the row-count status bar. Defaults to true. */
  statusBar?: boolean;
  /** Extra content appended to the status bar. */
  statusBarExtra?: React.ReactNode;
  /** Show a footer row of column aggregates. Defaults to true when any column has `summary`. */
  footerSummary?: boolean;
  /** Replaces the body while true. */
  loading?: boolean;
  loadingMessage?: React.ReactNode;
  /** Replaces the body when set. */
  error?: React.ReactNode;
  /** Shown when there are no rows. */
  emptyMessage?: React.ReactNode;

  // ── Events ───────────────────────────────────────────────────────────────

  onRowClick?: (row: T, rowId: string, event: React.MouseEvent) => void;
  onRowDoubleClick?: (row: T, rowId: string, event: React.MouseEvent) => void;
  /**
   * Raw right-click hook, for a menu you render yourself.
   *
   * Prefer {@link rowContextMenu} unless you need the event — supplying items
   * gets the grid's own menu, positioned at the pointer, for nothing.
   */
  onRowContextMenu?: (row: T, rowId: string, event: React.MouseEvent) => void;

  // ── Context menus ────────────────────────────────────────────────────

  /**
   * Commands offered when a row is right-clicked.
   *
   * Given a function, it is called with the row under the pointer and the whole
   * selection, so a command can act on either — right-clicking inside a
   * selection is expected to operate on all of it, not just the row that
   * happened to be under the cursor.
   */
  rowContextMenu?:
    | CommandBarItem[]
    | ((row: T, rowId: string, selectedRowIds: Set<string>) => CommandBarItem[]);
  /**
   * Commands for the cell that was right-clicked, shown above the row's.
   *
   * Return an empty array or null to offer nothing for that cell.
   */
  cellContextMenu?: (ctx: DataGridCellContext<T>) => CommandBarItem[] | null;

  /**
   * Raw TanStack table options, merged over the grid's own.
   *
   * For row models and features this component does not surface — faceted
   * values, pagination, a custom `getSubRows`. Merged last, so it can also
   * replace a default.
   */
  tanstack?: Partial<TableOptions<T>>;

  /**
   * Applied to the root alongside the grid's own class, following Fluent's
   * merge order so a consumer rule wins.
   */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Native props the grid root passes straight through.
 *
 * Anything the grid names itself is removed, so a typo in a grid prop is still
 * an error rather than being swallowed as a DOM attribute.
 */
type DataGridNativeProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  keyof DataGridOwnProps | 'children'
>;

export type DataGridProps<T extends DataGridRow = DataGridRow> = DataGridOwnProps<T> &
  DataGridNativeProps;

/** Options accepted by {@link useDataGrid}, the headless escape hatch. */
export type UseDataGridOptions<T extends DataGridRow = DataGridRow> = Pick<
  DataGridProps<T>,
  | 'data'
  | 'columns'
  | 'getRowId'
  | 'getCellValue'
  | 'onCellChange'
  | 'readOnly'
  | 'selectable'
  | 'selectedRowIds'
  | 'onSelectionChange'
  | 'defaultSorting'
  | 'onSortingChange'
  | 'globalFilter'
  | 'searchColumns'
  | 'groupBy'
  | 'defaultGroupBy'
  | 'onGroupByChange'
  | 'density'
  | 'defaultDensity'
  | 'onDensityChange'
  | 'persist'
  | 'columnVisibility'
  | 'onColumnVisibilityChange'
  | 'forceHiddenColumns'
  | 'groupSubtotals'
  | 'tanstack'
> & {
  /** Reserve a leading drag-handle column. Set when rows can be reordered. */
  rowDragEnabled?: boolean;
};

/** What {@link useDataGrid} hands back. */
export interface UseDataGridResult<T extends DataGridRow = DataGridRow> {
  table: Table<T>;
  /** Flat list of headers in render order. */
  headers: Header<T, unknown>[];
  density: DataGridDensity;
  setDensity: (density: DataGridDensity) => void;
  metrics: DataGridDensityMetrics;
  selectedRowIds: Set<string>;
  setSelectedRowIds: (ids: Set<string>) => void;
  toggleRowSelected: (rowId: string, additive?: boolean) => void;
  toggleAllSelected: () => void;
  groupBy: string[];
  setGroupBy: (groupBy: string | string[] | null) => void;
  columnOrder: ColumnOrderState;
  setColumnOrder: React.Dispatch<React.SetStateAction<ColumnOrderState>>;
  columnSizing: ColumnSizingState;
  setColumnSizing: React.Dispatch<React.SetStateAction<ColumnSizingState>>;
  columnVisibility: VisibilityState;
  setColumnVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  sorting: SortingState;
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>;
  grouping: GroupingState;
  expanded: ExpandedState;
  setExpanded: React.Dispatch<React.SetStateAction<ExpandedState>>;
  /** Column lookup by key, for renderers that need the original definition. */
  columnMap: Map<string, DataGridColumn<T>>;
  /** Resolves a cell's effective value, honouring `getCellValue` when supplied. */
  readCellValue: (row: T, columnKey: string, rowId: string) => unknown;
  resetColumnWidths: () => void;
  resetLayout: () => void;
  getLayout: () => DataGridLayout;
  applyLayout: (layout: Partial<DataGridLayout>) => void;
}

/** Internal — the union of things the virtualiser lays out. */
export type DataGridDisplayItem<T extends DataGridRow = DataGridRow> =
  | { type: 'row'; key: string; row: Row<T> }
  | { type: 'group'; key: string; row: Row<T> }
  | { type: 'subtotal'; key: string; row: Row<T> };

/** Internal — the props the cell renderer needs beyond the TanStack cell. */
export interface DataGridCellRenderProps<T extends DataGridRow = DataGridRow> {
  cell: Cell<T, unknown>;
  column: DataGridColumn<T>;
  rowId: string;
}
