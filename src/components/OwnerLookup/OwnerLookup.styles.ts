import { makeStyles, tokens } from '@fluentui/react-components';

export const useOwnerLookupStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: 0,
  },

  /** Type filter shown in the dropdown header when both owner types are offered */
  typeFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },

  /** Team hover card. Users get the richer SystemUserCard instead. */
  teamCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    minWidth: '220px',
    maxWidth: '320px',
  },

  teamCardName: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase400,
  },

  teamCardLine: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },

  teamCardActions: {
    marginTop: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  errorText: {
    color: tokens.colorStatusDangerForeground1,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXXS,
  },
});
