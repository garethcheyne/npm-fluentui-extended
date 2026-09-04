import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { CheckmarkRegular, CodeRegular, CopyRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { CODE_SAMPLES } from './codeSamples';

const useStyles = makeStyles({
  root: {
    marginTop: tokens.spacingVerticalM,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
  },
  panel: {
    position: 'relative',
  },
  pre: {
    marginTop: '0px',
    marginBottom: '0px',
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground1,
    // Long lines scroll inside the block rather than widening the page.
    overflowX: 'auto',
  },
  copy: {
    position: 'absolute',
    top: tokens.spacingVerticalS,
    right: tokens.spacingHorizontalS,
  },
});

interface CodeExampleProps {
  /** Key into the generated samples — the harness tab id. */
  sampleId: string;
}

/**
 * The usage snippet for a component, collapsed by default.
 *
 * Collapsed because the page's job is to show the component working; the code is
 * the follow-up question, not the first thing to read.
 */
export function CodeExample({ sampleId }: CodeExampleProps) {
  const styles = useStyles();
  const [copied, setCopied] = useState(false);
  const sample = CODE_SAMPLES[sampleId];

  if (!sample) return null;

  const copy = () => {
    void navigator.clipboard?.writeText(sample.code).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => {
        /* clipboard blocked — the code is selectable either way */
      },
    );
  };

  return (
    <div className={styles.root}>
      <Accordion collapsible>
        <AccordionItem value="code">
          <AccordionHeader icon={<CodeRegular />}>Show code &mdash; {sample.title}</AccordionHeader>
          <AccordionPanel>
            <div className={styles.panel}>
              <Tooltip content={copied ? 'Copied' : 'Copy'} relationship="label">
                <Button
                  className={styles.copy}
                  size="small"
                  appearance="subtle"
                  icon={copied ? <CheckmarkRegular /> : <CopyRegular />}
                  onClick={copy}
                />
              </Tooltip>
              <pre className={styles.pre}>{sample.code}</pre>
            </div>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
