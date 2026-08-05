import { makeStyles, tokens } from '@fluentui/react-components';

export const useCommandBarStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    width: '100%',
    minWidth: 0,
    // The bar is chrome: it never absorbs pressure from a scrolling body beside it
    flexShrink: 0,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorNeutralBackground1,
  },

  /** Measured region holding the primary commands */
  itemsRegion: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexGrow: 1,
    minWidth: 0,
    // Hidden rather than auto: commands that do not fit move to the overflow menu,
    // so a scrollbar here would only ever appear when overflow is disabled
    overflow: 'hidden',
  },

  itemsRegionScrolling: {
    overflowX: 'auto',
    overflowY: 'hidden',
  },

  farRegion: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
  },

  command: {
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },

  /**
   * Commands that did not fit stay mounted but hidden, so measurement stays stable.
   * `visibility` rather than `display` keeps their width measurable on the next pass.
   */
  commandHidden: {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
  },

  divider: {
    flexShrink: 0,
    width: '1px',
    alignSelf: 'stretch',
    marginLeft: tokens.spacingHorizontalXXS,
    marginRight: tokens.spacingHorizontalXXS,
    backgroundColor: tokens.colorNeutralStroke2,
  },

  overflowTrigger: {
    flexShrink: 0,
  },
});
