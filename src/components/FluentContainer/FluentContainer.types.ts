import type * as React from 'react';

/**
 * How the container treats content that exceeds it.
 *
 * The default is `visible`, and deliberately so. A card's shadow is painted
 * outside its border box, so any ancestor that clips at the card's own bounds
 * erases it — and a nested container is exactly such an ancestor. Clipping is
 * therefore opt-in, on the element that genuinely owns a scroll region.
 */
export type FluentContainerScroll = 'visible' | 'clip' | 'vertical' | 'horizontal' | 'both';

/** Vertical rhythm inside the card. `none` is for containers that own their own layout. */
export type FluentContainerPadding = 'none' | 'compact' | 'comfortable';

export interface FluentContainerProps {
  children?: React.ReactNode;
  /**
   * How overflowing content behaves. Leave as `visible` unless this container is
   * the scroll region — see `FluentContainerScroll`.
   */
  scrolls?: FluentContainerScroll;
  /** Inner spacing. Defaults to `comfortable`. */
  padding?: FluentContainerPadding;
  /**
   * Fill the remaining space in a flex parent and allow inner scrolling, rather
   * than sizing to content. Use for the last card in a column — a grid, a list.
   */
  fill?: boolean;
  /**
   * Drop the shadow and render the card flat against its background. For nesting
   * a container inside another, where a second elevation reads as clutter.
   */
  flat?: boolean;
  /** Rendered element. Defaults to `div`; `section` and `article` are common. */
  as?: 'div' | 'section' | 'article' | 'aside';
  className?: string;
  style?: React.CSSProperties;
}
