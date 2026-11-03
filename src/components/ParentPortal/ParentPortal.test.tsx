import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { ParentPortal, useParentPortalMount } from './ParentPortal';

/**
 * Where ParentPortal puts its children, and what it leaves behind.
 *
 * The portal decides everything from `window.parent`, so being framed is
 * simulated by pointing that at the window of a real same-origin iframe: a
 * genuine second document, with its own `defaultView`, that the portal can
 * create elements and dispatch events in. Which way round the two documents are
 * nested does not matter to the component — it only ever reads
 * `window.parent.document`.
 *
 * Pinned: in place when not framed or when the parent is unreadable, into the
 * parent document when it is readable, under the container id asked for, with
 * the iframe's styles mirrored across and taken back on unmount.
 */

const DEFAULT_ID = 'fluentui-extended-parent-portal-root';
const ownParent = Object.getOwnPropertyDescriptor(window, 'parent')!;

/** Makes this window look framed by a same-origin host, and returns the host's document. */
function frameUnderHost(): Document {
  const hostFrame = document.createElement('iframe');
  document.body.appendChild(hostFrame);
  const hostWindow = hostFrame.contentWindow!;
  Object.defineProperty(window, 'parent', { configurable: true, get: () => hostWindow });
  return hostFrame.contentDocument!;
}

/** A parent that exists but cannot be read, the way a cross-origin host behaves. */
function frameUnderCrossOriginHost(): void {
  const crossOrigin = {
    get document(): Document {
      throw new DOMException('Blocked a frame from accessing a cross-origin frame.', 'SecurityError');
    },
  };
  Object.defineProperty(window, 'parent', { configurable: true, get: () => crossOrigin });
}

afterEach(() => {
  Object.defineProperty(window, 'parent', ownParent);
  document.body.innerHTML = '';
});

describe('ParentPortal when not framed', () => {
  it('renders its children in place, and the hook gives no mount node', () => {
    render(
      <div data-testid="here">
        <ParentPortal>
          <span>Dialog body</span>
        </ParentPortal>
      </div>,
    );

    expect(screen.getByTestId('here')).toContainElement(screen.getByText('Dialog body'));
    expect(document.getElementById(DEFAULT_ID)).toBeNull();

    // And the hook gives no mount node, so a Fluent mountNode keeps its default.
    const { result } = renderHook(() => useParentPortalMount());
    expect(result.current).toBeUndefined();
  });
});

describe('ParentPortal when framed by a same-origin host', () => {
  it('renders its children into the host document, not in place', async () => {
    const hostDoc = frameUnderHost();

    render(
      <div data-testid="here">
        <ParentPortal>
          <span>Dialog body</span>
        </ParentPortal>
      </div>,
    );

    const container = await waitFor(() => {
      const el = hostDoc.getElementById(DEFAULT_ID);
      expect(el).not.toBeNull();
      return el!;
    });
    expect(container.textContent).toBe('Dialog body');
    expect(screen.getByTestId('here')).toBeEmptyDOMElement();
  });

  it('creates the container under the id it was given, with rules scoped to it', async () => {
    const hostDoc = frameUnderHost();

    render(
      <ParentPortal containerId="my-overlay">
        <span>Dialog body</span>
      </ParentPortal>,
    );

    await waitFor(() => expect(hostDoc.getElementById('my-overlay')).not.toBeNull());
    expect(hostDoc.getElementById(DEFAULT_ID)).toBeNull();
    expect(hostDoc.body).toContainElement(hostDoc.getElementById('my-overlay'));
    // The default rules are scoped to that id, so two portals cannot restyle each other.
    expect(hostDoc.getElementById('my-overlay-styles')!.textContent).toContain('#my-overlay {');

    // containerStyles replaces those rules outright.
    render(
      <ParentPortal containerId="custom-overlay" containerStyles="#custom-overlay { z-index: 5; }">
        <span>Other body</span>
      </ParentPortal>,
    );
    await waitFor(() => expect(hostDoc.getElementById('custom-overlay-styles')).not.toBeNull());
    expect(hostDoc.getElementById('custom-overlay-styles')!.textContent).toBe(
      '#custom-overlay { z-index: 5; }',
    );
  });

  it('reuses a container already in the host rather than adding a second', async () => {
    const hostDoc = frameUnderHost();
    const existing = hostDoc.createElement('div');
    existing.id = DEFAULT_ID;
    hostDoc.body.appendChild(existing);

    render(
      <ParentPortal>
        <span>Dialog body</span>
      </ParentPortal>,
    );

    await waitFor(() => expect(existing.textContent).toBe('Dialog body'));
    expect(hostDoc.querySelectorAll(`#${DEFAULT_ID}`)).toHaveLength(1);
  });

  it('hands useParentPortalMount callers the host container as a mount node', async () => {
    const hostDoc = frameUnderHost();

    const { result } = renderHook(() => useParentPortalMount({ containerId: 'dialog-root' }));

    await waitFor(() => expect(result.current).toBe(hostDoc.getElementById('dialog-root')));
  });

  it('delivers clicks on portalled content to its React handlers', async () => {
    // The content lives in another document; the point of the portal is lost if
    // a button rendered there can be seen but not used.
    const hostDoc = frameUnderHost();
    const onClick = vi.fn();

    render(
      <ParentPortal>
        <button type="button" onClick={onClick}>
          Confirm
        </button>
      </ParentPortal>,
    );

    const button = await waitFor(() => {
      const el = hostDoc.querySelector('button');
      expect(el).not.toBeNull();
      return el!;
    });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('mirrors the iframe’s stylesheets into the host, and takes them back on unmount', async () => {
    const hostDoc = frameUnderHost();
    const own = document.createElement('style');
    own.setAttribute('data-test-sheet', 'own');
    own.textContent = '.probe-rule { color: red; }';
    document.head.appendChild(own);

    const { unmount } = render(
      <ParentPortal containerId="mirror-root">
        <span>Dialog body</span>
      </ParentPortal>,
    );

    const mirrors = () =>
      Array.from(hostDoc.head.querySelectorAll('style[data-fluent-parent-portal="mirror-root"]'));
    await waitFor(() =>
      expect(mirrors().some((m) => m.textContent!.includes('.probe-rule'))).toBe(true),
    );
    // The source sheet's own data- attributes travel with it, so it stays identifiable.
    expect(mirrors().some((m) => m.getAttribute('data-test-sheet') === 'own')).toBe(true);

    unmount();

    expect(mirrors()).toHaveLength(0);
    // The last portal out takes its container with it
    expect(hostDoc.getElementById('mirror-root')).toBeNull();
    own.remove();
  });

  it('picks up rules inserted after mount on its sync interval', async () => {
    // Griffel adds rules with insertRule, which changes the sheet but not the
    // DOM, so the observer alone would never see them; the interval does.
    const hostDoc = frameUnderHost();
    const own = document.createElement('style');
    own.textContent = '.first-rule { color: red; }';
    document.head.appendChild(own);

    render(
      <ParentPortal containerId="late-root" syncInterval={10}>
        <span>Dialog body</span>
      </ParentPortal>,
    );
    await waitFor(() => expect(hostDoc.head.textContent).toContain('.first-rule'));

    own.sheet!.insertRule('.late-rule { color: blue; }', 1);

    await waitFor(() => expect(hostDoc.head.textContent).toContain('.late-rule'));
    own.remove();
  });

  it('carries the app’s Fluent tokens onto the container, and copies nothing when sync is off', async () => {
    const hostDoc = frameUnderHost();

    render(
      <FluentProvider theme={webLightTheme}>
        <ParentPortal containerId="token-root" syncStyles={false}>
          <span>Synced</span>
        </ParentPortal>
        <ParentPortal containerId="bare-root" syncStyles={false} syncTokens={false}>
          <span>Bare</span>
        </ParentPortal>
      </FluentProvider>,
    );

    await waitFor(() => expect(hostDoc.getElementById('bare-root')!.textContent).toBe('Bare'));
    expect(hostDoc.getElementById('token-root')!.style.getPropertyValue('--colorNeutralBackground1')).toBe(
      webLightTheme.colorNeutralBackground1,
    );
    expect(hostDoc.getElementById('bare-root')!.getAttribute('style')).toBeNull();
    expect(hostDoc.querySelectorAll('style[data-fluent-parent-portal]')).toHaveLength(0);
  });

  it('removes the container and its style element once its only portal unmounts', async () => {
    // Regression: the container - a fixed, full-window layer at z-index 100000 - and its
    // stylesheet were left in the host page after the last portal using them unmounted.
    const hostDoc = frameUnderHost();

    const { unmount } = render(
      <ParentPortal containerId="leak-root">
        <span>Dialog body</span>
      </ParentPortal>,
    );
    await waitFor(() => expect(hostDoc.getElementById('leak-root')).not.toBeNull());

    unmount();

    expect(hostDoc.getElementById('leak-root')).toBeNull();
    expect(hostDoc.getElementById('leak-root-styles')).toBeNull();
  });

  it('drops a mirrored stylesheet when the iframe removes the original', async () => {
    // Regression: mirrors were only added and updated, so a removed sheet's rules kept
    // applying in the host until the portal unmounted.
    const hostDoc = frameUnderHost();
    const own = document.createElement('style');
    own.textContent = '.gone-rule { color: red; }';
    document.head.appendChild(own);

    render(
      <ParentPortal containerId="stale-root">
        <span>Dialog body</span>
      </ParentPortal>,
    );
    await waitFor(() => expect(hostDoc.head.textContent).toContain('.gone-rule'));

    own.remove();

    await waitFor(() => expect(hostDoc.head.textContent).not.toContain('.gone-rule'));
  });

  it('renders portalled content in the app’s theme, not always light', async () => {
    // Regression: the portal's own provider was fixed to webLightTheme, shadowing the
    // app's theme - a dark app's dialog came out light in the host page.
    const hostDoc = frameUnderHost();

    render(
      <FluentProvider theme={webDarkTheme}>
        <ParentPortal containerId="theme-root" syncInterval={10}>
          <span data-testid="themed">Dialog body</span>
        </ParentPortal>
      </FluentProvider>,
    );

    const resolved = await waitFor(() => {
      const el = hostDoc.querySelector<HTMLElement>('[data-testid="themed"]')!;
      const provider = el.closest<HTMLElement>('.fui-FluentProvider')!;
      const value = hostDoc.defaultView!.getComputedStyle(provider).getPropertyValue('--colorNeutralBackground1');
      expect(value).not.toBe('');
      return value;
    });
    expect(resolved).toBe(webDarkTheme.colorNeutralBackground1);
  });
});

describe('ParentPortal when the parent cannot be read', () => {
  it('falls back to rendering in place instead of throwing', async () => {
    frameUnderCrossOriginHost();

    render(
      <div data-testid="here">
        <ParentPortal>
          <span>Dialog body</span>
        </ParentPortal>
      </div>,
    );

    expect(screen.getByTestId('here')).toContainElement(screen.getByText('Dialog body'));
    const { result } = renderHook(() => useParentPortalMount());
    expect(result.current).toBeUndefined();
  });
});
