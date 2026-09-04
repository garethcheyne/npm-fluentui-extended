import { Divider, Text } from '@fluentui/react-components';
import { HARNESS_GEOMETRY } from '../../../src/components/D365TestHarness';
import { useShellSurface } from '../../../src/components/FluentShell';

/**
 * Documents the harness from inside it.
 *
 * Mounting a second `D365TestHarness` here would nest a form inside a form and
 * demonstrate nothing useful, so this page reports on the one already wrapping
 * it — including the numbers a component measures through it.
 */
export function D365TestHarnessExamples() {
  const info = useShellSurface();

  return (
    <>
      <Text weight="semibold" size={400} block>
        You are looking at it
      </Text>
      <Text block>
        This whole page is inside a <code>D365TestHarness</code>: the top bar, the sitemap on the
        left, the record header above, and a genuine same-origin iframe holding the content. Every
        example in this harness renders through it.
      </Text>

      <Text block>
        The iframe matters more than the decoration. A web resource in the org is an iframe inside a
        particular arrangement of chrome, and components that measure that chrome have nothing to
        measure on a bare dev server — they fall back to standalone behaviour, and the layout being
        developed is not the layout that ships.
      </Text>

      <Divider />

      <Text weight="semibold" size={400} block>
        Reproduced geometry
      </Text>
      <Text block>
        These are the measurements a live model-driven form produces. They are what make local
        development predict production, and are exported as <code>HARNESS_GEOMETRY</code>:
      </Text>
      <Text block>
        wrapper padding above and below the frame:{' '}
        <code>{HARNESS_GEOMETRY.frameWrapperPaddingY}</code>
      </Text>
      <Text block>
        header card inset from the frame&apos;s left edge:{' '}
        <code>{HARNESS_GEOMETRY.headerInsetLeft}</code>, from its right:{' '}
        <code>{HARNESS_GEOMETRY.headerInsetRight}</code>
      </Text>

      <Divider />

      <Text weight="semibold" size={400} block>
        What a component measures through it
      </Text>
      <Text block>
        <code>FluentShell</code>, running in this frame, reports surface <code>{info.surface}</code>{' '}
        via <code>{info.reason}</code>, a host inset of{' '}
        <code>
          {info.hostInset.top}·{info.hostInset.right}·{info.hostInset.bottom}·{info.hostInset.left}
        </code>
        , and alignment to <code>{info.alignment ? `#${info.alignment.ref}` : 'nothing'}</code>.
        Those match a live org exactly, which is the whole claim the harness makes.
      </Text>

      <Text block>
        Outside a local host the harness renders its children alone, so the same tree ships to
        Dynamics without being unwrapped.
      </Text>
    </>
  );
}
