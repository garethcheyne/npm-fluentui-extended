/**
 * Isolated capture surface.
 *
 * `?shot=<id>` renders one populated component and nothing else - no header, no tabs,
 * no sibling examples - so a screenshot of `#shot-frame` is already a tight crop of
 * the component. `?shot=index` lists everything available.
 */

import * as React from 'react';
import { FluentProvider, Text, webLightTheme } from '@fluentui/react-components';
import { SHOTS, findShot } from './registry';
import { installShotApi } from './mockApi';

/** Marks the capture target. Screenshot tools should shoot this element. */
export const SHOT_FRAME_ID = 'shot-frame';

/** Set once the shot has settled, so a capture script can wait on it. */
export const SHOT_READY_ATTR = 'data-shot-ready';

/**
 * Publish hover targets so the capture script can read them without importing TSX.
 * The index page is already its source of truth for which shots exist.
 */
const publishHoverMeta = () => {
  (window as unknown as Record<string, unknown>).__SHOT_HOVER__ = Object.fromEntries(
    SHOTS.filter((shot) => shot.hoverSelector).map((shot) => [
      shot.id,
      { selector: shot.hoverSelector, settleMs: shot.hoverSettleMs },
    ]),
  );
};

const ShotIndex: React.FC = () => (
  <div style={{ padding: 32, fontFamily: 'Segoe UI, sans-serif' }}>
    <h1 style={{ marginTop: 0 }}>Documentation captures</h1>
    <p style={{ color: '#666' }}>
      Each link renders one populated component in isolation. Capture the
      <code style={{ margin: '0 4px' }}>#{SHOT_FRAME_ID}</code>
      element for a tight crop.
    </p>
    <ul style={{ lineHeight: 1.9 }}>
      {SHOTS.map((shot) => (
        <li key={shot.id}>
          <a href={`?shot=${shot.id}`}>{shot.label}</a>
          <code style={{ marginLeft: 8, color: '#888' }}>?shot={shot.id}</code>
        </li>
      ))}
    </ul>
  </div>
);

export const Shot: React.FC<{ id: string }> = ({ id }) => {
  const shot = findShot(id);
  const [ready, setReady] = React.useState(false);

  // Fixtures must be installed before the component mounts and fires its first request
  React.useMemo(() => {
    installShotApi();
    publishHoverMeta();
  }, []);

  React.useEffect(() => {
    if (!shot) return;
    // Two frames plus a beat lets data land, fonts settle and overlays position
    const timer = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(timer);
  }, [shot]);

  if (id === 'index' || !shot) {
    return (
      <FluentProvider theme={webLightTheme}>
        {!shot && id !== 'index' && (
          <div style={{ padding: 32 }}>
            <Text weight="semibold">Unknown shot &ldquo;{id}&rdquo;</Text>
          </div>
        )}
        <ShotIndex />
      </FluentProvider>
    );
  }

  return (
    <FluentProvider theme={webLightTheme}>
      <div
        style={{
          minHeight: '100vh',
          // Neutral surround so the frame's edges are unambiguous in a full-page capture
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: 40,
          boxSizing: 'border-box',
        }}
      >
        <div
          id={SHOT_FRAME_ID}
          {...{ [SHOT_READY_ATTR]: ready ? 'true' : 'false' }}
          style={{
            width: shot.width,
            background: '#fff',
            borderRadius: 8,
            padding: 24,
            // Room for a dropdown or card that renders below the control
            paddingBottom: 24 + (shot.overlayHeight ?? 0),
            boxSizing: 'border-box',
          }}
        >
          {shot.render()}
        </div>
      </div>
    </FluentProvider>
  );
};
