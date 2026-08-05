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

  datePicker: {
    flexGrow: 1,
    minWidth: 0,
  },

  timeDropdown: {
    flexShrink: 0,
    minWidth: '110px',
  },

  clearButton: {
    flexShrink: 0,
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
});
