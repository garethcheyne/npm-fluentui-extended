import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

/** Grid with 4th column for "between" value2 input */
const gridWithBetween = 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto';
/** Grid without 4th column (standard 3-column + actions) */
const gridWithoutBetween = 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) auto';

/** Tree connector column width */
const treeConnectorWidth = '24px';

export { mergeClasses };

export const useQueryBuilderStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusSmall,
    overflow: 'hidden',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerTitle: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase400,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
  },
  toolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  caption: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  groupsContainer: {
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalM,
    minWidth: 0,
    overflow: 'hidden',
  },
  rootLogicRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalXS,
  },
  rootLogicSelect: {
    width: '70px',
  },
  /** Grid row for each group: [connector] [card] */
  groupTreeRow: {
    display: 'grid',
    gridTemplateColumns: `${treeConnectorWidth} minmax(0, 1fr)`,
    minHeight: '32px',
  },
  /** Tree connector cell - draws vertical + horizontal lines */
  treeConnector: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingTop: '16px',
  },
  /** Vertical line extending full height of connector cell */
  treeConnectorLine: {
    position: 'absolute',
    left: '8px',
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: tokens.colorBrandStroke1,
  },
  /** Horizontal branch from vertical line to content */
  treeConnectorBranch: {
    position: 'absolute',
    left: '8px',
    top: '16px',
    width: '14px',
    height: '1px',
    backgroundColor: tokens.colorBrandStroke1,
  },
  /** Hide vertical line below for last item */
  treeConnectorLast: {
    ':after': {
      content: '""',
      position: 'absolute',
      left: '8px',
      top: '17px',
      bottom: 0,
      width: '1px',
      backgroundColor: tokens.colorNeutralBackground1,
    },
  },
  groupCard: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingHorizontalS,
    display: 'flex',
    flexDirection: 'column',
    marginBottom: tokens.spacingVerticalS,
    minWidth: 0,
    overflow: 'hidden',
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingBottom: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalS,
  },
  groupHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  groupLogicSelect: {
    minWidth: '92px',
  },
  groupHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  /** Conditions list inside group card */
  conditionsList: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },
  /** Grid row for each condition: [connector] [row content] */
  conditionTreeRow: {
    display: 'grid',
    gridTemplateColumns: `${treeConnectorWidth} minmax(0, 1fr)`,
    minHeight: '36px',
    alignItems: 'center',
  },
  /** Inner connector for conditions within a group */
  conditionConnector: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  conditionConnectorLine: {
    position: 'absolute',
    left: '8px',
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: tokens.colorBrandStroke1,
  },
  conditionConnectorBranch: {
    position: 'absolute',
    left: '8px',
    top: '50%',
    width: '14px',
    height: '1px',
    backgroundColor: tokens.colorBrandStroke1,
  },
  conditionConnectorLast: {
    ':after': {
      content: '""',
      position: 'absolute',
      left: '8px',
      top: '50%',
      bottom: 0,
      width: '1px',
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  columnHeaderRow: {
    display: 'grid',
    gridTemplateColumns: gridWithoutBetween,
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    minWidth: 0,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
    marginBottom: tokens.spacingVerticalXS,
  },
  columnHeaderRowWithBetween: {
    gridTemplateColumns: gridWithBetween,
  },
  headerField: {},
  headerOperator: {},
  headerValue: {},
  headerAnd: {},
  headerRemove: {},
  rowGrid: {
    display: 'grid',
    gridTemplateColumns: gridWithoutBetween,
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    minWidth: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusSmall,
    padding: tokens.spacingHorizontalXS,
    boxSizing: 'border-box',
  },
  rowGridWithBetween: {
    gridTemplateColumns: gridWithBetween,
  },
  fieldCell: {},
  operatorCell: {},
  valueCell: {},
  andCell: {},
  compactControl: {
    width: '100%',
    minWidth: 0,
  },
  removeCell: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  /** Add button row */
  addButtonRow: {
    display: 'grid',
    gridTemplateColumns: `${treeConnectorWidth} auto 1fr`,
    minHeight: '36px',
    alignItems: 'center',
    marginTop: tokens.spacingVerticalXS,
  },
  addButtonConnector: {
    position: 'relative',
    height: '100%',
  },
  addButtonConnectorLine: {
    position: 'absolute',
    left: '8px',
    top: 0,
    height: '50%',
    width: '1px',
    backgroundColor: tokens.colorBrandStroke1,
  },
  addButtonConnectorBranch: {
    position: 'absolute',
    left: '8px',
    top: '50%',
    width: '14px',
    height: '1px',
    backgroundColor: tokens.colorBrandStroke1,
    transform: 'translateY(-50%)',
  },
  menuGlyph: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    color: tokens.colorNeutralForeground2,
  },
  /** Bottom-level add row for adding groups/related entities */
  bottomAddRow: {
    display: 'grid',
    gridTemplateColumns: `${treeConnectorWidth} auto 1fr`,
    minHeight: '36px',
    alignItems: 'center',
  },
  bottomAddConnector: {
    position: 'relative',
    height: '100%',
  },
  bottomAddConnectorLine: {
    position: 'absolute',
    left: '8px',
    top: 0,
    height: '50%',
    width: '1px',
    backgroundColor: tokens.colorBrandStroke1,
  },
  bottomAddConnectorBranch: {
    position: 'absolute',
    left: '8px',
    top: '50%',
    width: '14px',
    height: '1px',
    backgroundColor: tokens.colorBrandStroke1,
    transform: 'translateY(-50%)',
  },
  previewCard: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
    marginLeft: tokens.spacingHorizontalM,
    marginRight: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conditionInvalid: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: tokens.borderRadiusSmall,
  },
  validationIcon: {
    marginRight: tokens.spacingHorizontalXS,
  },
  validationSuccess: {
    color: tokens.colorPaletteGreenForeground1,
  },
  validationError: {
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
  validationErrorList: {
    margin: 0,
    paddingLeft: tokens.spacingHorizontalL,
    listStyleType: 'disc',
  },
  validationErrorItem: {
    marginBottom: tokens.spacingVerticalXS,
  },
  apiValidationSection: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: tokens.spacingVerticalM,
  },
  apiUnavailable: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    marginTop: tokens.spacingVerticalXS,
  },
  previewCode: {
    display: 'block',
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    color: tokens.colorNeutralForeground2,
    marginTop: tokens.spacingVerticalXS,
  },
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXL,
  },
});
