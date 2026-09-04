import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * The card surface Dynamics 365 draws, measured from a live model-driven form
 * rather than approximated.
 *
 * The standard form header card computes to:
 *
 *   box-shadow:    rgba(0,0,0,0.12) 0 0 2px, rgba(0,0,0,0.14) 0 2px 4px
 *   border-radius: 8px
 *   border:        1px solid rgba(0,0,0,0)
 *   background:    #ffffff  on a #fafafa ground
 *
 * which is Fluent's `shadow4`, `borderRadiusXLarge`, and `colorNeutralBackground1`
 * on `colorNeutralBackground2`. The border is the detail most often got wrong:
 * D365 reserves the pixel and paints nothing, letting the shadow define the edge.
 * A visible hairline there reads as a harder, foreign edge beside real D365 cards.
 */
export const useFluentContainerStyles = makeStyles({
  root: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    // Longhands: Griffel expands the `border` shorthand last, which would wipe a
    // caller's per-side override.
    borderTopWidth: tokens.strokeWidthThin,
    borderRightWidth: tokens.strokeWidthThin,
    borderBottomWidth: tokens.strokeWidthThin,
    borderLeftWidth: tokens.strokeWidthThin,
    borderTopStyle: 'solid',
    borderRightStyle: 'solid',
    borderBottomStyle: 'solid',
    borderLeftStyle: 'solid',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    // Lets a flex child scroll instead of forcing this card to grow.
    minHeight: 0,
  },
  elevated: {
    boxShadow: tokens.shadow4,
  },
  // Sizes to content and refuses to be squashed by a filling sibling.
  auto: {
    flexShrink: 0,
  },
  fill: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  paddingCompact: {
    paddingTop: tokens.spacingVerticalS,
    paddingRight: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
  },
  paddingComfortable: {
    paddingTop: tokens.spacingVerticalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalM,
  },
  scrollVisible: {
    overflow: 'visible',
  },
  scrollClip: {
    overflow: 'hidden',
  },
  scrollVertical: {
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  scrollHorizontal: {
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  scrollBoth: {
    overflow: 'auto',
  },
});
