import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { CELL_STYLE_TOKENS, HEADER_HEIGHT, ROW_STYLE_TOKENS } from './DataGrid.tokens';

/**
 * Grid chrome.
 *
 * Every class the grid and its sub-components use lives here so a consumer can
 * pull the same look into a bespoke render without copying CSS. Font size and
 * line height on cells read from the `--fue-grid-*` custom properties, which the
 * grid sets on the `<table>` from the active density — putting them on the `<td>`
 * rather than on each control is what stops text jumping when a cell enters edit
 * mode.
 */
export const useDataGridStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    height: '100%',
    position: 'relative',
    ...shorthands.overflow('hidden'),
  },

  scroller: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    ...shorthands.overflow('auto'),
    position: 'relative',
  },

  table: {
    tableLayout: 'fixed',
    borderCollapse: 'separate',
    borderSpacing: 0,
    // Width is pinned inline to the column total. Left to size itself the table
    // runs wider and the browser hands the surplus to whichever cells hold the
    // widest content, so columns drift off their configured width.
  },

  // ── Header ────────────────────────────────────────────────────────────────

  thead: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    backgroundColor: tokens.colorNeutralBackground3,
  },

  /**
   * A frozen column.
   *
   * The offset is set inline, since it depends on the widths of the frozen
   * columns in front of it. The background is left inheriting from the row so a
   * frozen cell keeps its stripe, hover and selection colour while the
   * scrolling columns pass underneath it.
   */
  pinned: {
    position: 'sticky',
    zIndex: 1,
  },
  // Above the sticky header, which is already at 2.
  pinnedHeader: {
    zIndex: 3,
  },
  // Only on the innermost frozen column, marking where the scrolling starts.
  pinnedLeftEdge: {
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  pinnedRightEdge: {
    borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  headerCell: {
    position: 'relative',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    // Room for the chevron, so a long label truncates before it rather than
    // running underneath it.
    paddingRight: '24px',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textAlign: 'left',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    whiteSpace: 'nowrap',
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    userSelect: 'none',
    height: `${HEADER_HEIGHT}px`,
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  headerCellSortable: {
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorNeutralBackground3Hover },
  },
  headerCellGrouped: {
    color: tokens.colorBrandForeground1,
  },
  headerCellDragging: {
    zIndex: 3,
    opacity: 0.8,
  },
  headerLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('2px'),
    maxWidth: '100%',
    ...shorthands.overflow('hidden'),
  },

  /**
   * The chevron Dynamics puts on every column header.
   *
   * Always rendered rather than shown on hover: it is the only signal that the
   * column has a menu at all, and a grid where sorting and grouping are hidden
   * behind an undiscoverable right-click is a grid people call read-only.
   */
  headerMenuButton: {
    position: 'absolute',
    right: '6px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    ...shorthands.padding('0'),
    ...shorthands.borderStyle('none'),
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',
    fontSize: '10px',
    lineHeight: 1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },

  /** The numeric width editor inside the column menu. */
  widthEditor: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
  },
  widthUnit: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  headerLabelText: {
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flexShrink: 1,
    minWidth: 0,
  },
  headerIcon: {
    flexShrink: 0,
    fontSize: '12px',
    lineHeight: 1,
  },

  resizer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '5px',
    height: '100%',
    cursor: 'col-resize',
    userSelect: 'none',
    touchAction: 'none',
    backgroundColor: 'transparent',
    ':hover': { backgroundColor: tokens.colorBrandBackground },
  },
  resizerActive: {
    backgroundColor: tokens.colorBrandBackground,
  },

  // ── Filter row ────────────────────────────────────────────────────────────

  filterRow: {
    position: 'sticky',
    // Sits directly under the header, whose height moves with density.
    top: 'var(--fue-grid-header-height, 26px)',
    zIndex: 2,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  filterCell: {
    // No horizontal padding: slim boolean columns need every pixel for the input.
    ...shorthands.padding('1px', '0'),
    boxSizing: 'border-box',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.overflow('hidden'),
  },
  filterInput: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    minHeight: '20px',
    boxSizing: 'border-box',
    // Griffel rejects the all-sides border shorthand, so these stay per-side.
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontSize: '11px',
    fontFamily: 'inherit',
    paddingLeft: '4px',
    paddingRight: '4px',
    outlineStyle: 'none',
    ':focus': {
      borderTopColor: tokens.colorBrandStroke1,
      borderRightColor: tokens.colorBrandStroke1,
      borderBottomColor: tokens.colorBrandStroke1,
      borderLeftColor: tokens.colorBrandStroke1,
    },
  },

  // ── Rows ──────────────────────────────────────────────────────────────────

  row: {
    backgroundColor: ROW_STYLE_TOKENS.default.bg,
    ':hover': { backgroundColor: ROW_STYLE_TOKENS.default.bgHover },
  },
  rowAlt: {
    backgroundColor: ROW_STYLE_TOKENS.alt.bg,
    ':hover': { backgroundColor: ROW_STYLE_TOKENS.alt.bgHover },
  },
  rowSelected: {
    backgroundColor: ROW_STYLE_TOKENS.selected.bg,
    boxShadow: `inset 3px 0 0 0 ${ROW_STYLE_TOKENS.selected.accent}`,
    ':hover': { backgroundColor: ROW_STYLE_TOKENS.selected.bgHover },
  },
  /*
   * Row states are drawn through custom properties the row sets inline, one
   * class per property. Griffel cannot mint classes from props at runtime, and
   * a class that read an unset variable would paint the row transparent — so a
   * class is only applied when its property is actually set, and a state with
   * no background leaves the stripe showing.
   */
  rowStateBg: {
    backgroundColor: 'var(--fue-row-bg)',
    ':hover': { backgroundColor: 'var(--fue-row-bg-hover, var(--fue-row-bg))' },
  },
  rowStateAccent: {
    boxShadow: 'inset 3px 0 0 0 var(--fue-row-accent)',
  },
  rowStateColor: {
    color: 'var(--fue-row-color)',
    '& > td': { color: 'var(--fue-row-color)' },
  },
  rowStateDecoration: {
    textDecoration: 'var(--fue-row-text-decoration)',
    // Text decoration does not reach inside an input, which is exactly where a
    // struck-through row's values are.
    '& input': { textDecoration: 'var(--fue-row-text-decoration)' },
  },
  rowStateOpacity: {
    opacity: 'var(--fue-row-opacity)',
  },
  /** A row the app is pointing at, briefly — see `highlightRow`. */
  rowFlash: {
    outlineWidth: tokens.strokeWidthThick,
    outlineStyle: 'solid',
    outlineColor: tokens.colorBrandStroke1,
    outlineOffset: '-2px',
  },
  rowClickable: {
    cursor: 'pointer',
  },
  rowDragging: {
    position: 'relative',
    zIndex: 1,
    opacity: 0.85,
    boxShadow: tokens.shadow8,
  },

  // ── Cells ─────────────────────────────────────────────────────────────────

  cell: {
    ...shorthands.padding('0', '4px'),
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRight: `1px solid ${tokens.colorNeutralStroke3}`,
    whiteSpace: 'nowrap',
    ...shorthands.overflow('hidden'),
    boxSizing: 'border-box',
    backgroundColor: 'inherit',
    verticalAlign: 'middle',
    // The fill handle is positioned against the cell, so the cell has to be a
    // containing block at all times — not only while it holds focus, or the
    // handle anchors to whatever is positioned further up and lands somewhere
    // else on the page entirely.
    position: 'relative',
    // The density type scale sits on the <td> so everything inside inherits it.
    // Without this the editor renders at the page default while the display
    // value renders at the grid size, so text jumps the moment a cell is edited.
    fontSize: 'var(--fue-grid-font-size, 12px)',
    lineHeight: 'var(--fue-grid-line-height, 16px)',
    // The active cell is outlined here and nowhere else. Ringing the control as
    // well produces two rings a couple of pixels apart, and `focus-within` is
    // what lets one rule cover a plain input and a composite control alike.
    ':focus-within': {
      outlineWidth: tokens.strokeWidthThick,
      outlineStyle: 'solid',
      outlineColor: tokens.colorBrandStroke1,
      outlineOffset: '-2px',
      zIndex: 1,
    },
  },
  cellContent: {
    display: 'block',
    width: '100%',
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Cell states are colour only. Geometry belongs to the renderer, so setting
  // layout here would shift a value the moment its state changed.
  //
  // Like row states they read custom properties set inline, one class per
  // property, so a consumer's own state names work without a class of their own.
  cellStateBg: {
    backgroundColor: 'var(--fue-cell-bg)',
    // Filled controls would otherwise cover the state with their own surface.
    // They get it back while focused, where lifting the value off the fill is
    // the point.
    '& .fui-Input:not(:focus-within), & .fui-Combobox:not(:focus-within)': {
      backgroundColor: 'transparent',
    },
  },
  cellStateColor: {
    color: 'var(--fue-cell-color)',
    '& input, & .fui-Text': { color: 'var(--fue-cell-color)' },
  },
  cellStateWeight: {
    fontWeight: 'var(--fue-cell-font-weight)' as unknown as number,
    '& input': { fontWeight: 'var(--fue-cell-font-weight)' as unknown as number },
  },
  cellStateBorder: {
    outline: 'var(--fue-cell-border)',
    outlineOffset: '-1px',
  },
  /** An editable cell, while `showEditableHints` is on. */
  cellEditableHint: {
    boxShadow: `inset 0 -2px 0 0 ${tokens.colorBrandStroke2}`,
  },
  /** The box a custom cell tooltip hangs from. */
  cellTooltipTarget: {
    display: 'block',
    width: '100%',
    minWidth: 0,
  },
  cellNegative: {
    color: CELL_STYLE_TOKENS.negative.fg,
    fontWeight: tokens.fontWeightSemibold,
  },
  cellReadOnly: { color: CELL_STYLE_TOKENS.readOnly.fg },
  cellPlaceholder: { color: tokens.colorNeutralForeground3 },

  alignLeft: { textAlign: 'left' },
  alignCenter: { textAlign: 'center' },
  alignRight: { textAlign: 'right' },

  // ── Active cell and fill ──────────────────────────────────────────────────

  /**
   * The cell the keyboard and the fill handle act on. Drawn even when nothing
   * inside it holds focus, which is the difference between "this is where you
   * are" and "this is what you are typing into".
   */
  cellActive: {
    outlineWidth: tokens.strokeWidthThick,
    outlineStyle: 'solid',
    outlineColor: tokens.colorBrandStroke1,
    outlineOffset: '-2px',
    position: 'relative',
    zIndex: 1,
    // The fill handle straddles the corner, so the active cell must not clip it.
    // The value itself is still clipped by `cellContent`.
    ...shorthands.overflow('visible'),
  },
  /** The grip at the bottom-right of the active cell. */
  fillHandle: {
    position: 'absolute',
    // Centred on the corner of the outline, as Excel draws it. The outline is
    // 2px wide and inset, so its centre line runs 1px inside the cell edge.
    right: '-3px',
    bottom: '-3px',
    width: '8px',
    height: '8px',
    boxSizing: 'border-box',
    backgroundColor: tokens.colorBrandStroke1,
    // The light edge keeps the square separate from the outline and the
    // gridlines it sits across.
    ...shorthands.border('1px', 'solid', tokens.colorNeutralBackground1),
    // `grabbing` for the drag itself is set by `useFillHandle`, since the pointer
    // leaves the handle the moment it starts moving.
    cursor: 'grab',
    zIndex: 3,
    // Widens the hit area without widening the square, which at 8px is too
    // small to grab reliably.
    '::after': {
      content: '""',
      position: 'absolute',
      inset: '-4px',
    },
  },
  /** A cell the drag is currently over. */
  cellFillPreview: {
    outlineWidth: tokens.strokeWidthThin,
    outlineStyle: 'dashed',
    outlineColor: tokens.colorBrandStroke1,
    outlineOffset: '-1px',
    backgroundColor: tokens.colorBrandBackground2,
    position: 'relative',
    zIndex: 1,
  },

  // ── Editors ───────────────────────────────────────────────────────────────

  editorInput: {
    width: '100%',
    // Inputs carry a default intrinsic width that would otherwise widen the column.
    minWidth: 0,
    ...shorthands.borderStyle('none'),
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    color: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    fontFamily: 'inherit',
    textAlign: 'inherit',
    ...shorthands.padding('0', '2px'),
    boxSizing: 'border-box',
    // No ring of its own: the cell draws it, so a plain input and a Lookup read
    // the same when focused. Only the fill changes here, to lift the value off
    // whatever the row is painted.
    ':focus': {
      backgroundColor: tokens.colorNeutralBackground1,
      borderRadius: tokens.borderRadiusSmall,
    },
    // The number spinners eat 16px of a column that rarely has it to spare.
    '::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
    '::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
    MozAppearance: 'textfield',
  },

  /**
   * A control holding an unsaved edit. Outlined rather than merely tinted, so a
   * single changed cell is still findable on a row the consumer has also painted
   * as dirty.
   */
  editorDirty: {
    borderTopWidth: tokens.strokeWidthThin,
    borderRightWidth: tokens.strokeWidthThin,
    borderBottomWidth: tokens.strokeWidthThin,
    borderLeftWidth: tokens.strokeWidthThin,
    borderTopStyle: 'solid',
    borderRightStyle: 'solid',
    borderBottomStyle: 'solid',
    borderLeftStyle: 'solid',
    borderTopColor: tokens.colorPaletteYellowBorderActive,
    borderRightColor: tokens.colorPaletteYellowBorderActive,
    borderBottomColor: tokens.colorPaletteYellowBorderActive,
    borderLeftColor: tokens.colorPaletteYellowBorderActive,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorPaletteYellowBackground1,
  },

  /**
   * Sizing for a Lookup or OptionSetField dropped into a cell.
   *
   * Fluent's `small` controls are 24px, which is taller than a compact row.
   * Left alone the control wins and compact density comes out no denser than
   * comfortable, so the height is pinned to the density instead — on the inner
   * wrapper, because that is where the component puts its own `min-height`.
   */
  editorControl: {
    width: '100%',
    minWidth: 0,
    // The class lands on the component's own root, so the height is pinned here
    // and the inner wrapper — which is where Fluent puts its `min-height` — is
    // told to follow rather than to impose its own.
    height: 'var(--fue-grid-control-height, 24px)',
    fontSize: 'var(--fue-grid-font-size, 12px)',
    lineHeight: 'var(--fue-grid-line-height, 16px)',
    '> div': {
      minHeight: 0,
      height: '100%',
    },
    // Fluent's fields carry their own type scale, sized for a form rather than
    // for a grid row. Left alone a 14px date sits beside a 12px number, and the
    // column reads as a different font.
    '& input': {
      fontSize: 'var(--fue-grid-font-size, 12px)',
      lineHeight: 'var(--fue-grid-line-height, 16px)',
    },
  },

  /**
   * A choice cell showing only its badge until the cell is used.
   *
   * Fluent's combobox carries a filled background and an underline, which is
   * right on a form and wrong down a column — a hundred of them turns the grid
   * into a wall of input boxes and buries the badge the colour is carrying. The
   * chrome comes back on hover and focus, so the cell still reads as editable
   * at the point someone goes to edit it.
   */
  choiceAtRest: {
    // OptionSetField indents its badge by a form field's own input padding,
    // which leaves a badge sitting ten pixels right of the text in the columns
    // either side of it. A grid cell's text starts at 2px, so the badge does too.
    '--fue-optionset-badge-inset': '2px',
    '& .fui-Combobox': {
      backgroundColor: 'transparent',
      ...shorthands.borderColor('transparent'),
    },
    '& .fui-Combobox::after': { ...shorthands.borderColor('transparent') },
    // The chevron is chrome too, and reads as clutter beside a badge.
    '& .fui-Combobox__expandIcon': { opacity: 0 },
    ':hover': {
      '& .fui-Combobox': { backgroundColor: tokens.colorNeutralBackground1 },
      '& .fui-Combobox__expandIcon': { opacity: 1 },
    },
    ':focus-within': {
      '& .fui-Combobox': { backgroundColor: tokens.colorNeutralBackground1 },
      '& .fui-Combobox__expandIcon': { opacity: 1 },
    },
  },

  // ── Personas ──────────────────────────────────────────────────────────────

  personaWrap: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    minWidth: 0,
    height: 'var(--fue-grid-control-height, 24px)',
    ...shorthands.overflow('hidden'),
  },
  persona: {
    minWidth: 0,
    // Fluent's smallest avatar is 24px, which is taller than a compact row. The
    // coin scales with the density instead, so a person column does not get to
    // decide how tall every row is — and sits a little inside that height, or a
    // round coin reads as touching the rows above and below.
    '& .fui-Avatar': {
      width: 'calc(var(--fue-grid-control-height, 24px) - 4px)',
      height: 'calc(var(--fue-grid-control-height, 24px) - 4px)',
    },
    // The name is a Fluent `Text`, 14px by default. Scoped to `.fui-Text` rather
    // than to every span, so the avatar's initials keep the scale Fluent sizes
    // them at against the coin.
    '& .fui-Text': {
      fontSize: 'var(--fue-grid-font-size, 12px)',
      lineHeight: 'var(--fue-grid-line-height, 16px)',
    },
  },

  // ── Images ────────────────────────────────────────────────────────────────

  imageWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'var(--fue-grid-control-height, 24px)',
    width: '100%',
    cursor: 'zoom-in',
  },
  imageThumb: {
    // Sits a little inside the row height for the same reason the persona coin
    // does: a thumbnail flush against the gridlines reads as clipped rather than
    // as a picture.
    maxHeight: 'calc(var(--fue-grid-control-height, 24px) - 4px)',
    maxWidth: '100%',
    borderRadius: tokens.borderRadiusSmall,
    display: 'block',
  },
  imagePlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  imagePreviewSurface: {
    ...shorthands.padding(tokens.spacingVerticalXS),
    lineHeight: 0,
  },
  imagePreview: {
    display: 'block',
    borderRadius: tokens.borderRadiusMedium,
    objectFit: 'contain',
  },

  // ── Long text ─────────────────────────────────────────────────────────────
  //
  // A memo shows as one truncated line and edits in a popover. A row that grew
  // to fit its longest note would stop being a grid, and a 2,000-character value
  // cannot be edited in a cell 200px wide.

  memoTrigger: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('2px'),
    width: '100%',
    minWidth: 0,
    color: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    outlineStyle: 'none',
    // Reveals the expand button on hover and on keyboard focus, so the value has
    // the whole cell at rest and the affordance is still reachable by keyboard.
    ':hover > button': { opacity: 1 },
    ':focus-within > button': { opacity: 1 },
  },
  memoText: {
    flexGrow: 1,
    minWidth: 0,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  memoExpand: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    ...shorthands.padding('0'),
    ...shorthands.borderStyle('none'),
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1,
    // Hidden until the cell is hovered or focused: a button on every row of a
    // notes column is a column of buttons, not a column of notes.
    opacity: 0,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
    ':focus-visible': { opacity: 1 },
  },
  memoSurface: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    width: '380px',
    maxWidth: '90vw',
  },
  memoHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  memoTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  memoCount: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums',
  },
  memoCountNear: { color: tokens.colorPaletteDarkOrangeForeground1 },
  memoCountOver: {
    color: tokens.colorPaletteRedForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  memoTextarea: {
    width: '100%',
    maxWidth: '100%',
  },
  memoFooter: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    justifyContent: 'flex-end',
  },
  memoHint: {
    marginRight: 'auto',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },

  editorCheckboxWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'var(--fue-grid-control-height, 24px)',
    // Fluent's Checkbox root is 32px tall whatever its `size`, which is taller
    // than a compact row — so it, not the density setting, would decide how tall
    // every row is.
    '> *': {
      minHeight: 0,
      height: 'var(--fue-grid-control-height, 24px)',
      paddingTop: 0,
      paddingBottom: 0,
    },
  },
  editorCheckbox: {
    ...shorthands.margin('0'),
    cursor: 'pointer',
  },

  /**
   * A read-only flag, shown as a state icon rather than a disabled checkbox — a
   * checkbox invites a click that cannot do anything.
   */
  stateIconOn: {
    fontSize: '16px',
    color: tokens.colorPaletteGreenForeground1,
  },
  stateIconOff: {
    fontSize: '16px',
    color: tokens.colorPaletteRedForeground1,
  },

  // ── Affixes ───────────────────────────────────────────────────────────────
  //
  // A grey box carrying the unit, hard against the edge that unit belongs to:
  // `$` leads the value, `%` trails it. The value keeps the rest of the cell, so
  // the symbol never eats into the digits.

  affixWrap: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('1px'),
    width: '100%',
    minWidth: 0,
    // Deliberately not `height: 100%`. A percentage height inside a table cell
    // resolves against a cell that is itself sized by its content, and the
    // circularity inflates the row — compact density comes out taller than
    // comfortable. The cell's `vertical-align: middle` does the centring.
  },
  affix: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '13px',
    ...shorthands.padding('0', '2px'),
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: 'inherit',
    lineHeight: 'inherit',
    userSelect: 'none',
  },
  /** The control beside an affix: takes the remaining width, no more. */
  affixControl: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: 'auto',
  },

  // ── Pseudo columns ────────────────────────────────────────────────────────

  selectCell: {
    width: '32px',
    minWidth: '32px',
    maxWidth: '32px',
    ...shorthands.padding('0', '2px'),
    textAlign: 'center',
  },
  dragCell: {
    width: '24px',
    minWidth: '24px',
    maxWidth: '24px',
    ...shorthands.padding('0'),
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  dragHandle: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    cursor: 'grab',
    ':active': { cursor: 'grabbing' },
  },
  /** `renderRowIndicator` content on a row that cannot be dragged. */
  rowIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  /** A column-picker entry that shows or hides a whole `columnGroup`. */
  menuGroupToggle: {
    fontWeight: tokens.fontWeightSemibold,
  },

  // ── Group headers and subtotals ───────────────────────────────────────────

  groupRow: {
    backgroundColor: tokens.colorNeutralBackground6,
  },
  groupCell: {
    ...shorthands.padding('0', '10px'),
    fontSize: '11px',
    fontWeight: tokens.fontWeightBold,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    color: tokens.colorNeutralForeground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    borderLeft: `3px solid ${tokens.colorBrandBackground}`,
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground6,
    cursor: 'pointer',
    userSelect: 'none',
    // Pinned left so the label stays readable when the grid is scrolled sideways.
    position: 'sticky',
    left: 0,
  },
  /** A banner that only collapses from its chevron, because a double-click is taken. */
  groupCellStatic: {
    cursor: 'default',
  },
  /** A banner a dragged row is over. */
  groupCellDropTarget: {
    outlineWidth: tokens.strokeWidthThick,
    outlineStyle: 'dashed',
    outlineColor: tokens.colorBrandStroke1,
    outlineOffset: '-2px',
  },
  groupInner: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    whiteSpace: 'nowrap',
  },
  groupChevron: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    ...shorthands.padding('0'),
    ...shorthands.borderStyle('none'),
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '11px',
    lineHeight: 1,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  /** Whatever `renderGroupHeader` returns, laid out like the default label. */
  groupContent: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    minWidth: 0,
  },
  groupCount: {
    fontSize: '11px',
    fontWeight: tokens.fontWeightRegular,
    textTransform: 'none',
    letterSpacing: 'normal',
    color: tokens.colorNeutralForeground3,
  },
  subtotalRow: {
    backgroundColor: tokens.colorNeutralBackground4,
  },
  subtotalCell: {
    // Same padding as a body cell. Anything else and a total sits a couple of
    // pixels off the column it belongs to, which is exactly where the eye is
    // checking the alignment.
    ...shorthands.padding('0', '4px'),
    fontSize: '11px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground4,
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    ...shorthands.overflow('hidden'),
  },

  // ── Footer ────────────────────────────────────────────────────────────────

  tfoot: {
    position: 'sticky',
    bottom: 0,
    zIndex: 2,
  },
  footerCell: {
    // See `subtotalCell`: this has to match the body cell exactly.
    ...shorthands.padding('0', '4px'),
    height: '26px',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground3,
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    ...shorthands.overflow('hidden'),
  },

  // ── Toolbar ───────────────────────────────────────────────────────────────

  toolbar: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    minWidth: 0,
  },
  /** Grows into the free space, so commands only overflow when genuinely short. */
  toolbarCommands: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  /**
   * A further run of commands in the same toolbar — one placed after the search
   * box, say. The bar's own root fills its container and paints a background;
   * sitting beside another run it must do neither.
   */
  toolbarCommandsRun: {
    width: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    paddingLeft: 0,
    paddingRight: 0,
    backgroundColor: 'transparent',
  },
  toolbarSearch: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: '240px',
    maxWidth: '240px',
  },

  // ── Status and empty states ───────────────────────────────────────────────

  statusBar: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalM),
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  statusSpacer: { flexGrow: 1 },
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalXXL),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    ...shorthands.padding(tokens.spacingVerticalXXL),
    textAlign: 'center',
  },
  menuList: {
    maxHeight: '70vh',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
});
