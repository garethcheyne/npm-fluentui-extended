import { Button, Divider, Text } from '@fluentui/react-components';
import { useState } from 'react';
import { useShellSurface } from '../../../src/components/FluentShell';

const edges = (s: { top: number; right: number; bottom: number; left: number }) =>
  `${s.top}·${s.right}·${s.bottom}·${s.left}`;

/**
 * Reads the ambient shell rather than mounting one.
 *
 * The harness already wraps every example in a `FluentShell`, and nesting a
 * second would apply the gutters twice — the compounding this component exists
 * to prevent. The page's `FluentContainer` supplies the card, so this example
 * adds no surface of its own either.
 */
export function FluentShellExamples() {
  const info = useShellSurface();
  const [logged, setLogged] = useState(false);

  const effective = {
    top: info.hostInset.top + info.spacing.top,
    right: info.hostInset.right + info.spacing.right,
    bottom: info.hostInset.bottom + info.spacing.bottom,
    left: info.hostInset.left + info.spacing.left,
  };

  return (
    <>
      <Text weight="semibold" size={400} block>
        What the shell resolved
      </Text>
      <Text block>
        surface <code>{info.surface}</code> / {info.density} &mdash; {info.reason}
      </Text>
      <Text block>
        host gives <code>{info.measured ? edges(info.hostInset) : 'cross-origin'}</code>, shell adds{' '}
        <code>{edges(info.spacing)}</code>, effective <code>{edges(effective)}</code>{' '}
        (top·right·bottom·left)
      </Text>
      <Text block>
        basis <code>{info.basis}</code>
        {info.alignment ? ` — aligned to #${info.alignment.ref}` : ''}
      </Text>
      <Text block>
        These are the same numbers a live model-driven form produces, because the harness reproduces
        its geometry. Nothing here is hard-coded — the shell measured the chrome around this frame.
      </Text>

      <Divider />

      <Text weight="semibold" size={400} block>
        Console tooling
      </Text>
      <Text block>
        <code>__fluentShell</code> is installed on this frame and mirrored onto the host window, so
        it works in the console DevTools already has open.
      </Text>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button size="small" onClick={() => window.__fluentShell?.containers(true)}>
          Show edge guides
        </Button>
        <Button size="small" onClick={() => window.__fluentShell?.containers(false)}>
          Hide guides
        </Button>
        <Button
          size="small"
          onClick={() => {
            window.__fluentShell?.report();
            setLogged(true);
          }}
        >
          Log report
        </Button>
        <Button size="small" onClick={() => window.__fluentShell?.apply({ left: 40, right: 40 })}>
          Try 40px gutters
        </Button>
      </div>
      {logged && <Text block>Report written to the console.</Text>}
    </>
  );
}
