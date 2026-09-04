import { describe, it, expect, afterEach } from 'vitest';
import { SURFACE_RULES, collectHostChain, readAlignmentAgainst } from './FluentShell';
import { SHADOW_REACH } from '../FluentContainer';
import { HARNESS_GEOMETRY } from '../D365TestHarness';

/**
 * Give an element a geometry, since jsdom reports every rect as zero.
 * Only the horizontal edges matter for alignment.
 */
function withRect(el: Element, left: number, right: number): void {
  el.getBoundingClientRect = () =>
    ({
      left,
      right,
      top: 0,
      bottom: 100,
      width: right - left,
      height: 100,
      x: left,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SURFACE_RULES', () => {
  const surfaces = Object.keys(SURFACE_RULES) as Array<keyof typeof SURFACE_RULES>;
  const edges = ['top', 'right', 'bottom', 'left'] as const;

  it('defines both densities for every surface', () => {
    for (const surface of surfaces) {
      expect(SURFACE_RULES[surface].compact, surface).toBeDefined();
      expect(SURFACE_RULES[surface].comfortable, surface).toBeDefined();
    }
  });

  it('never sets a minimum above its target', () => {
    // The minimum is a floor for what the shell adds when the host contributes
    // little. Above the target it would fight the target instead of backing it
    // up, and a well-padded host would still be pushed outwards.
    for (const surface of surfaces) {
      for (const density of ['compact', 'comfortable'] as const) {
        const { target, min } = SURFACE_RULES[surface][density];
        for (const edge of edges) {
          expect(min[edge], `${surface}.${density}.${edge}`).toBeLessThanOrEqual(target[edge]);
        }
      }
    }
  });

  it('keeps the form minimum wide enough for a card shadow', () => {
    // The regression this guards: a card flush against the iframe's edge loses
    // its shadow, because the frame is a hard clip with no room outside it. The
    // minimum is sized from the shadow's reach, so the two must stay in step.
    for (const density of ['compact', 'comfortable'] as const) {
      const { min } = SURFACE_RULES.form[density];
      expect(min.left).toBeGreaterThanOrEqual(SHADOW_REACH.left);
      expect(min.right).toBeGreaterThanOrEqual(SHADOW_REACH.right);
      expect(min.bottom).toBeGreaterThanOrEqual(SHADOW_REACH.bottom);
    }
  });

  it('adds nothing inside a dialog', () => {
    // Dialog chrome pads its own body; anything here double-insets the content.
    for (const density of ['compact', 'comfortable'] as const) {
      const { target, min } = SURFACE_RULES.dialog[density];
      for (const edge of edges) {
        expect(target[edge]).toBe(0);
        expect(min[edge]).toBe(0);
      }
    }
  });
});

describe('collectHostChain', () => {
  it('stops at the first clipping ancestor, that element included', () => {
    // A clipping ancestor is the box the control is visually confined to.
    // Padding beyond it belongs to the app shell, not to the control — and
    // walking on would sum chrome padding until the shell dropped its gutter.
    const outer = document.createElement('div');
    outer.style.padding = '99px';
    const clipper = document.createElement('div');
    clipper.style.padding = '7px 0';
    clipper.style.overflow = 'hidden';
    const frame = document.createElement('iframe');

    clipper.appendChild(frame);
    outer.appendChild(clipper);
    document.body.appendChild(outer);

    const chain = collectHostChain(frame);

    expect(chain.stoppedAt).toBe('clip');
    expect(chain.readable).toBe(true);
    // The frame plus the clipper, and nothing above it.
    expect(chain.entries).toHaveLength(2);
    expect(chain.entries[1].padding.top).toBe(7);
    expect(chain.entries[1].clips).toBe(true);
  });

  it('counts the frame by its margin and ancestors by their padding', () => {
    // The iframe's own margin is a real inset around us; an ancestor's margin
    // usually describes its relationship to siblings, so only padding counts there.
    const parent = document.createElement('div');
    parent.style.padding = '4px';
    parent.style.margin = '50px';
    parent.style.overflow = 'hidden';
    const frame = document.createElement('iframe');
    frame.style.margin = '3px';
    frame.style.padding = '60px';

    parent.appendChild(frame);
    document.body.appendChild(parent);

    const [frameEntry, parentEntry] = collectHostChain(frame).entries;

    expect(frameEntry.contributes).toBe('margin');
    expect(frameEntry.margin.top).toBe(3);
    expect(parentEntry.contributes).toBe('padding+border');
    expect(parentEntry.padding.top).toBe(4);
  });

  it('reports nothing measurable when there is no frame', () => {
    const chain = collectHostChain(null);

    expect(chain.readable).toBe(false);
    expect(chain.entries).toHaveLength(0);
    expect(chain.note).toBeTruthy();
  });
});

describe('readAlignmentAgainst', () => {
  /** A frame spanning 0–1000 inside a host document. */
  function setUpFrame(): HTMLIFrameElement {
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    withRect(frame, 0, 1000);
    return frame;
  }

  it('accepts a reference flush with the frame', () => {
    // Regression: a rule once rejected a 0/0 reading as "our own box wearing a
    // different id". The header card and the frame are siblings in the same
    // column, so flush is a real answer — the surface minimum then supplies the
    // shadow room.
    const frame = setUpFrame();
    const ref = document.createElement('div');
    ref.id = 'headerBodyContainer';
    document.body.appendChild(ref);
    withRect(ref, 0, 1000);

    const reading = readAlignmentAgainst('#headerBodyContainer', frame);

    expect(reading?.usable).toBe(true);
    expect(reading?.left).toBe(0);
    expect(reading?.right).toBe(0);
  });

  it('measures the reference by its border box, not its content box', () => {
    // The reference is a card, and what has to line up is its visible edge.
    // Using the content box silently added the reference's own padding to
    // every gutter.
    const frame = setUpFrame();
    const ref = document.createElement('div');
    ref.id = 'headerBodyContainer';
    ref.style.padding = '0 25px';
    document.body.appendChild(ref);
    withRect(ref, 8, 980);

    const reading = readAlignmentAgainst('#headerBodyContainer', frame);

    expect(reading?.left).toBe(8);
    expect(reading?.right).toBe(20);
  });

  it('rejects a reference wider than the frame', () => {
    // Negative gutters would pull the app outside its own frame.
    const frame = setUpFrame();
    const ref = document.createElement('div');
    ref.id = 'wide';
    document.body.appendChild(ref);
    withRect(ref, -30, 1030);

    expect(readAlignmentAgainst('#wide', frame)?.usable).toBe(false);
  });

  it('rejects a capped-width reference', () => {
    // The 2026 UI's `form-header` is 1794px inside a 2217px frame, implying a
    // 424px right gutter. Aligning to it would squeeze the app to its width.
    const frame = setUpFrame();
    const ref = document.createElement('div');
    ref.id = 'form-header';
    document.body.appendChild(ref);
    withRect(ref, 29, 600);

    expect(readAlignmentAgainst('#form-header', frame)?.usable).toBe(false);
  });

  it('returns null when the selector matches nothing', () => {
    expect(readAlignmentAgainst('#absent', setUpFrame())).toBeNull();
  });
});

describe('harness geometry agrees with the shell', () => {
  it('reproduces the gutters measured on a live form', () => {
    // The harness exists so local development predicts production. These are the
    // numbers measured in a real org: the control's wrapper gives 7px above and
    // below, and the header card sits 8px/20px inside the frame. Feeding those
    // through the form rules must land on what the org produced — 5px added
    // vertically, and the alignment carried through horizontally.
    const { target, min } = SURFACE_RULES.form.comfortable;
    const hostVertical = parseInt(HARNESS_GEOMETRY.frameWrapperPaddingY, 10);

    expect(hostVertical).toBe(7);
    expect(Math.max(min.top, target.top - hostVertical)).toBe(5);
    expect(Math.max(min.bottom, target.bottom - hostVertical)).toBe(5);

    // Alignment wins horizontally, floored at the minimum.
    const left = parseInt(HARNESS_GEOMETRY.headerInsetLeft, 10);
    const right = parseInt(HARNESS_GEOMETRY.headerInsetRight, 10);
    expect(Math.max(min.left, left)).toBe(8);
    expect(Math.max(min.right, right)).toBe(20);
  });
});
