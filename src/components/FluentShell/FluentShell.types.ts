import type * as React from 'react';

/** The kind of host chrome the web resource is sitting inside. */
export type HostSurface = 'form' | 'fullPage' | 'sidePane' | 'dialog' | 'standalone';

/** Viewport-driven spacing step. The iframe's own width decides this, not the app window's. */
export type ShellDensity = 'compact' | 'comfortable';

/**
 * How the horizontal gutters are decided.
 *
 * `auto` lines the app up with the standard form column when that column can be
 * found, and falls back to the surface target when it cannot. `align` and
 * `target` pin one of the two.
 */
export type SpacingStrategy = 'auto' | 'align' | 'target';

/** A set of edge values in CSS pixels. */
export interface ShellSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Where a resolved gutter came from, so the report can explain itself. */
export type SpacingBasis = 'alignment' | 'target';

/** Why the ancestor walk stopped — `cap` is the only one that means the reading is incomplete. */
export type ChainStop = 'clip' | 'body' | 'root' | 'cap';

export interface FluentShellProps {
  children?: React.ReactNode;
  /**
   * Pin the surface instead of detecting it. Use when the web resource is only
   * ever deployed one way, or when the host is cross-origin and the guess is wrong.
   */
  surface?: HostSurface;
  /**
   * How the horizontal gutters are decided: `auto` (default) lines up with the
   * standard form column when it can be found, `align` insists on it, `target`
   * ignores it and uses the surface rules.
   */
  strategy?: SpacingStrategy;
  /**
   * Override the resolved gutters outright, skipping the target, the host
   * measurement and the alignment. A number sets all four sides; an object
   * overrides only the sides it names — the escape hatch for a host whose
   * correct gutters have been established by hand.
   */
  padding?: number | Partial<ShellSpacing>;
  /** Paint the neutral page background. Turn off to inherit the host's. */
  background?: boolean;
  /** `clip` (default) leaves scrolling to children; `scroll` scrolls the shell itself. */
  overflow?: 'clip' | 'scroll';
  /**
   * Draw thin red guides: a solid line on the iframe's own edge and a dashed one
   * on the shell's content edge, plus a version tag, so the gutter between them
   * is visible at a glance. Independent of `debug`, which also tints the gutters
   * and logs the report.
   *
   * Off by default — it is a measuring instrument, not a design element. Switch
   * it on for a session with `__fluentShell.containers(true)` from any console,
   * which needs no reload and no rebuild.
   */
  showContainers?: boolean;
  /**
   * Force the debug overlay on or off. Left undefined it follows `shellDebug` in
   * this window's or the host's URL, or the stored flag set by
   * `__fluentShell.debug(true)`.
   */
  debug?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
