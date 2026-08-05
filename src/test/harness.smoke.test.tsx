/**
 * Smoke test for the test harness.
 *
 * `vite build` typechecks and bundles but never executes the module, so it happily
 * ships a page that throws on first render - a hook reading a `const` declared further
 * down the component, for instance, fails only at runtime with a temporal dead zone
 * ReferenceError. This mounts the harness for real and fails if anything throws.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The harness talks to Dynamics on mount; stub it out so the test stays offline
vi.mock('../../testHarness/dynamics-mock', () => ({
  installDynamicsMock: async () => ({ isConfigured: false, isAuthenticated: false }),
  loginToDynamics: async () => ({ isConfigured: false, isAuthenticated: false }),
  isDynamicsAuthenticated: () => false,
  logoutFromDynamics: () => {},
  getDynamicsUser: () => null,
}));

describe('test harness', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // main.tsx mounts into #root at module scope
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    // React reports render-time throws through console.error rather than rethrowing,
    // so failures would otherwise pass silently
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    document.body.innerHTML = '';
  });

  it('mounts without throwing', async () => {
    await import('../../testHarness/main');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.body.textContent).toContain('FluentUI Extended Test Harness');

    const failures = consoleError.mock.calls.filter((call) =>
      call.some((arg) => arg instanceof Error || /ReferenceError|TypeError|Cannot access/.test(String(arg))),
    );
    expect(failures).toEqual([]);
  });
});
