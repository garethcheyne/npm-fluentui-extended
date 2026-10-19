import { makeStyles, tokens } from '@fluentui/react-components';

export const useAddressLookupStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: 0,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },

  errorText: {
    color: tokens.colorStatusDangerForeground1,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXXS,
  },
});

export const useAddressMapCardStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    width: '340px',
  },

  /** Google draws into this node, so it owns everything inside it */
  map: {
    position: 'relative',
    width: '100%',
    height: '150px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
    overflow: 'hidden',
  },

  mapCanvas: {
    position: 'absolute',
    inset: 0,
  },

  /** Covers the canvas until Google reports the map idle, so no grey flash */
  mapOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: tokens.spacingHorizontalM,
    textAlign: 'center',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },

  title: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },

  address: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
  },

  addressIcon: {
    display: 'flex',
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
    marginTop: '2px',
  },

  details: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXXS,
  },

  detailLabel: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },

  detailValue: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-word',
  },

  meta: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },

  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
  },

  ratingIcon: {
    color: tokens.colorPaletteMarigoldForeground1,
  },

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  state: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalXS,
    minHeight: '120px',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },

  errorState: {
    color: tokens.colorStatusDangerForeground1,
  },
});
