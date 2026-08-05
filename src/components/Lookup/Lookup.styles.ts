import { makeStyles, tokens } from '@fluentui/react-components';

export const useLookupStyles = makeStyles({
  root: {
    position: 'relative',
    display: 'inline-flex',
    flexDirection: 'column',
    width: '100%',
  },

  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },

  input: {
    width: '100%',
  },

  /**
   * At rest with a record selected, Dynamics renders the value as a link rather than
   * plain input text - it doubles as the affordance for opening the record.
   */
  inputSelectedText: {
    color: tokens.colorBrandForeground1,
    cursor: 'pointer',
    ':hover': {
      textDecorationLine: 'underline',
    },
  },

  /** Entity icon shown before the value, matching the Dynamics lookup rest state */
  entityIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '16px',
    height: '16px',
    color: tokens.colorBrandForeground1,
    fontSize: '16px',
  },

  /** Entity image, when the table has one configured. Square to match Dynamics. */
  entityImage: {
    flexShrink: 0,
    width: '16px',
    height: '16px',
    borderRadius: tokens.borderRadiusSmall,
    objectFit: 'cover',
  },

  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },

  iconButton: {
    minWidth: '20px',
    minHeight: '20px',
    padding: '0',
  },

  chevronIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
  },

  dropdownPortal: {
    position: 'absolute',
    padding: 0,
    minWidth: '220px',
    zIndex: 1000000,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow16,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },

  dropdownContent: {
    maxHeight: '350px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    padding: '4px',
    gap: '2px',
  },

  option: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '8px',
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusNone,
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    overflow: 'hidden',
    textAlign: 'left',
    gap: '10px',
    minHeight: '40px',

    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },

    '&:focus': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      outline: `2px solid ${tokens.colorBrandStroke1}`,
      outlineOffset: '-2px',
    },
  },

  optionIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    fontSize: '20px',
    flexShrink: 0,
    color: tokens.colorNeutralForeground1,
    marginTop: '0px', // Centered on single text row
  },

  optionIconWithSecondary: {
    marginTop: '6px', // Centered between text + secondaryText rows
  },

  optionContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    minWidth: 0,
    gap: '2px',
  },

  optionExpandButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    marginLeft: 'auto',
    marginTop: '2px',
    flexShrink: 0,
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: 'transparent',
    border: 'none',
    color: tokens.colorNeutralForeground3,
    transition: 'transform 0.2s ease',

    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },

  optionExpandButtonExpanded: {
    transform: 'rotate(180deg)',
  },

  optionHighlighted: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },

  optionSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },

  optionDisabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },

  optionText: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase300,
  },

  optionSecondaryText: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase200,
  },

  optionDetails: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '4px',
    paddingTop: '4px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    gap: '2px',
  },

  optionDetailRow: {
    display: 'flex',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    gap: '4px',
  },

  optionDetailLabel: {
    color: tokens.colorNeutralForeground4,
  },

  optionDetailValue: {
    color: tokens.colorNeutralForeground3,
  },

  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },

  noResults: {
    padding: '16px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
  },

  headerWrapper: {
    padding: '2px',
    backgroundColor: tokens.colorNeutralBackground1,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: tokens.borderRadiusMedium,
    padding: '6px 12px',
    minHeight: '24px',
    backgroundColor: tokens.colorNeutralBackground3,
    backgroundImage: `repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 1px,
      rgba(0, 0, 0, 0.02) 1px,
      rgba(0, 0, 0, 0.02) 2px
    )`,
    gap: '8px',
  },

  footerWrapper: {
    padding: '8px',
    paddingTop: '0',
    backgroundColor: tokens.colorNeutralBackground1,
  },

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    minHeight: '24px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    gap: '8px',
  },

  optionsContainer: {
    maxHeight: '250px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
});
