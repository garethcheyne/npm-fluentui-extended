import { Text } from '@fluentui/react-components';
import { FluentContainer } from '../../../src/components/FluentContainer';

const filler = Array.from({ length: 24 }, (_, i) => `Scrollable row ${i + 1}`);

export function FluentContainerExamples() {
  return (
    <>
      <FluentContainer as="section">
        <Text weight="semibold" size={400} block>
          Default
        </Text>
        <Text block>
          The surface D365 draws on a model-driven form: <code>shadow4</code>, an 8px radius, and a
          transparent 1px border. The border is reserved but unpainted, exactly as the standard form
          header does it — the shadow defines the edge, and a visible hairline reads as foreign
          beside real D365 cards.
        </Text>
      </FluentContainer>

      <FluentContainer as="section" padding="compact">
        <Text weight="semibold" block>
          padding=&quot;compact&quot;
        </Text>
        <Text block>Tighter inner spacing, for dense content.</Text>
      </FluentContainer>

      <FluentContainer as="section" flat>
        <Text weight="semibold" block>
          flat
        </Text>
        <Text block>
          No shadow. For a card nested inside another, where a second elevation reads as clutter.
        </Text>
      </FluentContainer>

      <FluentContainer as="section">
        <Text weight="semibold" block>
          Nested
        </Text>
        <FluentContainer flat padding="compact" style={{ marginTop: 8 }}>
          <Text block>A flat container inside an elevated one.</Text>
        </FluentContainer>
      </FluentContainer>

      {/*
        Bounded by `maxHeight` rather than `fill`. In a scrolling page `fill` has
        no height to fill, so it would grow and demonstrate nothing — use `fill`
        where the parent column is height-constrained, as a form body is.
      */}
      <FluentContainer scrolls="vertical" padding="compact" style={{ maxHeight: 220 }}>
        <Text weight="semibold" block>
          scrolls=&quot;vertical&quot;
        </Text>
        <Text block>
          Fills the remaining height and owns its scroll region. Clipping is opt-in precisely because
          a container that clips at a nested card&apos;s bounds erases that card&apos;s shadow — the
          bug reads as &quot;looks slightly flat&quot;, which is hard to spot. In development the
          component warns when its nearest clipping ancestor is too tight.
        </Text>
        {filler.map((row) => (
          <Text key={row} block>
            {row}
          </Text>
        ))}
      </FluentContainer>
    </>
  );
}
