import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { D365TestHarness } from './D365TestHarness';
import { HARNESS_GEOMETRY } from './D365TestHarness.styles';
import { FluentShell, useShellSurface } from '../FluentShell';
import type { HostSurfaceInfo } from '../FluentShell';

/**
 * When the harness steps in, what it draws, and that the app ends up somewhere
 * FluentShell recognises as a form.
 *
 * The harness decides by hostname, so the host is changed with jsdom's own
 * `reconfigure` rather than by stubbing `location`, which jsdom does not allow
 * to be redefined. Every test is put back on the default `localhost`.
 *
 * Nothing here checks how the chrome looks — the geometry that matters is in
 * `HARNESS_GEOMETRY`, and the one measurement worth pinning is the one
 * FluentShell takes from it.
 */

type JsdomHandle = { reconfigure(options: { url: string }): void };
const jsdom = (globalThis as unknown as { jsdom: JsdomHandle }).jsdom;
const atUrl = (url: string) => jsdom.reconfigure({ url });

const frame = () => document.getElementById('WebResource_harness') as HTMLIFrameElement | null;

/**
 * Unmounting removes the iframe before React runs the effect cleanups of what
 * was portalled into it. A browser's Window keeps its `document` after its frame
 * is removed; jsdom instead calls `close()` on it, which deletes the document
 * (its own source calls this "not really correct behavior"), and Fluent's
 * focus-visible cleanup then reads `undefined.removeEventListener`. Skipping that
 * one call leaves the frame window as a browser would, so teardown is not
 * mistaken for a failure of the harness.
 */
afterEach(() => {
  const win = frame()?.contentWindow;
  if (win) win.close = () => {};
  cleanup();
  atUrl('http://localhost:3000/');
});

/** The hosted frame's document, once the harness has portalled into it. */
async function frameBody(): Promise<HTMLElement> {
  return waitFor(() => {
    const body = frame()?.contentDocument?.body;
    expect(body?.childElementCount).toBeGreaterThan(0);
    return body!;
  });
}

describe('D365TestHarness off a local host', () => {
  it('renders the app alone, with no frame and no chrome', () => {
    // The same tree ships to the org; there the harness must be a no-op.
    atUrl('https://contoso.crm.dynamics.com/main.aspx');

    render(
      <D365TestHarness recordName="Boomer iMAC">
        <span>The app</span>
      </D365TestHarness>,
    );

    expect(screen.getByText('The app')).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.queryByText('Boomer iMAC')).not.toBeInTheDocument();
    expect(screen.queryByText('TEST HARNESS')).not.toBeInTheDocument();
  });

  it('can be forced on with active, for a component gallery', async () => {
    atUrl('https://contoso.crm.dynamics.com/main.aspx');

    render(
      <D365TestHarness active>
        <span>The app</span>
      </D365TestHarness>,
    );

    expect(frame()).not.toBeNull();
    expect(within(await frameBody()).getByText('The app')).toBeInTheDocument();
  });
});

describe('D365TestHarness on a local host', () => {
  it.each([
    'http://localhost:5173/',
    'http://127.0.0.1:8080/',
    'http://devbox.local/',
    'http://app.localhost/',
    'file:///C:/app/index.html',
  ])('activates at %s', (url) => {
    atUrl(url);

    render(<D365TestHarness>App</D365TestHarness>);

    expect(frame()).not.toBeNull();
  });

  it('steps aside when active is false, for a local test of the bare app', () => {
    render(
      <D365TestHarness active={false}>
        <span>The app</span>
      </D365TestHarness>,
    );

    expect(screen.getByText('The app')).toBeInTheDocument();
    expect(frame()).toBeNull();
  });

  it('draws the form header from recordName and entityName', () => {
    render(<D365TestHarness recordName="Boomer iMAC" entityName="Price List" />);

    expect(screen.getByText('Boomer iMAC')).toBeInTheDocument();
    expect(screen.getByText('Price List')).toBeInTheDocument();
    expect(screen.getByText('- Saved')).toBeInTheDocument();
    expect(screen.getByText('TEST HARNESS')).toBeInTheDocument();
  });

  it('draws the tabs with the first selected, and drops the saved flag when unsaved', () => {
    render(<D365TestHarness tabs={['Summary', 'Details', 'Related']} saved={false} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Summary', 'Details', 'Related']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(screen.queryByText('- Saved')).not.toBeInTheDocument();
  });

  it('hosts the app in a WebResource_ iframe rather than in the page', async () => {
    // The frame id is what makes FluentShell detect a form-hosted control.
    const onFrameReady = vi.fn();

    render(
      <D365TestHarness onFrameReady={onFrameReady}>
        <span>The app</span>
      </D365TestHarness>,
    );

    const body = await frameBody();
    expect(within(body).getByText('The app')).toBeInTheDocument();
    expect(screen.queryByText('The app')).not.toBeInTheDocument();
    expect(frame()).toHaveAttribute('title', 'Web resource');
    expect(onFrameReady).toHaveBeenCalledWith(frame()!.contentDocument);
    // Primed the way a web resource's own index.html would be.
    expect(body.style.margin).toBe('0px');
    expect(body.style.overflow).toBe('hidden');
  });

  it('renders sitemap entries with onClick as buttons, and the rest as inert text', () => {
    const onClick = vi.fn();

    render(
      <D365TestHarness
        navGroups={[
          {
            label: 'Components',
            items: [
              { label: 'Lookup', onClick, selected: true },
              { label: 'DataGrid' },
            ],
          },
        ]}
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Site map' });
    expect(within(nav).getByText('Components')).toBeInTheDocument();
    const lookup = within(nav).getByRole('button', { name: 'Lookup' });
    expect(lookup).toHaveAttribute('aria-current', 'page');
    fireEvent.click(lookup);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(within(nav).queryByRole('button', { name: 'DataGrid' })).not.toBeInTheDocument();
    expect(within(nav).getByText('DataGrid')).toBeInTheDocument();
  });

  it('hides the sitemap with hideNav and shows a notification strip when given one', () => {
    render(<D365TestHarness hideNav notification="Read-only: record is inactive" />);

    expect(screen.queryByRole('navigation', { name: 'Site map' })).not.toBeInTheDocument();
    expect(screen.getByText('Read-only: record is inactive')).toBeInTheDocument();
  });

  it('gives a FluentShell inside it the form surface and the wrapper’s measured inset', async () => {
    // The reason the harness exists: without it a shell on a dev server falls
    // back to standalone, and the layout being developed is not the one that ships.
    let seen: HostSurfaceInfo | undefined;
    function Report() {
      seen = useShellSurface();
      return null;
    }

    render(
      <D365TestHarness>
        <FluentShell>
          <Report />
        </FluentShell>
      </D365TestHarness>,
    );

    await waitFor(() => expect(seen?.surface).toBe('form'));
    expect(seen!.reason).toBe('frame id WebResource_harness');
    expect(seen!.embedded).toBe(true);
    expect(seen!.measured).toBe(true);
    const wrapperPadding = parseFloat(HARNESS_GEOMETRY.frameWrapperPaddingY);
    expect(seen!.hostInset.top).toBe(wrapperPadding);
    expect(seen!.hostInset.bottom).toBe(wrapperPadding);
  });
});
