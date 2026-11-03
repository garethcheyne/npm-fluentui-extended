import * as React from 'react';
import { createPortal } from 'react-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { FluentProvider, tokens, webLightTheme } from '@fluentui/react-components';
import { FLUENT_SHELL_VERSION, FluentShell, useShellBleed, useShellSurface } from './FluentShell';
import type { HostSurfaceInfo, ShellDebugApi } from './FluentShell';
import type { FluentShellProps } from './FluentShell.types';

/**
 * FluentShell as a rendered component: what it applies, and what it tells the
 * app below it.
 *
 * The gutters are written onto the root as `--fluentShellPad*` custom
 * properties, which is the one place the resolved numbers are readable without
 * layout — so that is what these assert, along with what `useShellSurface`
 * reports. No pixel geometry: jsdom answers every rectangle with zeros, which
 * is also why no alignment reference is ever usable here and the horizontal
 * gutters always come from the surface target.
 *
 * The shell reads its window from its own element's document. Under vitest that
 * is jsdom's real window, not the `window` global the test sees, so stubs and
 * the debug handle are looked up on `document.defaultView`.
 */

const shellWindow = () => document.defaultView as Window & { __fluentShell?: ShellDebugApi };

beforeEach(() => {
  // The debug overlay also follows a stored flag; keep it out of every test.
  shellWindow().localStorage.removeItem('fluentShellDebug');
});

afterEach(() => {
  vi.restoreAllMocks();
});

function gutters(root: HTMLElement) {
  const read = (side: string) => root.style.getPropertyValue(`--fluentShellPad${side}`);
  return { top: read('Top'), right: read('Right'), bottom: read('Bottom'), left: read('Left') };
}

const allSides = (value: string) => ({ top: value, right: value, bottom: value, left: value });

/** Renders a shell with a child that reports what useShellSurface resolved. */
function renderShell(props: Partial<FluentShellProps> = {}) {
  const seen: { info?: HostSurfaceInfo } = {};
  function Report() {
    seen.info = useShellSurface();
    return <span>The app</span>;
  }
  const result = render(
    <FluentProvider theme={webLightTheme}>
      <FluentShell {...props}>
        <Report />
      </FluentShell>
    </FluentProvider>,
  );
  const root = result.container.querySelector<HTMLElement>('[data-fluent-shell]')!;
  return { ...result, root, seen };
}

/**
 * A shell portalled into a real same-origin iframe named the way Dynamics names a
 * form web resource's frame. The iframe is not React's, so it is still attached
 * while the portal's effects clean up, and is removed afterwards.
 */
function renderFramedShell(props: Partial<FluentShellProps> = {}) {
  const iframe = document.createElement('iframe');
  iframe.id = 'WebResource_pricing';
  document.body.appendChild(iframe);
  const frameDoc = iframe.contentDocument!;

  const seen: { info?: HostSurfaceInfo } = {};
  function Report() {
    seen.info = useShellSurface();
    return null;
  }
  const result = render(
    <>
      {createPortal(
        <FluentShell {...props}>
          <Report />
        </FluentShell>,
        frameDoc.body,
      )}
    </>,
  );
  const root = frameDoc.querySelector<HTMLElement>('[data-fluent-shell]')!;
  const dispose = () => {
    result.unmount();
    iframe.remove();
  };
  return { root, seen, dispose };
}

describe('FluentShell standalone (not framed)', () => {
  it('renders its children inside the shell root, with the caller’s class and style', () => {
    const { root } = renderShell({ className: 'app-shell', style: { minWidth: 320 } });

    expect(root).toContainElement(screen.getByText('The app'));
    expect(root).toHaveClass('app-shell');
    expect(root.style.minWidth).toBe('320px');
  });

  it('falls back to the standalone target in full: 24px a side at desktop width', () => {
    // No host to measure, so the app stands off the window edge roughly the way
    // it will once embedded, rather than sitting flush against it.
    const { root, seen } = renderShell();

    expect(gutters(root)).toEqual(allSides('24px'));
    expect(seen.info).toMatchObject({
      surface: 'standalone',
      density: 'comfortable',
      embedded: false,
      measured: false,
      basis: 'target',
      reason: 'not framed',
    });
  });

  it('re-measures on resize, dropping to the compact 12px below 600px wide', async () => {
    const { root, seen } = renderShell();
    expect(gutters(root).left).toBe('24px');

    vi.spyOn(shellWindow(), 'innerWidth', 'get').mockReturnValue(480);
    act(() => {
      shellWindow().dispatchEvent(new Event('resize'));
    });

    await waitFor(() => expect(gutters(root)).toEqual(allSides('12px')));
    expect(seen.info).toMatchObject({ density: 'compact', width: 480 });
  });

  it('takes padding as an override: a number for every side, an object for the sides it names', () => {
    const { root: uniform, seen: uniformSeen } = renderShell({ padding: 4 });
    expect(gutters(uniform)).toEqual(allSides('4px'));
    // Children see the overridden numbers too, so a bleed cancels what is really applied.
    expect(uniformSeen.info!.spacing).toEqual({ top: 4, right: 4, bottom: 4, left: 4 });

    const { root: partial } = renderShell({ padding: { top: 0 } });
    expect(gutters(partial)).toEqual({ top: '0px', right: '24px', bottom: '24px', left: '24px' });
  });

  it('applies a pinned surface’s rules, and says what it would have detected', () => {
    const { root, seen } = renderShell({ surface: 'dialog' });

    // Dialog chrome pads its own body, so the shell adds nothing.
    expect(gutters(root)).toEqual(allSides('0px'));
    expect(seen.info!.reason).toBe('forced to dialog (would have been standalone)');
  });

  it('paints the neutral page ground and clips by default; neither when told not to', () => {
    // jsdom leaves the `overflow` shorthand unexpanded, so it is read as declared.
    const { root } = renderShell();
    expect(getComputedStyle(root).backgroundColor).toBe(tokens.colorNeutralBackground2);
    expect(getComputedStyle(root).overflow).toBe('hidden');

    const { root: plain } = renderShell({ background: false, overflow: 'scroll' });
    expect(getComputedStyle(plain).backgroundColor).not.toBe(tokens.colorNeutralBackground2);
    expect(getComputedStyle(plain).overflowY).toBe('auto');
    expect(getComputedStyle(plain).overflowX).toBe('hidden');
  });
});

describe('what FluentShell gives the app below it', () => {
  it('offers negative margins that cancel the gutters, left and right by default', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FluentShell padding={{ top: 6, right: 20, bottom: 6, left: 8 }}>{children}</FluentShell>
    );

    const { result: sides } = renderHook(() => useShellBleed(), { wrapper });
    expect(sides.current).toEqual({ marginLeft: -8, marginRight: -20 });

    const { result: top } = renderHook(() => useShellBleed(['top']), { wrapper });
    expect(top.current).toEqual({ marginTop: -6 });
  });

  it('refuses to answer useShellSurface outside a shell rather than guess', () => {
    // The throw is the behaviour under test; keep React's and jsdom's reports of it quiet.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const swallow = (event: Event) => event.preventDefault();
    shellWindow().addEventListener('error', swallow);

    try {
      expect(() => renderHook(() => useShellSurface())).toThrow(
        'useShellSurface must be used inside a <FluentShell>.',
      );
    } finally {
      shellWindow().removeEventListener('error', swallow);
    }
  });

  it('installs the console handle while mounted, and its overlays switch on without a reload', () => {
    const { unmount } = renderShell();
    const api = shellWindow().__fluentShell!;
    expect(api.version).toBe(FLUENT_SHELL_VERSION);
    expect(screen.queryByText(`FluentShell v${FLUENT_SHELL_VERSION}`)).not.toBeInTheDocument();

    act(() => api.containers(true));
    expect(screen.getByText(`FluentShell v${FLUENT_SHELL_VERSION}`)).toBeInTheDocument();

    act(() => api.reset());
    expect(screen.queryByText(`FluentShell v${FLUENT_SHELL_VERSION}`)).not.toBeInTheDocument();

    // A handle left behind would point a later mount's console at a dead shell.
    unmount();
    expect(shellWindow().__fluentShell).toBeUndefined();
  });
});

describe('FluentShell in a form web resource frame', () => {
  it('detects the form surface from the frame id and applies its target', async () => {
    const { root, seen, dispose } = renderFramedShell();
    try {
      await waitFor(() => expect(seen.info?.surface).toBe('form'));
      expect(seen.info).toMatchObject({
        embedded: true,
        measured: true,
        reason: 'frame id WebResource_pricing',
      });
      // Nothing above the frame pads it here, so the comfortable form target lands in full.
      expect(gutters(root)).toEqual(allSides('12px'));
    } finally {
      dispose();
    }
  });

  it('logs the debug report for the frame it measured, not the window its code runs in', async () => {
    // Regression: the report was taken against the global window, not the frame the shell
    // measured, so a shell in a frame logged 'standalone' while its badge said 'form'.
    const group = vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { seen, dispose } = renderFramedShell({ debug: true });
    try {
      await waitFor(() => expect(seen.info?.surface).toBe('form'));

      const headings = group.mock.calls.map((call) => String(call[0]));
      expect(headings[headings.length - 1]).toContain('form/comfortable');
    } finally {
      dispose();
    }
  });
});
