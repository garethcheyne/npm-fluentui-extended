import type * as React from 'react';
import type { Theme } from '@fluentui/react-components';

/** One entry in the simulated sitemap. */
export interface D365NavItem {
  label: string;
  /** Defaults to a generic glyph. Any Fluent icon element works. */
  icon?: React.ReactNode;
  /** Renders in the selected state. At most one item should set it. */
  selected?: boolean;
  /** Makes the entry activatable. Rendered as a button when supplied. */
  onClick?: () => void;
}

/** A titled group of sitemap entries. Omit `label` for the ungrouped top items. */
export interface D365NavGroup {
  label?: string;
  items: D365NavItem[];
}

export interface D365TestHarnessProps {
  /** The web resource under development. Hosted in a real iframe when active. */
  children?: React.ReactNode;
  /**
   * Render the simulated chrome. Defaults to detecting a local development host,
   * so the same tree can ship to Dynamics untouched — in the org the harness
   * steps aside and renders `children` alone.
   */
  active?: boolean;

  // ─── Record header ────────────────────────────────────────────────────────
  /** Record title in the form header. */
  recordName?: string;
  /** Entity display name, the line under the title. */
  entityName?: string;
  /** Shows the "- Saved" flag beside the title. */
  saved?: boolean;
  /** Tab labels. The first is rendered as selected. */
  tabs?: string[];
  /** Command labels in the header. Decorative — the harness does not wire them. */
  commands?: string[];
  /** Status field at the right of the header, as `[value, label]`. */
  status?: [value: string, label: string];

  // ─── App chrome ───────────────────────────────────────────────────────────
  /** Organisation branding in the top bar. */
  orgName?: string;
  /** App name, as a model-driven app shows it beside the product name. */
  appName?: string;
  /** Initials in the top-right avatar. */
  userInitials?: string;
  /** Optional notification strip under the top bar. */
  notification?: React.ReactNode;
  /**
   * Sitemap groups in the left nav. Defaults to a representative
   * Sales-app sitemap; pass your own to mirror the app being built.
   */
  navGroups?: D365NavGroup[];
  /** Hide the left nav, for testing a wider content area. */
  hideNav?: boolean;

  // ─── Frame ────────────────────────────────────────────────────────────────
  /** Theme applied inside the hosted frame. Defaults to `webLightTheme`. */
  theme?: Theme;
  /**
   * Called with the hosted frame's document once it is ready, for tests that
   * need to reach inside it.
   */
  onFrameReady?: (doc: Document) => void;
}
