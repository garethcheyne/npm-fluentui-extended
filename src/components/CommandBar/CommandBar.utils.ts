import type * as React from 'react';
import type { CommandBarItem } from './CommandBar.types';

/**
 * How a command's tooltip should be built, and how it should be wired for assistive
 * technology.
 *
 * `relationship` is the part worth being careful about. Fluent uses it to decide what a
 * screen reader announces: `label` makes the tooltip the trigger's accessible name,
 * `description` leaves the visible text as the name and layers the tooltip on top.
 * A command with a visible label must never use `label`, or it announces its
 * explanation in place of its name.
 */
export type CommandBarTooltipPlan =
  /** A bare string. Passed to Fluent as-is so it can set `aria-label` directly. */
  | { mode: 'plain'; text: string; relationship: 'label' | 'description' }
  /** `title` over `description`, composed by the component into the rich layout. */
  | { mode: 'rich'; relationship: 'description'; ariaLabel?: string }
  /** Caller-supplied element, rendered verbatim. Carried here so the plan alone
   *  describes what to render and the component needs no non-null assertion. */
  | { mode: 'custom'; element: React.ReactElement; relationship: 'description'; ariaLabel?: string };

/**
 * Whether React would render anything for this node. Mirrors React's own treatment of
 * `null`/`undefined`/`false`/`''` so that `description={isAdmin && <Hint />}` collapses
 * to a plain-title tooltip rather than an empty styled body.
 */
const isRenderable = (node: React.ReactNode): boolean =>
  node !== undefined && node !== null && node !== false && node !== '';

/**
 * Decide the tooltip for a command, or `undefined` when it has none.
 *
 * Precedence is `tooltip` > `title` + `description` > `title`. Note that `title` is
 * still read even when `tooltip` wins: an icon-only command needs a short accessible
 * name, and deriving one from arbitrary custom markup would announce the entire
 * tooltip body as the button's name.
 */
export function planTooltip(item: CommandBarItem): CommandBarTooltipPlan | undefined {
  const hasVisibleLabel = Boolean(item.text);
  // Only icon-only commands need naming from the tooltip; a labelled one already has one
  const ariaLabel = hasVisibleLabel ? undefined : item.title;

  if (item.tooltip) {
    return { mode: 'custom', element: item.tooltip, relationship: 'description', ariaLabel };
  }

  if (isRenderable(item.description)) {
    return { mode: 'rich', relationship: 'description', ariaLabel };
  }

  if (item.title) {
    return {
      mode: 'plain',
      text: item.title,
      relationship: hasVisibleLabel ? 'description' : 'label',
    };
  }

  return undefined;
}

/**
 * Puts a section's commands in their running order.
 *
 * An explicit `order` wins. Anything without one takes the place after whatever
 * precedes it, which is what lets a consumer number only the commands it cares
 * about — and what makes a bar that numbers nothing render the list unchanged.
 *
 * Numbers are compared, not ranked, so leave gaps: with the grid's built-ins at
 * 10, 20, 30 there is somewhere to put a command between two of them without
 * renumbering anything.
 */
export function orderCommandBarItems(items: readonly CommandBarItem[]): CommandBarItem[] {
  let previous = 0;
  const placed = items.map((item, index) => {
    const order = item.order ?? previous + 1;
    previous = order;
    return { item, order, index };
  });

  // The written index breaks ties, so two commands sharing an order keep the
  // sequence they were passed in rather than swapping on a re-render.
  placed.sort((a, b) => a.order - b.order || a.index - b.index);
  return placed.map((entry) => entry.item);
}

/**
 * Splits a bar's commands into its two sections, each already ordered.
 *
 * Ordering deliberately runs within a section rather than across both: a
 * right-aligned command at 101 need only follow the one at 100 beside it, not
 * out-number every command on the left.
 */
export function splitCommandBarItems(items: readonly CommandBarItem[]): {
  left: CommandBarItem[];
  right: CommandBarItem[];
} {
  return {
    left: orderCommandBarItems(items.filter((item) => item.align !== 'right')),
    right: orderCommandBarItems(items.filter((item) => item.align === 'right')),
  };
}

/**
 * Whether an overflowed command should still carry a tooltip.
 *
 * A menu row always renders its text, so a title-only tooltip would just repeat the
 * label back. Only genuinely additional content earns a tooltip inside the menu.
 */
export function shouldTooltipInOverflow(item: CommandBarItem): boolean {
  return Boolean(item.tooltip) || isRenderable(item.description);
}
