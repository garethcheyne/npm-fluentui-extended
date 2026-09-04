import * as React from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { useFluentContainerStyles } from './FluentContainer.styles';
import type { FluentContainerProps, FluentContainerScroll } from './FluentContainer.types';

/**
 * How far a `shadow4` reaches past its box. A CSS blur radius B extends roughly
 * B/2 beyond the shadow rectangle, so `0 2px 4px` reaches ~2px to each side and
 * ~4px below, and the 2px downward offset cancels most of the upward spread.
 */
export const SHADOW_REACH = { top: 1, right: 2, bottom: 4, left: 2 };

// Declared locally: this package has no Node types, and should not acquire them
// for one expression. Module-scoped, so it shadows rather than clashes if a
// consumer's build does provide them.
declare const process: { env: { NODE_ENV?: string } };

/**
 * Written as the literal `process.env.NODE_ENV` on purpose — bundlers replace
 * that exact expression with a string, so the check folds away and the warning
 * drops out of production builds. Reading it via `globalThis` would defeat the
 * replacement and leave the check running (and always true) in production.
 *
 * When there is no `process` at all the access throws, and we assume production
 * and stay quiet rather than warning into a consumer's console.
 */
const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
};

/**
 * Warns when an ancestor clips the card tightly enough to shave its shadow.
 *
 * This is the failure this component exists to prevent, and it is close to
 * invisible when it happens: the card looks fine, just a little flat on one
 * side, and the cause is a wrapper several levels up with `overflow: hidden`
 * sitting exactly on the card's edge. No amount of padding further out helps,
 * because the clip is inside it.
 */
function useClippingWarning(ref: React.RefObject<HTMLElement | null>, enabled: boolean): void {
  React.useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;

    // After paint, so the measurement sees settled layout.
    const id = window.requestAnimationFrame(() => {
      const box = el.getBoundingClientRect();
      let node = el.parentElement;
      while (node) {
        const cs = window.getComputedStyle(node);
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
          const clip = node.getBoundingClientRect();
          const short = {
            top: box.top - clip.top < SHADOW_REACH.top,
            right: clip.right - box.right < SHADOW_REACH.right,
            bottom: clip.bottom - box.bottom < SHADOW_REACH.bottom,
            left: box.left - clip.left < SHADOW_REACH.left,
          };
          const sides = Object.entries(short)
            .filter(([, tooTight]) => tooTight)
            .map(([side]) => side);
          if (sides.length) {
            console.warn(
              `[FluentContainer] The card's shadow is being clipped on: ${sides.join(', ')}.\n` +
                'The nearest clipping ancestor is:',
              node,
              `\nIt has overflow: ${cs.overflowX}/${cs.overflowY} and leaves too little clearance ` +
                'for the shadow. Give that ancestor `overflow: visible`, or space between it and ' +
                'this card. Clipping belongs on the element that owns a scroll region — use the ' +
                '`scrolls` prop for that.',
            );
          }
          return; // Only the nearest clipper matters; anything beyond it is moot.
        }
        node = node.parentElement;
      }
    });

    return () => window.cancelAnimationFrame(id);
  }, [ref, enabled]);
}

function scrollClass(
  scrolls: FluentContainerScroll,
  styles: ReturnType<typeof useFluentContainerStyles>,
): string {
  switch (scrolls) {
    case 'clip':
      return styles.scrollClip;
    case 'vertical':
      return styles.scrollVertical;
    case 'horizontal':
      return styles.scrollHorizontal;
    case 'both':
      return styles.scrollBoth;
    default:
      return styles.scrollVisible;
  }
}

/**
 * A card matching the surface Dynamics 365 draws on a model-driven form:
 * `shadow4`, an 8px radius, and a transparent hairline border, on the neutral
 * page ground.
 *
 * Pair it with `FluentShell`, which supplies the gutter the shadow needs. A card
 * flush against an iframe's edge loses its shadow outright, because the frame is
 * a hard clip and there is no room outside it to paint into.
 */
export function FluentContainer(props: FluentContainerProps) {
  const {
    children,
    scrolls = 'visible',
    padding = 'comfortable',
    fill = false,
    flat = false,
    as: Element = 'div',
    className,
    style,
  } = props;

  const styles = useFluentContainerStyles();
  const ref = React.useRef<HTMLDivElement | null>(null);
  useClippingWarning(ref, !flat && isDev());

  return (
    <Element
      ref={ref}
      className={mergeClasses(
        styles.root,
        !flat && styles.elevated,
        fill ? styles.fill : styles.auto,
        padding === 'compact' && styles.paddingCompact,
        padding === 'comfortable' && styles.paddingComfortable,
        scrollClass(scrolls, styles),
        className,
      )}
      style={style}
    >
      {children}
    </Element>
  );
}
