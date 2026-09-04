import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { CheckmarkCircleRegular, DismissCircleRegular } from '@fluentui/react-icons';
import { COMPONENT_GUIDANCE } from './ComponentGuidance.data';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  summary: {
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground1,
  },
  columns: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXXL,
  },
  column: {
    flexGrow: 1,
    flexShrink: 1,
    // Wraps to one column when the frame is narrow, rather than squeezing both.
    flexBasis: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  heading: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  useIcon: {
    color: tokens.colorPaletteGreenForeground1,
  },
  insteadIcon: {
    color: tokens.colorNeutralForeground3,
  },
  list: {
    marginTop: '0px',
    marginBottom: '0px',
    paddingLeft: tokens.spacingHorizontalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  item: {
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground2,
  },
});

interface ComponentGuidanceProps {
  /** Harness tab id. */
  componentId: string;
}

/**
 * When to reach for the component on this page, and when to reach for something
 * else. Shown above the examples, because choosing the right component is the
 * decision that comes before learning its props.
 */
export function ComponentGuidanceBlock({ componentId }: ComponentGuidanceProps) {
  const styles = useStyles();
  const guidance = COMPONENT_GUIDANCE[componentId];

  if (!guidance) return null;

  return (
    <div className={styles.root}>
      <Text className={styles.summary}>{guidance.summary}</Text>

      <div className={styles.columns}>
        <div className={styles.column}>
          <span className={styles.heading}>
            <CheckmarkCircleRegular className={styles.useIcon} />
            Use it when
          </span>
          <ul className={styles.list}>
            {guidance.useWhen.map((line) => (
              <li key={line} className={styles.item}>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <span className={styles.heading}>
            <DismissCircleRegular className={styles.insteadIcon} />
            Reach for something else when
          </span>
          <ul className={styles.list}>
            {guidance.insteadWhen.map((line) => (
              <li key={line} className={styles.item}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
