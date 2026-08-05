import { makeStyles, tokens } from '@fluentui/react-components';

export const useRecordHoverCardStyles = makeStyles({
  surface: {
    minWidth: '280px',
    maxWidth: '360px',
    padding: tokens.spacingHorizontalM,
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },

  icon: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorBrandForeground1,
    fontSize: '20px',
    marginTop: '2px',
  },

  headerText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },

  title: {
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  subtitle: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },

  details: {
    display: 'grid',
    // Labels size to content so values share a common left edge
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    gap: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    marginTop: tokens.spacingVerticalM,
  },

  detailLabel: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
  },

  detailValue: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase200,
    minWidth: 0,
    overflowWrap: 'anywhere',
  },

  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  stateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minHeight: '48px',
  },

  errorText: {
    color: tokens.colorStatusDangerForeground1,
    fontSize: tokens.fontSizeBase200,
  },
});
