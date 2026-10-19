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
  /**
   * Tooltip heading, shown on hover and focus whether or not the command has a
   * visible label. Doubles as the accessible name for icon-only commands, so it
   * stays required in practice for those.
   */
  title?: string;
  /**
   * Tooltip body, rendered under `title` as a Fluent 2 rich tooltip. Use it for the
   * "what does this actually do" line that will not fit in a label.
   *
   * Accepts markup as well as a plain string, so a description can carry its own
   * emphasis, a keyboard shortcut, or a short list. It renders inside the tooltip's
   * body styling either way - pass `tooltip` instead to replace that styling too.
   */
  description?: React.ReactNode;
  /**
   * Custom tooltip content, for when text is not enough. Takes precedence over
   * `title` and `description` as the tooltip body - `title` is still worth setting
   * alongside it, because an icon-only command falls back to it for its
   * accessible name rather than announcing the whole element.
   */
  tooltip?: React.ReactElement;
  onClick?: () => void;
  disabled?: boolean;
  appearance?: CommandBarItemAppearance;
  /** Inline styles applied to the visible command button. */
  buttonStyle?: React.CSSProperties;
  /** Renders a checked toggle state */
  checked?: boolean;
  /** Nested commands - rendered as a menu button, and as a submenu when overflowed */
  subItems?: CommandBarItem[];
  /**
   * Custom menu content rendered inside the MenuPopover. Use for complex menus
   * that need MenuItemRadio, MenuItemCheckbox, MenuGroupHeader, etc.
   * Takes precedence over subItems when both are provided.
   */
  menuContent?: React.ReactNode;
  /**
   * Keep this command out of the overflow menu. Use sparingly: a pinned command
   * that does not fit will be clipped rather than moved.
   */
  pinned?: boolean;
  /** Draw a divider before this item */
  dividerBefore?: boolean;
  /**
   * Content rendered in place of the command's button — a lookup, a filter, a
   * read-out: anything the bar should carry that is not a button.
   *
   * Takes precedence over every other rendering field, and gets no tooltip
   * wrapper, since it is not the single focusable element one attaches to.
   * Pair it with `pinned`: the overflow menu has only menu rows to offer, which
   * is not what this is, and an unpinned control would vanish into it.
   */
  content?: React.ReactNode;
  /**
   * Where this command sits among the others, low to high.
   *
   * Leave it unset and the command keeps the place it was written in, so a bar
   * that orders nothing renders exactly the list it was given. Set it on the few
   * that matter and the rest flow around them: an unordered command follows
   * whichever one precedes it.
   *
   * Ordering runs within a section, not across both, so a right-aligned command
   * only has to out-number the other right-aligned ones.
   */
  order?: number;
  /**
   * Which end of the bar this command belongs to. Defaults to `left`.
   *
   * `right` puts it in the far group, against the trailing edge — where a grid
   * puts its search box.
   */
  align?: 'left' | 'right';
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
