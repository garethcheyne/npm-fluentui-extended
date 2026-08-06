import { makeStyles, tokens } from '@fluentui/react-components';

export const useEntityGridStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: 0,
    minHeight: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    // Chrome above the scrolling body never shrinks
    flexShrink: 0,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  title: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase400,
  },

  commands: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
  },

  /** The only scrolling region - header and footer stay pinned around it */
  body: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'auto',
  },

  table: {
    width: '100%',
    minWidth: 'max-content',
  },

  // Sticky table header for virtualized scrolling
  stickyHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
  },

  headerCell: {
    whiteSpace: 'nowrap',
    position: 'relative',
  },

  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },

  headerCellContent: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    width: '100%',
  },

  headerLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    flexGrow: 1,
    cursor: 'pointer',
  },

  sortIcon: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },

  // Column actions (pin button, etc.)
  columnActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    opacity: 0,
    transition: 'opacity 0.1s',
  },

  columnAction: {
    minWidth: '20px',
    width: '20px',
    height: '20px',
    padding: 0,
  },

  columnActionActive: {
    color: tokens.colorBrandForeground1,
    opacity: 1,
  },

  // Resize handle
  resizeHandle: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '4px',
    height: '100%',
    cursor: 'col-resize',
    backgroundColor: 'transparent',
    ':hover': {
      backgroundColor: tokens.colorBrandBackground,
    },
  },

  // Pinned column styling
  pinnedColumn: {
    position: 'sticky',
    left: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: `2px 0 4px ${tokens.colorNeutralShadowAmbient}`,
  },

  row: {
    cursor: 'default',
    ':focus': {
      outline: `2px solid ${tokens.colorBrandStroke1}`,
      outlineOffset: '-2px',
    },
  },

  rowClickable: {
    cursor: 'pointer',
  },

  rowSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },

  cell: {
    // Long values truncate rather than forcing the whole table wider
    maxWidth: '320px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  stateRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
  },

  errorText: {
    color: tokens.colorStatusDangerForeground1,
  },

  // Loading more indicator for infinite scroll
  loadingMore: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
  },

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexShrink: 0,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  footerText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },

  // Progress bar for infinite scroll
  progressContainer: {
    width: '100px',
    height: '4px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusSmall,
    overflow: 'hidden',
    marginLeft: tokens.spacingHorizontalS,
    marginRight: tokens.spacingHorizontalS,
  },

  progressBar: {
    height: '100%',
    backgroundColor: tokens.colorBrandBackground,
    transition: 'width 0.3s ease',
  },

  pager: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
});
