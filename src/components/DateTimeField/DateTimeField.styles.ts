import { makeStyles, tokens } from '@fluentui/react-components';

export const useDateTimeFieldStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: 0,
  },

  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: '100%',
    minWidth: 0,
  },

  /** The input wrapper - clickable to open popup */
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    minWidth: 0,
    minHeight: '32px',
    paddingLeft: '8px',
    paddingRight: '4px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    boxSizing: 'border-box',

    ':hover': {
      border: `1px solid ${tokens.colorNeutralStroke1Hover}`,
    },

    ':focus-within': {
      outline: 'none',
    },
  },

  inputWrapperFilled: {
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid transparent`,

    ':focus-within': {
      backgroundColor: tokens.colorNeutralBackground1,
      border: `1px solid ${tokens.colorCompoundBrandStroke}`,
      borderBottomColor: tokens.colorCompoundBrandStroke,
      borderBottomWidth: '2px',
    },
  },

  inputWrapperSmall: {
    minHeight: '24px',
    paddingLeft: '6px',
    paddingRight: '2px',
  },

  inputWrapperDisabled: {
    backgroundColor: tokens.colorNeutralBackgroundDisabled,
    border: `1px solid ${tokens.colorNeutralStrokeDisabled}`,
    cursor: 'not-allowed',
    ':hover': {
      border: `1px solid ${tokens.colorNeutralStrokeDisabled}`,
    },
  },

  inputWrapperFocused: {
    border: `1px solid ${tokens.colorCompoundBrandStroke}`,
    borderBottomColor: tokens.colorCompoundBrandStroke,
    borderBottomWidth: '2px',
  },

  inputText: {
    flex: 1,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  inputPlaceholder: {
    color: tokens.colorNeutralForeground4,
  },

  /** Editable input field for free typing */
  inputField: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    padding: 0,
    margin: 0,
    minWidth: 0,
    fontFamily: 'inherit',

    '::placeholder': {
      color: tokens.colorNeutralForeground4,
    },

    ':disabled': {
      color: tokens.colorNeutralForegroundDisabled,
      cursor: 'not-allowed',
    },
  },

  inputIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    paddingLeft: '4px',
    color: tokens.colorNeutralForeground3,
  },

  /** Portal popup container */
  popupPortal: {
    position: 'absolute',
    zIndex: 1000000,
    boxShadow: tokens.shadow8,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },

  /** Main popup content layout */
  popupContent: {
    display: 'flex',
    flexDirection: 'row',
  },

  /** Calendar section (left side) */
  calendarSection: {
    padding: tokens.spacingHorizontalM,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  /** Time section (right side) */
  timeSection: {
    display: 'flex',
    flexDirection: 'column',
    width: '100px',
  },

  /** Time section in time-only mode (centered, wider) */
  timeSectionOnly: {
    display: 'flex',
    flexDirection: 'column',
    width: '150px',
  },

  timeSectionHeader: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    textAlign: 'center',
  },

  timeList: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: '220px',
  },

  timeOption: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    textAlign: 'center',

    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },

  timeOptionSelected: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,

    ':hover': {
      backgroundColor: tokens.colorBrandBackgroundHover,
    },
  },

  timeOptionDisabled: {
    color: tokens.colorNeutralForegroundDisabled,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },

  /** Footer with action buttons */
  popupFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacingHorizontalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    gap: tokens.spacingHorizontalS,
  },

  footerLeft: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },

  footerRight: {
    marginLeft: 'auto',
  },

  clearButton: {
    flexShrink: 0,
  },

  /** Clear icon inside input wrapper */
  clearIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '4px',
    paddingRight: '4px',
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',

    ':hover': {
      color: tokens.colorNeutralForeground1,
    },
  },

  /** Surfaces the storage behavior so an unexpected conversion is diagnosable */
  behaviorHint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXXS,
  },

  errorText: {
    color: tokens.colorStatusDangerForeground1,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXXS,
  },

  // Legacy styles kept for backward compatibility
  datePicker: {
    flexGrow: 1,
    minWidth: 0,
  },

  timeDropdown: {
    flexShrink: 0,
    minWidth: '110px',
  },
});
