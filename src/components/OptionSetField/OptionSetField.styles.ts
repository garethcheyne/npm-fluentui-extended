import { makeStyles, tokens } from '@fluentui/react-components';

export const useOptionSetFieldStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: 0,
  },

  controlShell: {
    position: 'relative',
    width: '100%',
    minWidth: 0,
  },

  dropdown: {
    width: '100%',
    minWidth: 0,

    '& input': {
      backgroundColor: 'transparent',
      backgroundImage: 'none',
    },
  },

  comboboxWithBadgeValue: {
    '& input': {
      color: 'transparent',
      caretColor: 'transparent',
    },
  },

  listbox: {
    maxHeight: '320px',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
  },

  badgeValueOverlay: {
    position: 'absolute',
    left: '12px',
    right: '32px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },

  optionContent: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },

  /** Metadata colour swatch. Falls back to a neutral border when no colour is set. */
  swatch: {
    flexShrink: 0,
    width: '10px',
    height: '10px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  optionLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /** Container for badges in the dropdown trigger */
  badgeContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    alignItems: 'center',
    lineHeight: 1,
    minWidth: 0,
    overflow: 'hidden',
  },

  /** Badge style for options with a colour when asBadge is enabled */
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    paddingLeft: '6px',
    paddingRight: '6px',
    paddingTop: '1px',
    paddingBottom: '1px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: '16px',
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorBrandBackground,
  },

  /** Badge style for options without a colour */
  badgeNoColor: {
    display: 'inline-flex',
    alignItems: 'center',
    paddingLeft: '6px',
    paddingRight: '6px',
    paddingTop: '1px',
    paddingBottom: '1px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: '16px',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground3,
  },

  /** Lighter badge text for dark backgrounds */
  badgeLightText: {
    color: '#ffffff',
  },

  /** Darker badge text for light backgrounds */
  badgeDarkText: {
    color: '#000000',
  },

  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
  },

  errorText: {
    color: tokens.colorStatusDangerForeground1,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXXS,
  },
});
