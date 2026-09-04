import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * Chrome geometry reproducing what a model-driven form actually measures, so a
 * component developed locally resolves the same numbers it will in the org.
 *
 * These values are not decorative. Measured on a live form:
 *
 * - the web resource's wrapper supplies 7px above and below the control and
 *   nothing at the sides, and clips — which is what `FluentShell`'s ancestor
 *   walk reads, and where it stops
 * - the header card sits 8px inside the frame's left edge and 20px inside its
 *   right — which is what `FluentShell` aligns to
 *
 * Change these and local development stops predicting production. Everything
 * else in this file is appearance and may be adjusted freely.
 */
export const HARNESS_GEOMETRY = {
  /** Vertical padding the real `webResourceLabelControlWrapper` applies. */
  frameWrapperPaddingY: '7px',
  /** Header card inset from the frame's left edge. */
  headerInsetLeft: '8px',
  /** Header card inset from the frame's right edge. */
  headerInsetRight: '20px',
} as const;

/** The blue Dynamics uses for the top bar. Not a Fluent token — it is app chrome. */
const BRAND_BAR = '#1a3f6f';
const NAV_WIDTH = '224px';

export const useD365TestHarnessStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground3,
    fontFamily: tokens.fontFamilyBase,
    overflow: 'hidden',
  },

  // ─── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    height: '48px',
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: BRAND_BAR,
    color: '#ffffff',
    fontSize: tokens.fontSizeBase300,
  },
  waffle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    fontSize: '20px',
    opacity: 0.9,
  },
  orgName: {
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  },
  topDivider: {
    width: '1px',
    height: '24px',
    marginLeft: tokens.spacingHorizontalM,
    marginRight: tokens.spacingHorizontalM,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  productName: {
    opacity: 0.92,
    whiteSpace: 'nowrap',
  },
  appName: {
    marginLeft: tokens.spacingHorizontalXXL,
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: 'nowrap',
  },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: '360px',
    maxWidth: '32vw',
    marginLeft: 'auto',
    marginRight: 'auto',
    height: '30px',
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    fontSize: tokens.fontSizeBase200,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  topActions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginLeft: 'auto',
    fontSize: '16px',
    opacity: 0.92,
  },
  harnessBadge: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    fontSize: '10px',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  },
  avatar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#8a8886',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },

  // ─── Notification strip ───────────────────────────────────────────────────
  notification: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },

  // ─── Body: sitemap + content ──────────────────────────────────────────────
  body: {
    flexGrow: 1,
    display: 'flex',
    minHeight: 0,
  },
  sideNav: {
    flexShrink: 0,
    width: NAV_WIDTH,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: tokens.colorNeutralStroke2,
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  hamburger: {
    display: 'flex',
    alignItems: 'center',
    height: '40px',
    paddingLeft: tokens.spacingHorizontalL,
    fontSize: '16px',
    color: tokens.colorNeutralForeground2,
  },
  navGroupLabel: {
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalL,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  navItem: {
    // Reset, so the same class can dress a <span> or a <button>.
    appearance: 'none',
    backgroundColor: 'transparent',
    borderTopStyle: 'none',
    borderRightStyle: 'none',
    borderBottomStyle: 'none',
    borderLeftStyle: 'none',
    textAlign: 'left',
    width: '100%',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    height: '32px',
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalM,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  navItemSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: tokens.colorBrandStroke1,
    paddingLeft: `calc(${tokens.spacingHorizontalL} - 3px)`,
  },
  navIcon: {
    flexShrink: 0,
    fontSize: '16px',
    color: tokens.colorNeutralForeground3,
  },

  // Mirrors #mainContentContainer_0: the column holding the header and tab body.
  mainContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    backgroundColor: '#fafafa',
  },
  // Mirrors #outerHeaderContainer_0 — full width, paints nothing.
  outerHeader: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  // Mirrors #headerBodyContainer — the card FluentShell aligns to.
  headerBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
    marginLeft: HARNESS_GEOMETRY.headerInsetLeft,
    marginRight: HARNESS_GEOMETRY.headerInsetRight,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: '0px',
    paddingLeft: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
  },
  backArrow: {
    marginTop: '4px',
    fontSize: '16px',
    color: tokens.colorNeutralForeground2,
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  recordTitle: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  savedFlag: {
    marginLeft: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground3,
  },
  recordSubtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    marginLeft: 'auto',
  },
  statusBlock: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: tokens.lineHeightBase200,
  },
  statusValue: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  statusLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  command: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
  },
  tabList: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    marginTop: '0px',
    marginBottom: '0px',
    marginLeft: '0px',
    marginRight: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
    paddingLeft: '0px',
    paddingRight: '0px',
    listStyleType: 'none',
  },
  tab: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  tabSelected: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorBrandStroke1,
  },

  // Mirrors #tab-section0 — the scrolling body the control lives in.
  tabSection: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  // Mirrors the control's wrapper: 7px above and below, nothing at the sides,
  // and it clips — the ancestor walk stops here.
  frameWrapper: {
    flexGrow: 1,
    display: 'flex',
    minHeight: 0,
    paddingTop: HARNESS_GEOMETRY.frameWrapperPaddingY,
    paddingBottom: HARNESS_GEOMETRY.frameWrapperPaddingY,
    overflow: 'hidden',
  },
  frame: {
    flexGrow: 1,
    width: '100%',
    // Longhands: Griffel rejects the `border*` shorthands outright.
    borderTopStyle: 'none',
    borderRightStyle: 'none',
    borderBottomStyle: 'none',
    borderLeftStyle: 'none',
    display: 'block',
  },
});
