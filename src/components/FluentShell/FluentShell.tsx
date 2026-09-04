/**
 * FluentShell — the outermost element of a Dynamics 365 web resource.
 *
 * A web resource is dropped into an iframe whose surrounding chrome differs
 * wildly: a form section already frames the control, a full-page web resource
 * sits flush under the command bar and owns the content area, a side pane is
 * narrow, and a dialog pads its own body. One fixed padding therefore looks
 * right in exactly one of them and wrong in the rest.
 *
 * So the shell does not guess a gutter. It measures, on two axes:
 *
 * - **Vertically**, it walks the ancestors of its own iframe to find what the
 *   host already contributes, and adds only the shortfall against the surface's
 *   target. On the price list form the control's wrapper supplies 7px above and
 *   below, so the shell adds 5 and the app lands on 12. On another form that
 *   supplied 16 and 24, it backs off to its 4px minimum instead.
 *
 * - **Horizontally**, it finds the standard form column — the element holding
 *   the record title and tab strip — and lines its own content edges up with it.
 *   The correct gutters here are not symmetric and not derivable from the
 *   ancestor walk: on the price list form the host contributes nothing on either
 *   side, yet the gutters that make the app look part of the form are 2px left
 *   and 16px right. Only the reference column knows that, so the shell asks it
 *   rather than assuming.
 *
 * The invariant behind both: host contribution + shell contribution lands on the
 * intended gutter. Anything that breaks that invariant — levelling the two sides
 * to match, say — makes the app drift out of line with the form around it.
 *
 * Everything below this component can then assume it owns a correctly inset,
 * height-constrained box and never has to think about the host again.
 *
 * Debugging in a deployed org: see the diagnostics section at the foot of this
 * file, or run `__fluentShell.report()` in the console.
 *
 * Portability note: this file deliberately imports nothing from the app, so it
 * can be lifted into `fluentui-extended` as-is. Its only dependencies are React
 * and `@fluentui/react-components`.
 */
import * as React from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type {
  ChainStop,
  FluentShellProps,
  HostSurface,
  ShellDensity,
  ShellSpacing,
  SpacingBasis,
  SpacingStrategy,
} from './FluentShell.types';

/**
 * Shown on the container guides and in every report, so a pasted diagnostic is
 * attributable to a build. Bump it with the library release — a stale bundle
 * behind a CDN is otherwise indistinguishable from a fresh one.
 */
export const FLUENT_SHELL_VERSION = '2026.9.4';

// ─── Surfaces and spacing ─────────────────────────────────────────────────────

export interface HostSurfaceInfo {
  surface: HostSurface;
  density: ShellDensity;
  /** Total gutter this surface wants between the host chrome and the app. */
  target: ShellSpacing;
  /** How much of that the host already provides, measured from the frame's ancestors. */
  hostInset: ShellSpacing;
  /** What the shell actually applies, floored at the surface minimum. */
  spacing: ShellSpacing;
  /** Whether the horizontal gutters came from the form column or the surface target. */
  basis: SpacingBasis;
  /** The standard form column that was chosen, when a usable one was found. */
  alignment: AlignmentReading | null;
  /** Every reference that resolved to an element, usable or not, for the report. */
  alignmentCandidates: AlignmentReading[];
  /** False when the host is cross-origin, so `hostInset` is unknown and assumed zero. */
  measured: boolean;
  /** Iframe viewport width the density was derived from. */
  width: number;
  /** Whether this window is framed at all. */
  embedded: boolean;
  /** Human-readable trail of what the detection matched on — surfaced by `debug`. */
  reason: string;
}

/** Below this the host is a phone, a narrow pane, or a squeezed form column. */
const COMPACT_BREAKPOINT = 600;

/**
 * Safety cap on the ancestor walk. The walk normally stops long before this, at
 * the first clipping ancestor; the cap only guards against a pathological DOM.
 * Measured against a real UCI form, the iframe is 9+ levels below `<body>`, so
 * anything under ~15 risks stopping mid-chain and calling it a measurement.
 */
const MAX_ANCESTOR_WALK = 20;

/**
 * Host elements whose content column the app should line up with, best first.
 *
 * The form header — the record title, the tab strip, the command buttons — is
 * the strongest alignment cue on the page: a user reads the app as part of the
 * form when its left edge sits under the title, and as a floating box when it
 * does not. Matching it beats any fixed gutter, because it tracks whatever the
 * host does to that column at different widths.
 *
 * Matched on `id` and `data-id` only. UCI's class names are generated per build
 * (the same wrapper measured as `pa-kh` in one session and `pa-lv` in the next),
 * so a class-based reference would silently stop resolving after an org update.
 */
const ALIGNMENT_REFERENCES = [
  // The band the form's own header content sits in — measured 9px/21px inside
  // the frame on the 2026 UI, and the configuration that looked right on screen.
  //
  // Preferred over `outerHeaderContainer_0` deliberately. That element is a
  // sibling of the `tab-section0` holding our iframe and measures flush (0/0),
  // so aligning to it pushes the app out to the frame edge — wider than the
  // form content above it. It is the wrapper, not the card.
  '#headerBodyContainer',
  '[data-id="headerBodyContainer"]',
  '#outerHeaderContainer_0',
  '[data-id^="outerHeaderContainer"]',
  // The tab strip sits directly above the control — a defensible last resort.
  '#tablist_0',
  '[role="tablist"]',
  // `form-header` is a capped-width band (1794px inside a 2217px frame, implying
  // a 424px right gutter), so the maximum-gutter rule normally rejects it.
  '[data-id="form-header"]',
  '[data-id="editFormRoot"]',
];

/**
 * Alignment gutters wider than this are treated as a misread rather than a
 * measurement — a reference that is far narrower than the frame usually means we
 * matched a centred or capped-width element, not the content column. The 2026 UI
 * has exactly that trap: `form-header` implies a 424px right gutter.
 */
const MAX_ALIGNMENT_GUTTER = 96;

const all = (n: number): ShellSpacing => ({ top: n, right: n, bottom: n, left: n });

interface SurfaceRule {
  /** Gutter the app should end up with in total, host contribution included. */
  target: ShellSpacing;
  /**
   * Floor for what the shell adds regardless of the host. Even a perfectly
   * aligned host needs a little here: the iframe clips, so a card sitting flush
   * against the frame edge loses its shadow and focus ring outright, with no
   * room outside the frame for them to render into.
   *
   * Sized from the card shadow rather than picked. A CSS blur radius B extends
   * roughly B/2 past the box, so `shadow4` (`0 0 2px`, `0 2px 4px`) reaches
   * about 2px to each side, 4px below, and barely 1px above — the 2px offset
   * cancels most of the upward spread. Anything beyond that buys nothing and
   * pushes the app out of line with the form chrome.
   */
  min: ShellSpacing;
}

/**
 * Per-surface targets. These are the numbers to tune when a host changes its own
 * chrome — nothing else in the file encodes a measurement.
 */
export const SURFACE_RULES: Record<HostSurface, Record<ShellDensity, SurfaceRule>> = {
  // The form puts the control in an already-padded section next to other fields,
  // so most of this target is normally met by the host and the shell adds little.
  form: {
    compact: { target: all(8), min: { top: 2, right: 2, bottom: 4, left: 2 } },
    comfortable: { target: all(12), min: { top: 2, right: 2, bottom: 4, left: 2 } },
  },
  // A full-page web resource replaces the record body and owns the content area,
  // so it carries the gutters a native page would: tight under the command bar,
  // generous at the sides.
  fullPage: {
    compact: { target: { top: 8, right: 12, bottom: 12, left: 12 }, min: all(8) },
    comfortable: { target: { top: 12, right: 20, bottom: 20, left: 20 }, min: all(8) },
  },
  // Panes are narrow enough that side gutters cost real content width.
  sidePane: {
    compact: { target: all(8), min: all(4) },
    comfortable: { target: all(12), min: all(8) },
  },
  // Dialog chrome pads its own body; adding to it double-insets the content.
  dialog: {
    compact: { target: all(0), min: all(0) },
    comfortable: { target: all(0), min: all(0) },
  },
  // The dev harness has no host to measure, so the target lands in full and the
  // app stands off the window edge roughly the way it will once embedded.
  standalone: {
    compact: { target: all(12), min: all(12) },
    comfortable: { target: all(24), min: all(24) },
  },
};

// ─── Host detection ───────────────────────────────────────────────────────────

/**
 * The window that owns a given document, defaulting to the global one.
 *
 * Everything the shell measures has to be resolved against this rather than the
 * ambient `window`. React content portalled into an iframe still *executes* in
 * the parent's JavaScript context, so the global `window` there is the host's:
 * `frameElement` is null, `self === top`, and the shell concludes it is not
 * framed even though its DOM plainly is. Reading the window back off the
 * rendered element's `ownerDocument` is what makes the shell correct in any
 * document — an iframe harness, a portal, or a plain page.
 */
function windowOf(doc?: Document | null): Window {
  return (doc?.defaultView as Window | null) ?? window;
}

function isEmbedded(win: Window = window): boolean {
  try {
    return win.self !== win.top;
  } catch {
    // A cross-origin top window throws on access, which itself proves we are framed.
    return true;
  }
}

/** Our own iframe element in the host document, when the host is same-origin. */
function getFrameElement(win: Window = window): Element | null {
  try {
    return win.frameElement;
  } catch {
    return null;
  }
}

/**
 * Reads an element's id without `instanceof`.
 *
 * `window.frameElement` belongs to the host document, so it is an instance of
 * the *host* window's `HTMLElement`, not ours. `frame instanceof HTMLElement` is
 * therefore always false across that boundary, which silently disabled the
 * frame-id branch of surface detection and reported a null frame id.
 */
function elementId(el: Element | null): string {
  const id = (el as HTMLElement | null)?.id;
  return typeof id === 'string' ? id : '';
}

function frameIsInside(frame: Element | null, selector: string): boolean {
  try {
    return !!frame?.closest(selector);
  } catch {
    return false;
  }
}

/** Query string plus hash of this window and every readable ancestor, lowercased. */
function readLocationHints(win: Window = window): string {
  let hints = `${win.location.search}${win.location.hash}`;
  try {
    const parent = win.parent;
    if (parent && parent !== win) {
      hints += `${parent.location.search}${parent.location.hash}`;
    }
    const top = win.top;
    if (top && top !== parent && top !== win) {
      hints += `${top.location.search}${top.location.hash}`;
    }
  } catch {
    // Cross-origin host — fall back to the frame element and viewport signals.
  }
  return hints.toLowerCase();
}

/**
 * Works out the host surface from whatever signals are readable. Web resources
 * are served from the org's own origin, so in Dynamics the frame element and the
 * host URL are normally both available; the viewport fallback only matters in
 * unusual embeddings.
 */
function detectSurface(
  embedded: boolean,
  frame: Element | null,
  win: Window = window,
): { surface: HostSurface; reason: string } {
  if (!embedded) return { surface: 'standalone', reason: 'not framed' };

  if (frameIsInside(frame, '[role="dialog"], [data-id*="dialog" i]')) {
    return { surface: 'dialog', reason: 'frame inside dialog' };
  }
  if (frameIsInside(frame, '[data-id*="sidepanel" i], [id*="sidepane" i], [class*="sidepane" i]')) {
    return { surface: 'sidePane', reason: 'frame inside side pane' };
  }

  const hints = readLocationHints(win);
  if (hints.includes('pagetype=webresource')) {
    return { surface: 'fullPage', reason: 'pagetype=webresource' };
  }
  // Form web resource controls are framed as `WebResource_<control name>`.
  const frameId = elementId(frame);
  if (/^webresource/i.test(frameId)) {
    return { surface: 'form', reason: `frame id ${frameId}` };
  }
  if (hints.includes('pagetype=entityrecord') || hints.includes('etn=')) {
    return { surface: 'form', reason: 'host is a record form' };
  }

  // Framed by something unreadable. Full-page gutters are the safer guess: extra
  // whitespace reads as deliberate, a control jammed against the chrome reads as
  // broken. Pass `surface` explicitly to settle it.
  return { surface: 'fullPage', reason: 'unresolved host' };
}

// ─── Host measurement ─────────────────────────────────────────────────────────

function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** One link in the chain between our iframe and the host's content edge. */
export interface HostAncestor {
  /** 0 is the iframe itself; 1 upwards are its ancestors. */
  depth: number;
  tag: string;
  id: string;
  classes: string;
  padding: ShellSpacing;
  border: ShellSpacing;
  margin: ShellSpacing;
  display: string;
  overflow: string;
  /** Whether this element clips its content, making it the control's visual box. */
  clips: boolean;
  width: number;
  height: number;
  /** Which of this element's edges were added to the inset. */
  contributes: 'margin' | 'padding+border' | 'none';
}

export interface HostChain {
  entries: HostAncestor[];
  stoppedAt: ChainStop;
  /** False when there is no readable frame element, so nothing could be measured. */
  readable: boolean;
  note?: string;
}

function edgesOf(cs: CSSStyleDeclaration) {
  return {
    padding: {
      top: px(cs.paddingTop),
      right: px(cs.paddingRight),
      bottom: px(cs.paddingBottom),
      left: px(cs.paddingLeft),
    },
    border: {
      top: px(cs.borderTopWidth),
      right: px(cs.borderRightWidth),
      bottom: px(cs.borderBottomWidth),
      left: px(cs.borderLeftWidth),
    },
    margin: {
      top: px(cs.marginTop),
      right: px(cs.marginRight),
      bottom: px(cs.marginBottom),
      left: px(cs.marginLeft),
    },
  };
}

function describe(el: Element, depth: number, contributes: HostAncestor['contributes']): HostAncestor {
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    depth,
    tag: el.tagName.toLowerCase(),
    id: el.id || '',
    // UCI class lists run to a dozen generated names; enough to identify the node.
    classes: (el.getAttribute('class') || '').slice(0, 120),
    ...edgesOf(cs),
    display: cs.display,
    overflow: `${cs.overflowX}/${cs.overflowY}`,
    clips: cs.overflowX !== 'visible' || cs.overflowY !== 'visible',
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    contributes,
  };
}

/**
 * Walks from our iframe up towards the host's content edge, recording every
 * element on the way. Both the measurement and the diagnostics read this same
 * chain, so what gets reported is always what got measured.
 *
 * The walk stops at the first ancestor that clips, that element included. A
 * clipping ancestor is the box the control is visually confined to, so its
 * padding is the whitespace a user reads as the gap around the control; padding
 * further out belongs to the app shell and is not ours to cancel. Stopping there
 * also avoids the alternative failure — walking on to `<body>` and summing
 * chrome-level padding until the shell drops its own gutter entirely.
 */
export function collectHostChain(
  frame: Element | null = getFrameElement(),
  win: Window = window,
): HostChain {
  if (!frame) {
    return {
      entries: [],
      stoppedAt: 'root',
      readable: false,
      // No frame to read a window from, so the caller's is the only signal.
      note: isEmbedded(win)
        ? 'No frameElement — the host document is cross-origin.'
        : 'Not framed; nothing to measure.',
    };
  }

  const entries: HostAncestor[] = [];
  let stoppedAt: ChainStop = 'root';
  try {
    // The iframe's own margin is a real inset around us, unlike its ancestors'.
    // Its own overflow is not a stop condition — every iframe clips.
    entries.push(describe(frame, 0, 'margin'));

    const body = frame.ownerDocument?.body;
    let node = frame.parentElement;
    let depth = 1;
    while (node) {
      if (depth > MAX_ANCESTOR_WALK) {
        stoppedAt = 'cap';
        break;
      }
      const entry = describe(node, depth, 'padding+border');
      entries.push(entry);
      if (entry.clips) {
        stoppedAt = 'clip';
        break;
      }
      if (node === body) {
        stoppedAt = 'body';
        break;
      }
      node = node.parentElement;
      depth += 1;
    }
  } catch (err) {
    return {
      entries,
      stoppedAt,
      readable: false,
      note: `Style access failed partway up: ${String(err)}`,
    };
  }

  return { entries, stoppedAt, readable: true };
}

/**
 * Sums the padding and borders the host has already put between its content edge
 * and our iframe. Computed styles are always resolved to pixels, so a host
 * declaring `padding-bottom: 1.5rem` is read here as 24.
 *
 * Only padding and borders count. Ancestor margins are skipped: on a flex or
 * grid host they usually describe the ancestor's relationship to its siblings
 * rather than any inset around us, and counting them made the shell drop its own
 * gutter on layouts where nothing was actually indented.
 */
function insetFromChain(chain: HostChain): ShellSpacing {
  const inset = all(0);
  for (const entry of chain.entries) {
    const source = entry.contributes === 'margin' ? [entry.margin] : [entry.padding, entry.border];
    for (const edges of source) {
      inset.top += edges.top;
      inset.right += edges.right;
      inset.bottom += edges.bottom;
      inset.left += edges.left;
    }
  }
  return inset;
}

/** A host element the app's content column can be lined up with. */
export interface AlignmentReading {
  /** Which entry in `ALIGNMENT_REFERENCES` matched. */
  selector: string;
  /** Identifier of the element that matched, for the report. */
  ref: string;
  /** Gutter that puts our content edge under the reference's, per side. */
  left: number;
  right: number;
  refWidth: number;
  frameWidth: number;
  /** False when the numbers were out of range and should not be used. */
  usable: boolean;
}

/**
 * Finds the standard form column and works out the gutters that would put our
 * content edges underneath its own.
 *
 * This is measured rather than declared, so it tracks whatever the host does to
 * that column — a collapsed nav pane, a narrower window, a future UCI restyle —
 * without a constant to maintain.
 */
export function readAlignmentAgainst(
  selector: string,
  frame: Element | null = getFrameElement(),
): AlignmentReading | null {
  const doc = frame?.ownerDocument;
  if (!frame || !doc) return null;

  const frameRect = frame.getBoundingClientRect();
  if (!frameRect.width) return null;

  let ref: Element | null = null;
  try {
    ref = doc.querySelector(selector);
  } catch {
    return null; // Malformed selector for this browser.
  }
  if (!ref) return null;

  const rect = ref.getBoundingClientRect();
  if (!rect.width) return null;

  // The reference's *border-box* edges, deliberately.
  //
  // The reference is a card — measured live, `#headerBodyContainer` is the only
  // element above the frame that paints a shadow, and it carries the white fill
  // and 8px radius of the header. What has to line up is our card's visible edge
  // with its visible edge, and that is the border box. An earlier version used
  // the content box, which quietly added the reference's own padding to every
  // gutter and left us a pixel or two inboard of the thing we were matching.
  const left = rect.left - frameRect.left;
  const right = frameRect.right - rect.right;
  const usable =
    Number.isFinite(left) &&
    Number.isFinite(right) &&
    left >= 0 &&
    right >= 0 &&
    // A flush reference — one exactly as wide as the frame — is deliberately
    // allowed. An earlier version rejected it as "our own box wearing a
    // different id", which threw away the correct answer: the header card and
    // our iframe are siblings in the same column, so zero really is the gutter
    // that lines them up. The surface minimum below then supplies shadow room.
    left <= MAX_ALIGNMENT_GUTTER &&
    right <= MAX_ALIGNMENT_GUTTER;

  return {
    selector,
    ref: elementId(ref) || ref.getAttribute('data-id') || ref.tagName.toLowerCase(),
    left: Math.round(left),
    right: Math.round(right),
    refWidth: Math.round(rect.width),
    frameWidth: Math.round(frameRect.width),
    usable,
  };
}

/**
 * The first reference that yields a *usable* reading, not merely the first that
 * matches an element. An earlier version returned on the first match, so on the
 * 2026 UI the capped-width `form-header` (implying a 424px right gutter) shadowed
 * every candidate behind it and the shell silently fell back to its targets.
 */
export function measureAlignment(
  frame: Element | null = getFrameElement(),
): { chosen: AlignmentReading | null; candidates: AlignmentReading[] } {
  const candidates: AlignmentReading[] = [];
  for (const selector of ALIGNMENT_REFERENCES) {
    const reading = readAlignmentAgainst(selector, frame);
    if (!reading) continue;
    candidates.push(reading);
  }
  return { chosen: candidates.find((c) => c.usable) ?? null, candidates };
}

/**
 * The shortfall between what the surface wants and what the host already gives,
 * floored at the surface minimum.
 *
 * Each side is resolved independently. An earlier version levelled left and
 * right to the larger of the two on the theory that uneven gutters read as a
 * bug, which was wrong twice over: it broke the invariant this whole file exists
 * to hold — that host + shell lands on the target — so a host giving 2px on the
 * right produced effective gutters of 12 and 14 rather than 12 and 12. And the
 * gutters that actually look right on a real form turned out to be asymmetric
 * anyway.
 */
function resolveShortfall(rule: SurfaceRule, hostInset: ShellSpacing): ShellSpacing {
  const side = (edge: keyof ShellSpacing) =>
    Math.max(rule.min[edge], rule.target[edge] - hostInset[edge]);

  return {
    top: side('top'),
    right: side('right'),
    bottom: side('bottom'),
    left: side('left'),
  };
}

/**
 * Horizontal gutters come from the alignment reference when one was found, and
 * from the surface target otherwise. Vertical always comes from the target: the
 * reference sits above us, so it says nothing about our top and bottom.
 *
 * Alignment wins because it is the stronger signal. A gutter that puts the app's
 * edge under the record title is right by construction at every window width,
 * where a target is only ever right at the width it was chosen for — but the
 * surface minimum still applies, so a reference flush with the frame cannot
 * collapse the gutter to nothing and clip a focus ring.
 */
function resolveSpacing(
  rule: SurfaceRule,
  hostInset: ShellSpacing,
  alignment: AlignmentReading | null,
  strategy: SpacingStrategy,
): { spacing: ShellSpacing; basis: SpacingBasis } {
  const fromTarget = resolveShortfall(rule, hostInset);
  if (strategy === 'target' || !alignment?.usable) {
    return { spacing: fromTarget, basis: 'target' };
  }

  return {
    spacing: {
      top: fromTarget.top,
      bottom: fromTarget.bottom,
      left: Math.max(rule.min.left, alignment.left),
      right: Math.max(rule.min.right, alignment.right),
    },
    basis: 'alignment',
  };
}

/** Reads the host once. Exported so non-React callers (and tests) can use it. */
export function detectHostSurface(
  override?: HostSurface,
  strategy: SpacingStrategy = 'auto',
  win: Window = window,
): HostSurfaceInfo {
  const embedded = isEmbedded(win);
  const frame = getFrameElement(win);
  const width = win.innerWidth || win.document.documentElement.clientWidth || 0;
  const density: ShellDensity = width < COMPACT_BREAKPOINT ? 'compact' : 'comfortable';

  const detected = detectSurface(embedded, frame, win);
  const surface = override ?? detected.surface;
  const reason = override ? `forced to ${override} (would have been ${detected.surface})` : detected.reason;

  const rule = SURFACE_RULES[surface][density];
  const chain = collectHostChain(frame, win);
  const hostInset = insetFromChain(chain);
  const { chosen: alignment, candidates: alignmentCandidates } = measureAlignment(frame);
  const { spacing, basis } = resolveSpacing(rule, hostInset, alignment, strategy);

  return {
    surface,
    density,
    target: rule.target,
    hostInset,
    spacing,
    basis,
    alignment,
    alignmentCandidates,
    measured: chain.readable,
    width,
    embedded,
    reason,
  };
}

/**
 * Re-reads the host on resize. The host can change the frame's size without a
 * reload — a pane being dragged, a form column collapsing, a tablet rotating —
 * and both the density and the measured inset move with it.
 */
export function useHostSurface(
  override?: HostSurface,
  strategy: SpacingStrategy = 'auto',
  win?: Window,
): HostSurfaceInfo {
  const target = win ?? (typeof window !== 'undefined' ? window : undefined);
  const [info, setInfo] = React.useState<HostSurfaceInfo>(() =>
    detectHostSurface(override, strategy, target),
  );

  React.useEffect(() => {
    if (!target) return;
    let frame = 0;
    const measure = () => {
      target.cancelAnimationFrame(frame);
      // Coalesce resize bursts into one measurement per paint.
      frame = target.requestAnimationFrame(() => setInfo(detectHostSurface(override, strategy, target)));
    };
    target.addEventListener('resize', measure);
    // The host often finishes laying the frame out after our first paint, so the
    // mount-time reading can be stale by the time it matters — and the alignment
    // reference in particular is often still being positioned.
    measure();
    return () => {
      target.cancelAnimationFrame(frame);
      target.removeEventListener('resize', measure);
    };
  }, [override, strategy, target]);

  return info;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ShellContext = React.createContext<HostSurfaceInfo | null>(null);

/**
 * The resolved host and gutters, for descendants that need to react to them —
 * typically to bleed a toolbar or a grid back out to the iframe edge, or to drop
 * a heading at compact widths.
 *
 * Throws outside a `FluentShell` rather than guessing, since a wrong answer here
 * shows up as a misaligned layout that is tedious to trace back.
 */
export function useShellSurface(): HostSurfaceInfo {
  const value = React.useContext(ShellContext);
  if (!value) throw new Error('useShellSurface must be used inside a <FluentShell>.');
  return value;
}

/** Negative margins that cancel the shell's gutters on the given sides. */
export function useShellBleed(
  sides: Array<keyof ShellSpacing> = ['left', 'right'],
): React.CSSProperties {
  const { spacing } = useShellSurface();
  const style: React.CSSProperties = {};
  if (sides.includes('top')) style.marginTop = -spacing.top;
  if (sides.includes('right')) style.marginRight = -spacing.right;
  if (sides.includes('bottom')) style.marginBottom = -spacing.bottom;
  if (sides.includes('left')) style.marginLeft = -spacing.left;
  return style;
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────

const DEBUG_STORAGE_KEY = 'fluentShellDebug';

function readStoredDebugFlag(): boolean {
  try {
    return !!window.localStorage.getItem(DEBUG_STORAGE_KEY);
  } catch {
    // Storage can be blocked outright in an embedded frame.
    return false;
  }
}

/**
 * Whether the overlay should be on. The URL check looks at the host's address
 * too, not just the iframe's: on a form web resource the iframe URL is built by
 * Dynamics and there is nowhere to add a query parameter, so `?shellDebug` is
 * only ever typeable on the top window. The stored flag is the fallback for when
 * neither URL can be touched.
 */
export function isShellDebugEnabled(win: Window = window): boolean {
  return readLocationHints(win).includes('shelldebug') || readStoredDebugFlag();
}

export interface ShellDiagnostics {
  version: string;
  timestamp: string;
  /** What the shell decided, and the numbers behind it. */
  surface: HostSurface;
  reason: string;
  density: ShellDensity;
  target: ShellSpacing;
  hostInset: ShellSpacing;
  applied: ShellSpacing;
  /** `hostInset` + `applied`: the gutter the app actually ends up with. */
  effective: ShellSpacing;
  /** Whether the horizontal gutters came from the form column or the surface target. */
  basis: SpacingBasis;
  /** The standard form column that was chosen, if any. */
  alignment: AlignmentReading | null;
  /** Every reference that resolved, usable or not — shows what was rejected and why. */
  alignmentCandidates: AlignmentReading[];
  measured: boolean;
  /** Where the ancestor walk ended. `cap` means the reading is incomplete. */
  stoppedAt: ChainStop;
  chainNote?: string;
  /** Raw signals, so a wrong decision can be traced without a repro. */
  signals: {
    embedded: boolean;
    hasFrameElement: boolean;
    frameId: string | null;
    ownUrl: string;
    hostUrl: string | null;
    topUrl: string | null;
    viewport: { width: number; height: number; dpr: number };
    frameRect: { width: number; height: number } | null;
    userAgent: string;
  };
  /** Every element between the iframe and the host's content edge. */
  chain: HostAncestor[];
}

function locationOf(target: Window | null | undefined, self: Window = window): string | null {
  try {
    if (!target || target === self) return null;
    return target.location.href;
  } catch {
    return 'cross-origin';
  }
}

const sum = (a: ShellSpacing, b: ShellSpacing): ShellSpacing => ({
  top: a.top + b.top,
  right: a.right + b.right,
  bottom: a.bottom + b.bottom,
  left: a.left + b.left,
});

/**
 * A complete, serialisable picture of what the shell saw and decided. Safe to
 * paste anywhere: it carries element ids, classes and geometry, never record
 * data or user identity — the URLs are the only field that name a record, and
 * they are the ones that explain the surface decision.
 */
export function collectShellDiagnostics(
  override?: HostSurface,
  strategy: SpacingStrategy = 'auto',
  win: Window = window,
): ShellDiagnostics {
  const frame = getFrameElement(win);
  const info = detectHostSurface(override, strategy, win);
  const chain = collectHostChain(frame, win);
  const rect = frame?.getBoundingClientRect();

  return {
    version: FLUENT_SHELL_VERSION,
    timestamp: new Date().toISOString(),
    surface: info.surface,
    reason: info.reason,
    density: info.density,
    target: info.target,
    hostInset: info.hostInset,
    applied: info.spacing,
    effective: sum(info.hostInset, info.spacing),
    basis: info.basis,
    alignment: info.alignment,
    alignmentCandidates: info.alignmentCandidates,
    measured: info.measured,
    stoppedAt: chain.stoppedAt,
    chainNote: chain.note,
    signals: {
      embedded: info.embedded,
      hasFrameElement: !!frame,
      frameId: frame ? elementId(frame) || '(none)' : null,
      ownUrl: win.location.href,
      hostUrl: locationOf(win.parent, win),
      topUrl: locationOf(win.top, win),
      viewport: {
        width: win.innerWidth,
        height: win.innerHeight,
        dpr: win.devicePixelRatio,
      },
      frameRect: rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null,
      userAgent: navigator.userAgent,
    },
    chain: chain.entries,
  };
}

function edges(s: ShellSpacing): string {
  return `${Math.round(s.top)}·${Math.round(s.right)}·${Math.round(s.bottom)}·${Math.round(s.left)}`;
}

/** Prints the diagnostics as a grouped table and returns them. */
export function logShellDiagnostics(
  override?: HostSurface,
  strategy: SpacingStrategy = 'auto',
  win: Window = window,
): ShellDiagnostics {
  const d = collectShellDiagnostics(override, strategy, win);
  console.group(
    `%cFluentShell%c ${d.surface}/${d.density} — applied ${edges(d.applied)}`,
    'background:#742774;color:#fff;padding:1px 5px;border-radius:3px',
    'color:inherit',
  );
  console.log('decision   ', d.reason);
  console.log('basis      ', d.basis, d.basis === 'alignment' ? `(lined up with #${d.alignment?.ref})` : '(surface target)');
  if (d.alignment) {
    console.log(
      'reference  ',
      `${d.alignment.ref} via ${d.alignment.selector} — ${d.alignment.refWidth}px wide vs frame ${d.alignment.frameWidth}px`,
      d.alignment.usable ? '' : '(OUT OF RANGE, ignored)',
    );
    console.log('would align', `left ${d.alignment.left} / right ${d.alignment.right}`);
  } else {
    console.log('reference  ', 'none usable — see the candidate table below');
  }
  if (d.alignmentCandidates.length) {
    console.log('Alignment candidates (first usable wins):');
    console.table(d.alignmentCandidates);
  }
  console.log('target     ', edges(d.target), '(what this surface wants in total)');
  console.log('host gives ', edges(d.hostInset), d.measured ? '' : '(NOT MEASURED — cross-origin)');
  console.log('shell adds ', edges(d.applied));
  console.log('effective  ', edges(d.effective), '(top·right·bottom·left)');
  console.log('walk ended', `${d.stoppedAt}${d.stoppedAt === 'clip' ? ' (clipping ancestor)' : ''}`);
  if (d.stoppedAt === 'cap') {
    console.warn(
      `Ancestor walk hit the ${MAX_ANCESTOR_WALK} level cap without finding a clipping ` +
        'ancestor — the host inset below is incomplete.',
    );
  }
  if (d.chainNote) console.warn(d.chainNote);
  console.log('signals    ', d.signals);
  if (d.chain.length) {
    console.log('Host chain (depth 0 is our iframe):');
    console.table(
      d.chain.map((e) => ({
        depth: e.depth,
        tag: e.tag,
        id: e.id,
        classes: e.classes,
        padding: edges(e.padding),
        border: edges(e.border),
        margin: edges(e.margin),
        size: `${e.width}×${e.height}`,
        overflow: e.overflow,
        counted: e.contributes,
      })),
    );
  }
  console.log('Copy the full report with: copy(__fluentShell.json())');
  console.groupEnd();
  return d;
}

/**
 * Console-set overrides for the two overlays.
 *
 * These exist so a deployed web resource can be inspected without a reload. The
 * earlier `enable()` persisted a flag and reloaded, which threw away whatever
 * state the grid was holding just to draw an outline — useless for judging a
 * layout you had to load data to reach.
 *
 * `undefined` means "not overridden": the prop, then the URL/storage flag, still
 * decide. A console call outranks both, since that is the point of making it.
 */
interface OverlayOverrides {
  debug?: boolean;
  containers?: boolean;
}

let overlayOverrides: OverlayOverrides = {};
const overlayListeners = new Set<() => void>();

function setOverlayOverride(patch: OverlayOverrides): void {
  // Replaced rather than mutated: useSyncExternalStore compares by reference.
  overlayOverrides = { ...overlayOverrides, ...patch };
  overlayListeners.forEach((notify) => notify());
}

function subscribeOverlay(onChange: () => void): () => void {
  overlayListeners.add(onChange);
  return () => {
    overlayListeners.delete(onChange);
  };
}

function getOverlayOverrides(): OverlayOverrides {
  return overlayOverrides;
}

/** Remembers the debug flag across reloads, when storage is available. */
function persistDebugFlag(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(DEBUG_STORAGE_KEY, '1');
    else window.localStorage.removeItem(DEBUG_STORAGE_KEY);
  } catch {
    // Storage blocked in this frame — the override still applies for this session.
  }
}

/** Our content edges against a host element's, in the host's coordinate space. */
export interface EdgeComparison {
  selector: string;
  ref: string;
  /** Positive = our card starts right of the reference's left edge. */
  deltaLeft: number;
  /** Positive = our card ends left of the reference's right edge. */
  deltaRight: number;
  ourWidth: number;
  refWidth: number;
  /** The gutters currently applied, for cross-checking against the deltas. */
  applied: ShellSpacing;
  verdict: string;
}

/** A host element that paints a card, measured against our frame. */
export interface PaintedCard {
  id: string;
  dataId: string;
  tag: string;
  width: number;
  /** Positive = the card's left edge is inboard of our frame's. */
  left: number;
  /** Positive = the card's right edge is inboard of our frame's. */
  right: number;
  /** Negative = the card sits above our frame, which is where the header is. */
  top: number;
  boxShadow: string;
  borderRadius: string;
}

export interface ShellDebugApi {
  version: string;
  /** The live resolved values, refreshed on every call. */
  info: () => HostSurfaceInfo;
  /** What each strategy would apply right now, for comparing against a hand-tuned set. */
  compare: () => Record<SpacingStrategy, string>;
  /**
   * Measure against any selector and apply it immediately, for trying a
   * reference without a rebuild. Returns the reading, or null if it did not
   * resolve. The applied values last until the next re-render (a resize, say).
   */
  tryReference: (selector: string) => AlignmentReading | null;
  /** Apply gutters directly, for trying numbers by hand. Same lifetime caveat. */
  apply: (spacing: Partial<ShellSpacing>) => void;
  /**
   * How far our card edges sit from a host element's, as a signed number in host
   * viewport pixels. Positive means we are inboard of it (narrower), negative
   * means we overhang it. Zero on both sides is exact alignment.
   */
  edges: (selector?: string) => EdgeComparison | null;
  /**
   * Every host element above our frame that actually paints a card — a real
   * box-shadow — with its edges relative to ours. Identifies the thing to align
   * to by what it draws, rather than by guessing which wrapper in the DOM
   * corresponds to the card seen on screen.
   */
  cards: () => PaintedCard[];
  /** Full diagnostics object. */
  diagnostics: (override?: HostSurface) => ShellDiagnostics;
  /** Pretty-print to the console and return the diagnostics. */
  report: (override?: HostSurface) => ShellDiagnostics;
  /** JSON string for `copy(__fluentShell.json())`. */
  json: (override?: HostSurface) => string;
  /** Try each surface's numbers against the host actually measured here. */
  preview: () => Record<HostSurface, string>;
  /**
   * Turn the debug overlay on or off immediately — no reload. Also persisted, so
   * it survives one. Returns what the shell currently resolves to.
   */
  debug: (on?: boolean) => HostSurfaceInfo;
  /** Turn the red container guides and version tag on or off immediately. */
  containers: (on?: boolean) => void;
  /** Drop both console overrides, handing control back to the props and URL flag. */
  reset: () => void;
}

function buildDebugApi(win: Window = window): ShellDebugApi {
  return {
    version: FLUENT_SHELL_VERSION,
    info: () => detectHostSurface(undefined, 'auto', win),
    tryReference: (selector: string) => {
      const reading = readAlignmentAgainst(selector, getFrameElement(win));
      if (reading) applyLiveSpacing({ left: reading.left, right: reading.right });
      return reading;
    },
    apply: (spacing: Partial<ShellSpacing>) => applyLiveSpacing(spacing),
    cards: () => {
      const frame = getFrameElement(win);
      const doc = frame?.ownerDocument;
      if (!frame || !doc) return [];
      const frameRect = frame.getBoundingClientRect();

      const found: PaintedCard[] = [];
      for (const el of Array.from(doc.querySelectorAll('div, section, header'))) {
        const cs = getComputedStyle(el);
        // A painted shadow is what makes something read as a card. Elements
        // without one are structural wrappers, however card-shaped their id.
        if (!cs.boxShadow || cs.boxShadow === 'none') continue;

        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        // Only things wide enough to be a column, and only above our own frame —
        // the header band, not chrome elsewhere on the page.
        if (r.width < frameRect.width * 0.5) continue;
        if (r.top > frameRect.top) continue;

        found.push({
          id: (el as HTMLElement).id || '',
          dataId: el.getAttribute('data-id') || '',
          tag: el.tagName.toLowerCase(),
          width: Math.round(r.width),
          left: Math.round(r.left - frameRect.left),
          right: Math.round(frameRect.right - r.right),
          top: Math.round(r.top - frameRect.top),
          boxShadow: cs.boxShadow,
          borderRadius: cs.borderRadius,
        });
      }
      // Nearest above our frame first: that is the card we sit under.
      found.sort((a, b) => b.top - a.top);
      return found;
    },
    edges: (selector = ALIGNMENT_REFERENCES[0]) => {
      const frame = getFrameElement(win);
      const ref = frame?.ownerDocument?.querySelector(selector);
      if (!frame || !ref) return null;

      const frameRect = frame.getBoundingClientRect();
      const refRect = ref.getBoundingClientRect();
      const { spacing } = detectHostSurface(undefined, 'auto', win);

      // The cards sit flush against the shell's content box, so its edges are
      // theirs. Expressed in host coordinates to be comparable with the
      // reference, which lives in the host document.
      const ourLeft = frameRect.left + spacing.left;
      const ourRight = frameRect.right - spacing.right;
      const deltaLeft = Math.round(ourLeft - refRect.left);
      const deltaRight = Math.round(refRect.right - ourRight);

      const describeSide = (d: number, side: string) =>
        d === 0 ? `${side} exact` : d > 0 ? `${side} ${d}px inboard` : `${side} ${-d}px over`;

      return {
        selector,
        ref: (ref as HTMLElement).id || ref.getAttribute('data-id') || ref.tagName.toLowerCase(),
        deltaLeft,
        deltaRight,
        ourWidth: Math.round(ourRight - ourLeft),
        refWidth: Math.round(refRect.width),
        applied: spacing,
        verdict: `${describeSide(deltaLeft, 'left')}, ${describeSide(deltaRight, 'right')}`,
      };
    },
    compare: () => ({
      auto: edges(detectHostSurface(undefined, 'auto', win).spacing),
      align: edges(detectHostSurface(undefined, 'align', win).spacing),
      target: edges(detectHostSurface(undefined, 'target', win).spacing),
    }),
    diagnostics: (override) => collectShellDiagnostics(override, 'auto', win),
    report: (override) => logShellDiagnostics(override, 'auto', win),
    json: (override) => JSON.stringify(collectShellDiagnostics(override, 'auto', win), null, 2),
    preview: () => {
      const { density } = detectHostSurface(undefined, 'auto', win);
      const hostInset = insetFromChain(collectHostChain(getFrameElement(win), win));
      const out = {} as Record<HostSurface, string>;
      for (const key of Object.keys(SURFACE_RULES) as HostSurface[]) {
        out[key] = edges(resolveShortfall(SURFACE_RULES[key][density], hostInset));
      }
      return out;
    },
    debug: (on = true) => {
      setOverlayOverride({ debug: on });
      persistDebugFlag(on);
      return detectHostSurface();
    },
    containers: (on = true) => setOverlayOverride({ containers: on }),
    reset: () => {
      setOverlayOverride({ debug: undefined, containers: undefined });
      persistDebugFlag(false);
    },
  };
}

/**
 * Mounted shell roots. Registered rather than found by selector: two shells on
 * one page are legitimate, and `querySelector` would silently pick whichever
 * came first in the DOM — so a live trial could adjust a shell you were not
 * looking at.
 */
const shellRoots = new Set<HTMLElement>();

/**
 * Writes gutters straight onto the shells' custom properties so a trial shows up
 * without a rebuild. React owns that style attribute, so the next re-render puts
 * its own values back — this is a probe, not a setting.
 */
function applyLiveSpacing(spacing: Partial<ShellSpacing>): void {
  for (const root of shellRoots) {
    const set = (edge: keyof ShellSpacing, prop: string) => {
      const value = spacing[edge];
      if (typeof value === 'number') root.style.setProperty(prop, `${value}px`);
    };
    set('top', '--fluentShellPadTop');
    set('right', '--fluentShellPadRight');
    set('bottom', '--fluentShellPadBottom');
    set('left', '--fluentShellPadLeft');
  }
}

declare global {
  interface Window {
    __fluentShell?: ShellDebugApi;
  }
}

/**
 * Exposes the debug API on this window, and on the host window when it is
 * same-origin. The mirror matters more than it looks: DevTools opens on the top
 * frame, and reaching a web resource's own window means knowing to switch the
 * console's context dropdown first. With the mirror, `__fluentShell.report()`
 * works from the console you already have open.
 */
function installShellDebugApi(win: Window = window): () => void {
  const api = buildDebugApi(win);
  const installed: Window[] = [win];
  win.__fluentShell = api;

  for (const host of [win.parent, win.top]) {
    try {
      if (host && host !== win && !host.__fluentShell) {
        host.__fluentShell = api;
        installed.push(host);
      }
    } catch {
      // Cross-origin host — the in-frame handle is all we get.
    }
  }

  // Removed on unmount. In an app this leak is invisible; in a library, a
  // component that mounts and unmounts would leave the host window holding a
  // handle onto a dead frame, and the next mount would decline to replace it.
  return () => {
    for (const target of installed) {
      try {
        if (target.__fluentShell === api) delete target.__fluentShell;
      } catch {
        // Host went away or turned cross-origin; nothing to clean up.
      }
    }
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    // The gutters arrive as custom properties because they are resolved at
    // runtime and Griffel can only emit static rules. Longhands, not the
    // `padding` shorthand, so a caller's own class can override a single side.
    paddingTop: 'var(--fluentShellPadTop, 0px)',
    paddingRight: 'var(--fluentShellPadRight, 0px)',
    paddingBottom: 'var(--fluentShellPadBottom, 0px)',
    paddingLeft: 'var(--fluentShellPadLeft, 0px)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    // `100%`, never `100vh`: inside a form iframe the visual viewport can be
    // taller than the frame, and `vh` then pushes the app into a second scrollbar.
    width: '100%',
    height: '100%',
    // Lets a flex child scroll instead of forcing this box to grow.
    minHeight: 0,
    position: 'relative',
  },
  clip: {
    // Children opt into scrolling, so the host is never handed a second set of
    // scrollbars wrapped around the first.
    overflow: 'hidden',
  },
  scroll: {
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  opaque: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  debugOutline: {
    outlineWidth: '1px',
    outlineStyle: 'dashed',
    outlineColor: tokens.colorPaletteRedBorder2,
    outlineOffset: '-1px',
  },
  // Container guides. Literal red rather than a theme token: these are a
  // measuring instrument, and a token that dims under a dark or high-contrast
  // theme would make the line harder to see exactly when it is being relied on.
  containerLine: {
    position: 'absolute',
    zIndex: 9998,
    pointerEvents: 'none',
    outlineWidth: '1px',
    outlineOffset: '-1px',
    outlineColor: '#d13438',
  },
  // The shell root fills the iframe, so its own box is the iframe's inner edge.
  containerFrameEdge: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    outlineStyle: 'solid',
  },
  // Stamps the build onto the guides. The whole reason to draw them is to judge
  // a deployed web resource, where the one thing that is never obvious is which
  // version of the shell is actually live — a cached bundle looks identical to
  // a fresh one until the numbers disagree with the code.
  containerVersion: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9998,
    pointerEvents: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    paddingTop: '1px',
    paddingBottom: '1px',
    paddingLeft: '4px',
    paddingRight: '4px',
    borderBottomRightRadius: '3px',
    backgroundColor: '#d13438',
    color: '#ffffff',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: '9px',
    lineHeight: '12px',
  },
  // Inset by the resolved gutters, read from the same custom properties that
  // apply them — so the guide cannot drift from the padding it is describing.
  containerContentEdge: {
    top: 'var(--fluentShellPadTop, 0px)',
    right: 'var(--fluentShellPadRight, 0px)',
    bottom: 'var(--fluentShellPadBottom, 0px)',
    left: 'var(--fluentShellPadLeft, 0px)',
    outlineStyle: 'dashed',
  },
  // Sits in the padding box itself, so the overlay shows the gutter it describes.
  debugGutter: {
    position: 'absolute',
    backgroundColor: tokens.colorPaletteRedBackground2,
    opacity: 0.35,
    pointerEvents: 'none',
  },
  debugBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: tokens.spacingHorizontalSNudge,
    paddingRight: tokens.spacingHorizontalSNudge,
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

function applyOverride(base: ShellSpacing, override: FluentShellProps['padding']): ShellSpacing {
  if (override === undefined) return base;
  if (typeof override === 'number') return all(override);
  return { ...base, ...override };
}

/**
 * The first element inside a web resource. Place it directly under
 * `FluentProvider` and let it own every outer gutter — the app below should not
 * set its own, or the two compound.
 */
export function FluentShell(props: FluentShellProps) {
  const {
    children,
    surface,
    strategy = 'auto',
    padding,
    background = true,
    overflow = 'clip',
    showContainers = false,
    debug,
    className,
    style,
  } = props;
  const styles = useStyles();
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  // Resolved after mount from the element's own document, so a shell portalled
  // into an iframe measures that frame rather than the window its code happens
  // to run in. Undefined on the first render, which falls back to the global.
  // Mount-only: an element's owning document does not change for its lifetime,
  // so one read after the ref attaches is enough.
  const [shellWindow, setShellWindow] = React.useState<Window | undefined>(undefined);
  React.useEffect(() => {
    setShellWindow(windowOf(rootRef.current?.ownerDocument));
  }, []);

  const detected = useHostSurface(surface, strategy, shellWindow);

  const info = React.useMemo<HostSurfaceInfo>(
    () => ({ ...detected, spacing: applyOverride(detected.spacing, padding) }),
    [detected, padding],
  );

  // Installed unconditionally: the whole point is to be reachable from a console
  // in a deployed org, where the overlay flag has not been set yet.
  React.useEffect(() => installShellDebugApi(shellWindow), [shellWindow]);

  // Registered so live trials address this shell specifically.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    shellRoots.add(el);
    return () => {
      shellRoots.delete(el);
    };
  }, []);

  const overrides = React.useSyncExternalStore(
    subscribeOverlay,
    getOverlayOverrides,
    getOverlayOverrides,
  );
  const showDebug = overrides.debug ?? debug ?? isShellDebugEnabled(shellWindow);
  const showGuides = overrides.containers ?? showContainers;

  React.useEffect(() => {
    if (showDebug) logShellDiagnostics(surface, strategy);
  }, [showDebug, surface, strategy]);

  const cssVars = {
    '--fluentShellPadTop': `${info.spacing.top}px`,
    '--fluentShellPadRight': `${info.spacing.right}px`,
    '--fluentShellPadBottom': `${info.spacing.bottom}px`,
    '--fluentShellPadLeft': `${info.spacing.left}px`,
  } as React.CSSProperties;

  return (
    <ShellContext.Provider value={info}>
      <div
        ref={rootRef}
        data-fluent-shell=""
        className={mergeClasses(
          styles.root,
          overflow === 'scroll' ? styles.scroll : styles.clip,
          background && styles.opaque,
          showDebug && styles.debugOutline,
          className,
        )}
        style={{ ...cssVars, ...style }}
      >
        {showGuides && (
          <>
            <div
              aria-hidden="true"
              className={mergeClasses(styles.containerLine, styles.containerFrameEdge)}
            />
            <div
              aria-hidden="true"
              className={mergeClasses(styles.containerLine, styles.containerContentEdge)}
            />
            <div aria-hidden="true" className={styles.containerVersion}>
              FluentShell v{FLUENT_SHELL_VERSION}
            </div>
          </>
        )}
        {showDebug && <ShellDebugOverlay info={info} styles={styles} />}
        {children}
      </div>
    </ShellContext.Provider>
  );
}

function ShellDebugOverlay({
  info,
  styles,
}: {
  info: HostSurfaceInfo;
  styles: Record<'debugGutter' | 'debugBadge', string>;
}) {
  const { spacing, hostInset } = info;
  const bands: React.CSSProperties[] = [
    { top: 0, left: 0, right: 0, height: spacing.top },
    { bottom: 0, left: 0, right: 0, height: spacing.bottom },
    { top: 0, bottom: 0, left: 0, width: spacing.left },
    { top: 0, bottom: 0, right: 0, width: spacing.right },
  ];

  return (
    <>
      {bands.map((band, i) => (
        <div key={i} className={styles.debugGutter} style={band} />
      ))}
      <div
        className={styles.debugBadge}
        title="Click to log the full FluentShell report to the console"
        onClick={() => logShellDiagnostics()}
      >
        {info.surface}/{info.density} {info.width}px · host{' '}
        {info.measured ? edges(hostInset) : 'cross-origin'} + shell {edges(spacing)} ·{' '}
        {info.basis === 'alignment' ? `aligned to ${info.alignment?.ref}` : 'surface target'} ·{' '}
        {info.reason}
      </div>
    </>
  );
}
