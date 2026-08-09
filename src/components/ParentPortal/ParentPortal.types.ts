import type { ReactNode } from 'react';

export interface ParentPortalProps {
  /** Content to render in the parent document. */
  children: ReactNode;
  /**
   * ID for the container element created in the parent document.
   * Defaults to 'fluentui-extended-parent-portal-root'.
   */
  containerId?: string;
  /**
   * When true, syncs Griffel stylesheets from the iframe to the parent
   * document so Fluent components render with full styling.
   * Defaults to true.
   */
  syncStyles?: boolean;
  /**
   * When true, copies Fluent CSS custom properties (theme tokens) from the
   * iframe's FluentProvider to the parent container.
   * Defaults to true.
   */
  syncTokens?: boolean;
  /**
   * Interval (ms) for re-syncing CSSOM rules that Griffel inserts via
   * insertRule(). Set to 0 to disable periodic sync (only MutationObserver).
   * Defaults to 300.
   */
  syncInterval?: number;
  /**
   * Additional CSS injected into the parent document's <head> for the
   * portal container. Overrides default positioning styles.
   */
  containerStyles?: string;
}
