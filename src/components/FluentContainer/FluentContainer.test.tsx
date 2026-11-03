import * as React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FluentProvider, tokens, webLightTheme } from '@fluentui/react-components';
import { FluentContainer } from './FluentContainer';
import type { FluentContainerProps, FluentContainerScroll } from './FluentContainer.types';

/**
 * The card's props, read back through the computed style.
 *
 * Griffel's rules do reach jsdom's cascade, so each prop can be checked by what
 * it does to the element rather than by which hashed class it added. Values come
 * back as the token's `var(...)` reference, which is what is compared: the point
 * is that the card asks for D365's `shadow4` and spacing tokens, not what pixel
 * value a theme happens to resolve them to.
 *
 * Nothing here is about geometry. The one place the component measures is the
 * clipping warning, and there the rectangles are stubbed per element so the test
 * decides how much room the shadow has.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

function renderCard(props: Partial<FluentContainerProps> = {}) {
  // Scoped to this render, so a test can render more than one card.
  const { container } = render(
    <FluentProvider theme={webLightTheme}>
      <FluentContainer {...props}>
        <span data-testid="content">Card content</span>
      </FluentContainer>
    </FluentProvider>,
  );
  const card = container.querySelector('[data-testid="content"]')!.parentElement as HTMLElement;
  return { card, style: getComputedStyle(card) };
}

describe('the card a FluentContainer draws', () => {
  it('renders its children in a div by default, or in the element asked for', () => {
    const { card } = renderCard();
    expect(card.tagName).toBe('DIV');
    expect(screen.getByText('Card content')).toBeInTheDocument();

    const { card: section } = renderCard({ as: 'section', className: 'my-card', style: { maxWidth: 480 } });
    expect(section.tagName).toBe('SECTION');
    // A caller's class and style land on the card itself, not on a wrapper.
    expect(section).toHaveClass('my-card');
    expect(section.style.maxWidth).toBe('480px');
  });

  it('is elevated with shadow4 on an 8px-radius white surface, unless flat', () => {
    const { style } = renderCard();
    expect(style.boxShadow).toBe(tokens.shadow4);
    expect(style.backgroundColor).toBe(tokens.colorNeutralBackground1);
    expect(style.borderTopLeftRadius || style.borderRadius).toBe(tokens.borderRadiusXLarge);

    // Flat is for a card nested in another: no second elevation, same surface.
    const { style: flat } = renderCard({ flat: true });
    expect(flat.boxShadow).toBe('');
    expect(flat.backgroundColor).toBe(tokens.colorNeutralBackground1);
  });

  it('reserves a transparent hairline border rather than painting one', () => {
    // The detail most often got wrong: D365 keeps the pixel and paints nothing.
    // A visible hairline reads as a harder, foreign edge beside real D365 cards.
    const { style } = renderCard();

    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      expect(style.getPropertyValue(`border-${side.toLowerCase()}-width`)).toBe(tokens.strokeWidthThin);
      expect(style.getPropertyValue(`border-${side.toLowerCase()}-style`)).toBe('solid');
      expect(style.getPropertyValue(`border-${side.toLowerCase()}-color`)).toBe('rgba(0, 0, 0, 0)');
    }
  });

  it('sizes to its content by default and fills the flex parent when asked', () => {
    const { style: auto } = renderCard();
    expect(auto.flexShrink).toBe('0');
    expect(auto.flexGrow).toBe('');

    const { style: filling } = renderCard({ fill: true });
    expect(filling.flexGrow).toBe('1');
    expect(filling.flexShrink).toBe('1');
    // Without this a filling card grows to its content instead of letting it scroll.
    expect(parseFloat(filling.minHeight)).toBe(0);
  });

  it('pads comfortably by default, compactly when asked, and not at all for none', () => {
    expect(renderCard().style.paddingTop).toBe(tokens.spacingVerticalM);
    expect(renderCard().style.paddingLeft).toBe(tokens.spacingHorizontalM);

    const compact = renderCard({ padding: 'compact' }).style;
    expect(compact.paddingTop).toBe(tokens.spacingVerticalS);
    expect(compact.paddingRight).toBe(tokens.spacingHorizontalS);

    const none = renderCard({ padding: 'none' }).style;
    expect(none.paddingTop).toBe('');
    expect(none.paddingLeft).toBe('');
  });

  it.each<[FluentContainerScroll, string, string]>([
    ['visible', 'visible', 'visible'],
    ['clip', 'hidden', 'hidden'],
    ['vertical', 'hidden', 'auto'],
    ['horizontal', 'auto', 'hidden'],
    ['both', 'auto', 'auto'],
  ])('scrolls="%s" sets overflow-x %s and overflow-y %s', (scrolls, x, y) => {
    const { style } = renderCard({ scrolls });

    // jsdom keeps the `overflow` shorthand unexpanded, so an axis it leaves
    // blank is read from the shorthand, as a browser would have resolved it.
    expect(style.overflowX || style.overflow || 'visible').toBe(x);
    expect(style.overflowY || style.overflow || 'visible').toBe(y);
  });
});

describe('the shadow-clipping warning', () => {
  // The bug this exists to surface is near-invisible on screen: an ancestor with
  // `overflow: hidden` sitting on the card's edge shaves its shadow on one side.
  // So the rectangles are given explicitly: the clipper is 300x200 at the origin,
  // and the card either sits flush inside it or with room to spare.

  type Rect = { top: number; right: number; bottom: number; left: number };
  const CLIP: Rect = { top: 0, right: 300, bottom: 200, left: 0 };

  function stubRects(card: Rect) {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect(
      this: HTMLElement,
    ) {
      const r = this.dataset.testid === 'clipper' ? CLIP : card;
      return {
        ...r,
        x: r.left,
        y: r.top,
        width: r.right - r.left,
        height: r.bottom - r.top,
        toJSON: () => ({}),
      } as DOMRect;
    });
  }

  function CardInClipper({ overflow, ...props }: { overflow: 'hidden' | 'visible' } & Partial<FluentContainerProps>) {
    return (
      <FluentProvider theme={webLightTheme}>
        <div data-testid="clipper" style={{ overflow }}>
          <FluentContainer {...props}>Card</FluentContainer>
        </div>
      </FluentProvider>
    );
  }

  function renderInside(overflow: 'hidden' | 'visible', props: Partial<FluentContainerProps> = {}) {
    render(<CardInClipper overflow={overflow} {...props} />);
  }

  /**
   * jsdom reports an undeclared `overflow-x` as '' rather than the initial
   * `visible`, and leaves the `overflow` shorthand unexpanded, so to the
   * component every ancestor would look like a clipper. This fills in what a
   * browser reports, and nothing else.
   */
  beforeEach(() => {
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
      const cs = real(el, pseudo);
      return new Proxy(cs, {
        get(target, prop) {
          if (prop === 'overflowX' || prop === 'overflowY') {
            return target[prop] || target.overflow || 'visible';
          }
          const value = Reflect.get(target, prop, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    });
  });

  /** The check runs after paint; a frame requested after mount runs after it. */
  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  it('names every side a flush clipping ancestor shaves', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubRects(CLIP);

    renderInside('hidden');

    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(warn.mock.calls[0][0]).toContain('clipped on: top, right, bottom, left');
    // The offending element is handed over so it can be inspected in DevTools.
    expect(warn.mock.calls[0][1]).toBe(screen.getByTestId('clipper'));
  });

  it('names only the sides without room for the shadow’s reach', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Plenty above and to the sides; 2px below, where shadow4 reaches about 4.
    stubRects({ top: 10, right: 290, bottom: 198, left: 10 });

    renderInside('hidden');

    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(warn.mock.calls[0][0]).toContain('clipped on: bottom.');
  });

  it('stays quiet when the clipper leaves room, or when nothing clips at all', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    stubRects({ top: 10, right: 290, bottom: 190, left: 10 });
    const roomy = render(<CardInClipper overflow="hidden" />);
    await nextFrame();
    roomy.unmount();

    // However tight the fit, an ancestor that does not clip cannot shave the shadow.
    stubRects(CLIP);
    render(<CardInClipper overflow="visible" />);
    await nextFrame();

    expect(warn).not.toHaveBeenCalled();
  });

  it('does not check a flat card, which has no shadow to lose', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubRects(CLIP);

    renderInside('hidden', { flat: true });
    await nextFrame();

    expect(warn).not.toHaveBeenCalled();
  });
});
