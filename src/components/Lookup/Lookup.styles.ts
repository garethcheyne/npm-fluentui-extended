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

  // ─────────────────────────────────────────────────────────────────────────────
  // TAG-INPUT STYLES (Dynamics 365 native lookup style)
  // Selected badges appear INSIDE the input field, inline with the search input
  // ─────────────────────────────────────────────────────────────────────────────

  /** Outer wrapper that looks like an input field */
  tagInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    minHeight: '32px',
    paddingLeft: '8px',
    paddingRight: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    boxSizing: 'border-box',
    cursor: 'text',
    gap: '4px',

    ':hover': {
      border: `1px solid ${tokens.colorNeutralStroke1Hover}`,
    },

    // Bottom accent only, matching the filled variant and native Dynamics
    ':focus-within': {
      borderBottomColor: tokens.colorCompoundBrandStroke,
      borderBottomWidth: '2px',
      outline: 'none',
    },
  },

  tagInputWrapperFilled: {
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid transparent`,

    /**
     * Focus is signalled by the bottom accent alone, which is how a native Dynamics
     * field behaves: the fill stays put and there is no full brand box. Swapping the
     * background to white or ringing the control in blue both make it look like it
     * changed type mid-interaction.
     */
    ':focus-within': {
      borderBottomColor: tokens.colorCompoundBrandStroke,
      borderBottomWidth: '2px',
    },
  },

  /** Small size - 24px height to match FluentUI small controls */
  tagInputWrapperSmall: {
    minHeight: '24px',
    paddingLeft: '6px',
    paddingRight: '2px',
  },

  tagInputWrapperDisabled: {
    backgroundColor: tokens.colorNeutralBackgroundDisabled,
    border: `1px solid ${tokens.colorNeutralStrokeDisabled}`,
    cursor: 'not-allowed',
    ':hover': {
      border: `1px solid ${tokens.colorNeutralStrokeDisabled}`,
    },
  },

  /** Inner container for badges - allows wrapping */
  tagInputBadgesArea: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4px',
    flex: '1 1 auto',
    minWidth: 0,
    paddingTop: '2px',
    paddingBottom: '2px',
  },

  /** The actual text input inside the tag input */
  tagInputField: {
    flex: '1 1 60px',
    minWidth: '60px',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground1,
    padding: 0,
    margin: 0,

    '::placeholder': {
      color: tokens.colorNeutralForeground4,
    },

    ':disabled': {
      cursor: 'not-allowed',
      color: tokens.colorNeutralForegroundDisabled,
    },
  },

  /** Icons container on the right side of tag input */
  tagInputIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flexShrink: 0,
    marginLeft: 'auto',
  },

  /** Badge rendered inside the tag-input (Dynamics style) */
  inlineBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 4px 2px 4px',
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    maxWidth: '180px',
    flexShrink: 0,
  },

  /** Entity icon inside the inline badge */
  inlineBadgeIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    flexShrink: 0,
    fontSize: '14px',
    color: tokens.colorBrandForeground1,
  },

  /** Badge text - shown in link color */
  inlineBadgeText: {
    color: tokens.colorBrandForeground1,
    cursor: 'pointer',
    ':hover': {
      textDecorationLine: 'underline',
    },
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: tokens.fontWeightRegular,
  },

  /** Opt-out of the link treatment via recordLinkAppearance={false} */
  inlineBadgeTextPlain: {
    color: tokens.colorNeutralForeground1,
    cursor: 'default',
    ':hover': {
      textDecorationLine: 'none',
    },
  },

  /** Dismiss button inside the inline badge */
  inlineBadgeDismiss: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    padding: 0,
    border: 'none',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,

    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
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
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },

  dropdownContent: {
    maxHeight: '350px',
    display: 'flex',
    flexDirection: 'column',
    // Scrolling belongs to `optionsContainer` below, so the header and footer stay
    // pinned while only the list moves
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

  // ─────────────────────────────────────────────────────────────────────────────
  // MULTI-SELECT BADGE STYLES
  // ─────────────────────────────────────────────────────────────────────────────

  /** Container for selected badges in multiSelect mode - sits above the input */
  selectedBadgesContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginBottom: '4px',
  },

  /** Individual selected item badge - pale blue with dismiss button */
  selectedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px 2px 8px',
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorNeutralForeground1,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    maxWidth: '200px',
  },

  /** Badge text - truncates if too long */
  selectedBadgeText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /** Dismiss button on the badge */
  selectedBadgeDismiss: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    padding: 0,
    border: 'none',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground2,
    flexShrink: 0,

    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },

  /** Checkbox shown on options in multiSelect mode - aligned with icon */
  optionCheckbox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    flexShrink: 0,
  },

  optionCheckboxWithSecondary: {
    marginTop: '6px', // Match icon alignment when secondary text present
  },

  /** Overflow counter badge (e.g., "+2 more") */
  overflowBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    backgroundColor: tokens.colorNeutralBackground4,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightRegular,
    flexShrink: 0,
    cursor: 'default',
  },
});
