import { tokens } from '@fluentui/react-components';
import type {
  DataGridCellStateStyle,
  DataGridDensity,
  DataGridDensityMetrics,
  DataGridRowStateStyle,
} from './DataGrid.types';

/**
 * Row heights per density, in pixels.
 *
 * These are the floor the CSS classes set; the inline `height` the grid puts on
 * every `<tr>` and `<td>` wins. `estimateSize` reads the same numbers, so the
 * virtualiser's arithmetic and the rendered geometry cannot drift apart.
 *
 * The header and filter rows are in here too. Leaving them at a fixed height
 * makes compact mode look wrong from the top down: 22px data rows under a 26px
 * header reads as a header that has not been told about the setting.
 */
export const DENSITY_METRICS: Record<DataGridDensity, DataGridDensityMetrics> = {
  compact: { row: 22, group: 22, header: 22, filter: 20, control: 20, fontSize: 11, lineHeight: 14 },
  comfortable: { row: 28, group: 26, header: 26, filter: 24, control: 24, fontSize: 12, lineHeight: 16 },
  spacious: { row: 36, group: 32, header: 32, filter: 28, control: 30, fontSize: 13, lineHeight: 18 },
};

/** How many rows to render either side of the viewport. */
export const OVERSCAN = 6;

/** Reserved column ids. Data columns may not use these keys. */
export const SELECT_COLUMN_ID = '__select__';
export const DRAG_COLUMN_ID = '__drag__';

export const DEFAULT_COLUMN_WIDTH = 140;
export const MIN_COLUMN_WIDTH = 32;
export const MAX_COLUMN_WIDTH = 1200;

/** Header and filter row heights, needed for the sticky offsets. */
export const HEADER_HEIGHT = 26;

/**
 * Column types the fill handle is off for unless a column opts back in.
 *
 * A lookup's stored value is an id, and copying one down leaves every filled row
 * pointing at the right record but still showing the name it had before — the
 * denormalised columns beside it are not part of the value being dragged. An
 * image is worse: a base64 blob copied down a hundred rows is a hundred copies
 * of it staged for save.
 */
export const UNFILLABLE_TYPES: ReadonlySet<string> = new Set(['lookup', 'image']);

/**
 * Row colours.
 *
 * Kept as a table rather than written inline so a consumer restyling the grid
 * has one place to look, and so the two shipped grids cannot drift apart. Every
 * entry resolves to a Fluent token, which is what makes dark theme work without
 * a second palette.
 */
export const ROW_STYLE_TOKENS = {
  default: {
    bg: tokens.colorNeutralBackground1,
    bgHover: tokens.colorNeutralBackground1Hover,
    accent: 'transparent',
  },
  alt: {
    bg: tokens.colorNeutralBackground2,
    bgHover: tokens.colorNeutralBackground2Hover,
    accent: 'transparent',
  },
  selected: {
    bg: tokens.colorBrandBackground2,
    bgHover: tokens.colorBrandBackground2Hover,
    accent: tokens.colorBrandStroke1,
  },
  dirty: {
    bg: tokens.colorPaletteYellowBackground1,
    bgHover: tokens.colorPaletteYellowBackground2,
    accent: tokens.colorPaletteYellowBorderActive,
  },
  new: {
    bg: tokens.colorPaletteGreenBackground1,
    bgHover: tokens.colorPaletteGreenBackground2,
    accent: tokens.colorPaletteGreenBorderActive,
  },
  error: {
    bg: tokens.colorPaletteRedBackground1,
    bgHover: tokens.colorPaletteRedBackground2,
    accent: tokens.colorPaletteRedBorderActive,
  },
  muted: {
    bg: tokens.colorNeutralBackground3,
    bgHover: tokens.colorNeutralBackground3Hover,
    accent: tokens.colorNeutralStroke2,
  },
  // Marked for deletion but not yet saved, so it stays on screen to be restored.
  deleted: {
    bg: tokens.colorPaletteRedBackground1,
    bgHover: tokens.colorPaletteRedBackground2,
    accent: tokens.colorPaletteRedBorderActive,
  },
  placeholder: {
    bg: tokens.colorPaletteBerryBackground1,
    bgHover: tokens.colorPaletteBerryBackground2,
    accent: tokens.colorPaletteBerryBorderActive,
  },
} as const;

/**
 * The built-in row states, in the shape `rowStates` overrides.
 *
 * `default` and the stripe are not in here: they are the row's own classes, and
 * a state that sets no background leaves them showing.
 */
export const BUILTIN_ROW_STATES: Readonly<Record<string, DataGridRowStateStyle>> = {
  selected: {
    background: ROW_STYLE_TOKENS.selected.bg,
    backgroundHover: ROW_STYLE_TOKENS.selected.bgHover,
    accent: ROW_STYLE_TOKENS.selected.accent,
  },
  dirty: {
    background: ROW_STYLE_TOKENS.dirty.bg,
    backgroundHover: ROW_STYLE_TOKENS.dirty.bgHover,
    accent: ROW_STYLE_TOKENS.dirty.accent,
  },
  new: {
    background: ROW_STYLE_TOKENS.new.bg,
    backgroundHover: ROW_STYLE_TOKENS.new.bgHover,
    accent: ROW_STYLE_TOKENS.new.accent,
  },
  error: {
    background: ROW_STYLE_TOKENS.error.bg,
    backgroundHover: ROW_STYLE_TOKENS.error.bgHover,
    accent: ROW_STYLE_TOKENS.error.accent,
  },
  // No accent, so a muted row that is also dirty keeps the dirty bar.
  muted: {
    background: ROW_STYLE_TOKENS.muted.bg,
    backgroundHover: ROW_STYLE_TOKENS.muted.bgHover,
    opacity: 0.7,
  },
  deleted: {
    background: ROW_STYLE_TOKENS.deleted.bg,
    backgroundHover: ROW_STYLE_TOKENS.deleted.bgHover,
    accent: ROW_STYLE_TOKENS.deleted.accent,
    textDecoration: 'line-through',
  },
  placeholder: {
    background: ROW_STYLE_TOKENS.placeholder.bg,
    backgroundHover: ROW_STYLE_TOKENS.placeholder.bgHover,
    accent: ROW_STYLE_TOKENS.placeholder.accent,
  },
};

/**
 * Cell colours.
 *
 * Split from the row palette because a cell state has to read against whatever
 * the row underneath it is already painted, so these are deliberately the
 * lighter `Background1` fills with a matching foreground.
 */
export const CELL_STYLE_TOKENS = {
  dirty: {
    bg: tokens.colorPaletteYellowBackground1,
    fg: tokens.colorNeutralForeground1,
  },
  warn: {
    bg: tokens.colorPaletteDarkOrangeBackground1,
    fg: tokens.colorPaletteDarkOrangeForeground1,
  },
  error: {
    bg: tokens.colorPaletteRedBackground1,
    fg: tokens.colorPaletteRedForeground1,
  },
  good: {
    bg: tokens.colorPaletteGreenBackground1,
    fg: tokens.colorPaletteGreenForeground1,
  },
  override: {
    bg: tokens.colorPaletteBlueBackground2,
    fg: tokens.colorNeutralForeground1,
  },
  // Not a problem, just not the point — a value that is present but derived,
  // superseded or otherwise not what the eye should go to first.
  muted: {
    bg: tokens.colorNeutralBackground3,
    fg: tokens.colorNeutralForeground3,
  },
  negative: {
    fg: tokens.colorPaletteRedForeground1,
  },
  readOnly: {
    fg: tokens.colorNeutralForeground3,
  },
  focus: {
    bg: tokens.colorNeutralBackground1,
    border: tokens.colorBrandStroke1,
  },
} as const;

/** The built-in cell states, in the shape `cellStates` overrides. */
export const BUILTIN_CELL_STATES: Readonly<Record<string, DataGridCellStateStyle>> = {
  dirty: { background: CELL_STYLE_TOKENS.dirty.bg },
  warn: { background: CELL_STYLE_TOKENS.warn.bg, color: CELL_STYLE_TOKENS.warn.fg },
  error: {
    background: CELL_STYLE_TOKENS.error.bg,
    color: CELL_STYLE_TOKENS.error.fg,
    fontWeight: tokens.fontWeightSemibold,
  },
  good: {
    background: CELL_STYLE_TOKENS.good.bg,
    color: CELL_STYLE_TOKENS.good.fg,
    fontWeight: tokens.fontWeightSemibold,
  },
  override: { background: CELL_STYLE_TOKENS.override.bg },
  muted: { background: CELL_STYLE_TOKENS.muted.bg, color: CELL_STYLE_TOKENS.muted.fg },
};
