import { makeStyles, tokens, shorthands } from '@fluentui/react-components';

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

  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    marginTop: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow16,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    maxHeight: '350px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  optionsList: {
    listStyle: 'none',
    margin: 0,
    padding: '4px',
  },

  option: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    gap: '8px',

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
    width: '20px',
    height: '20px',
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
  },

  optionContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },

  optionExpandButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
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
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground1,
  },

  optionSecondaryText: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
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
    padding: '4px 12px',
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
