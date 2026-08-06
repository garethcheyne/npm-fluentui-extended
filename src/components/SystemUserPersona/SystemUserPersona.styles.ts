import { makeStyles, tokens } from '@fluentui/react-components';

export const useSystemUserPersonaStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
    maxWidth: '100%',
  },

  text: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    lineHeight: tokens.lineHeightBase200,
  },

  name: {
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /** Dynamics renders a person's name as a link wherever the record can be opened */
  nameClickable: {
    color: tokens.colorBrandForeground1,
    cursor: 'pointer',
    ':hover': {
      textDecorationLine: 'underline',
    },
  },

  secondary: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  tertiary: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // ── Hover card ──────────────────────────────────────────────────────────────

  cardSurface: {
    width: '320px',
    maxWidth: '320px',
    padding: 0,
    overflow: 'hidden',
  },

  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalL,
    paddingBottom: tokens.spacingVerticalM,
  },

  cardHeaderText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: '2px',
  },

  cardName: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
  },

  cardTitle: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },

  cardSection: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
  },

  cardSectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
    marginBottom: tokens.spacingVerticalS,
  },

  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    minHeight: '28px',
    minWidth: 0,
  },

  contactIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '16px',
    color: tokens.colorNeutralForeground3,
    fontSize: '16px',
  },

  contactValue: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase200,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /** Email and phone rows are actionable in Dynamics, so they read as links */
  contactLink: {
    fontSize: tokens.fontSizeBase200,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
  },

  cardStateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingHorizontalL,
    minHeight: '72px',
  },

  errorText: {
    color: tokens.colorStatusDangerForeground1,
    fontSize: tokens.fontSizeBase200,
  },

  disabledBadge: {
    marginLeft: tokens.spacingHorizontalXS,
  },
});
