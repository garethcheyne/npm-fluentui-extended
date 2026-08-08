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
 * Whether an overflowed command should still carry a tooltip.
 *
 * A menu row always renders its text, so a title-only tooltip would just repeat the
 * label back. Only genuinely additional content earns a tooltip inside the menu.
 */
export function shouldTooltipInOverflow(item: CommandBarItem): boolean {
  return Boolean(item.tooltip) || isRenderable(item.description);
}
