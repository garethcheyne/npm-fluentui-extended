import type * as React from 'react';

/** Visual weight of a command. Mirrors the Fluent Button appearances the bar uses. */
export type CommandBarItemAppearance = 'primary' | 'subtle' | 'transparent';

export interface CommandBarItem {
  /** Unique key - also used as the overflow menu item key */
  key: string;
  /** Button label. Optional for icon-only commands, but then supply `title`. */
  text?: string;
  /**
   * Icon rendered before the label. Typed as an element rather than ReactNode
   * because Fluent's icon slot does not accept the boolean arm of ReactNode.
   */
  icon?: React.ReactElement;
  /** Tooltip / accessible name. Required in practice for icon-only commands. */
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
  appearance?: CommandBarItemAppearance;
  /** Renders a checked toggle state */
  checked?: boolean;
  /** Nested commands - rendered as a menu button, and as a submenu when overflowed */
  subItems?: CommandBarItem[];
  /**
   * Keep this command out of the overflow menu. Use sparingly: a pinned command
   * that does not fit will be clipped rather than moved.
   */
  pinned?: boolean;
  /** Draw a divider before this item */
  dividerBefore?: boolean;
}

export interface CommandBarProps {
  /** Commands rendered from the left */
  items: CommandBarItem[];
  /** Commands rendered right-aligned, after the primary set */
  farItems?: CommandBarItem[];
  /** Button size. Defaults to 'small', matching the Dynamics command bar. */
  size?: 'small' | 'medium' | 'large';
  /**
   * Label for the overflow menu trigger. Defaults to "More commands".
   */
  overflowAriaLabel?: string;
  /**
   * Disable overflow collapsing entirely and let the bar scroll horizontally.
   * Defaults to false.
   */
  disableOverflow?: boolean;
  className?: string;
}
