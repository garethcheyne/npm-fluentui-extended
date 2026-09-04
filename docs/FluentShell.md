# FluentShell

The first element inside a Dynamics 365 web resource. It owns every gutter between the host chrome and the app, so nothing below it has to think about the iframe.

```tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { FluentShell } from 'fluentui-extended';

createRoot(root).render(
  <FluentProvider theme={webLightTheme} style={{ height: '100%' }}>
    <FluentShell>
      <App />
    </FluentShell>
  </FluentProvider>
);
```

Nothing below it should set an outer margin or padding. The two compound invisibly — a 4px padding on an inner wrapper makes a stated 12px gutter arrive as 16px on screen, and the discrepancy is close to impossible to spot by eye.

## How the gutters are decided

Two axes, measured separately, because they answer to different things.

**Vertically**, the shell walks up from its own `<iframe>` summing the padding and borders the host already applies, stopping at the first ancestor that clips. That element is the box the control is visually confined to; padding beyond it belongs to the app shell rather than to the control. The shell then adds only the shortfall against the surface's target. Measured on a model-driven form, the control's wrapper supplies 7px above and below, so the shell adds 5 and the app lands on 12.

**Horizontally**, it finds the form's content column and lines its own edges up with it. This cannot be derived from the ancestor walk: on that same form the host contributes nothing on either side, yet the gutters that put the app in line with the form header are 8px left and 20px right. Only the reference column knows that, so the shell asks it.

The invariant behind both: *host contribution + shell contribution lands on the intended gutter*. Anything that breaks it — levelling the two sides to match, say — drifts the app out of line with the form around it.

### The alignment reference

The reference is matched by `id` and `data-id`, never by class. UCI regenerates its atomic class names per build (the same wrapper measured as `pa-kh` in one session and `pa-lv` in the next), so a class-based selector stops resolving silently after an org update.

References are tried in order and the first *usable* reading wins — not merely the first that matches an element. A reference is unusable when it implies a negative gutter, or one beyond 96px: on the 2026 UI the capped-width `form-header` band implies a 424px right gutter, and would otherwise squeeze the app to its width.

A reference measuring flush with the frame (0/0) is a valid answer, not a non-answer: the host card and the frame can legitimately share a column edge.

Alignment uses the reference's **border box**, since what has to line up is our card's visible edge with its visible edge.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | — | The app |
| `surface` | `HostSurface` | *detected* | Pin the surface instead of detecting it |
| `strategy` | `'auto' \| 'align' \| 'target'` | `'auto'` | Align to the form column, or use surface targets |
| `padding` | `number \| Partial<ShellSpacing>` | — | Override the resolved gutters outright |
| `background` | `boolean` | `true` | Paint the neutral page background |
| `overflow` | `'clip' \| 'scroll'` | `'clip'` | Whether the shell itself scrolls |
| `showContainers` | `boolean` | `false` | Red guides on the iframe and content edges, plus a version tag |
| `debug` | `boolean` | *URL/stored flag* | Tint the gutters, show a badge, log the report |
| `className` / `style` | | — | Applied to the shell element |

## Surfaces

| Surface | Detected by | Status |
|---------|-------------|--------|
| `form` | frame id `WebResource_*`, or a record-form host URL | Measured against a live org and tuned |
| `fullPage` | `pagetype=webresource` in the host URL | Targets are estimates |
| `sidePane` | frame inside a side-pane container | Targets are estimates; detection unverified |
| `dialog` | frame inside `[role="dialog"]` | Adds nothing — dialog chrome pads its own body |
| `standalone` | not framed | Dev harness |

Targets and minimums live in the exported `SURFACE_RULES`. The minimums are sized from the card shadow's reach rather than picked: a CSS blur radius B extends roughly B/2 past the box, so `shadow4` reaches about 2px to each side and 4px below.

## Debugging a deployed web resource

`__fluentShell` is installed on the frame's window and mirrored onto the host window when same-origin. That mirror matters more than it looks: DevTools opens on the top frame, and reaching a web resource's own window otherwise means knowing to switch the console's context dropdown first.

```ts
__fluentShell.report();           // decision, measurements, and the applied gutters
__fluentShell.edges();            // how our card edges compare with the form column's
__fluentShell.cards();            // host elements above the frame that actually paint a card
__fluentShell.compare();          // what each strategy would apply right now
__fluentShell.apply({ left: 8 }); // try gutters live, no rebuild
__fluentShell.tryReference('#id');// measure and apply against any selector
__fluentShell.debug(true);        // overlay on, no reload
__fluentShell.containers(true);   // red edge guides + version tag
__fluentShell.reset();            // drop console overrides
```

Values applied this way last until the next re-render — they are a probe, not a setting.

`cards()` is the one to reach for when the alignment looks wrong: it lists every host element above the frame that paints a real `box-shadow`, so the element to align to is identified by what it *draws* rather than by guessing which wrapper in the DOM corresponds to the card on screen.

The overlay can also be switched on by putting `shellDebug` in the host page's URL, which is useful where a form web resource's own URL is built by Dynamics and cannot be edited.

## Hooks and utilities

| Export | Purpose |
|--------|---------|
| `useShellSurface()` | The resolved host and gutters, for children that need to react |
| `useShellBleed(sides)` | Negative margins that cancel the gutters, for edge-to-edge content |
| `detectHostSurface(surface?, strategy?)` | One-shot read, outside React |
| `collectHostChain()` | The measured ancestor chain |
| `measureAlignment()` | The chosen reference and every candidate |
| `collectShellDiagnostics()` | The full serialisable report |
| `logShellDiagnostics()` | The same, printed as a grouped console table |
| `SURFACE_RULES` | Per-surface targets and minimums |

## Requirements and limits

- **Same-origin host.** Standard for D365 web resources. Cross-origin, the frame element and host URL are unreadable, so the shell falls back to its surface targets and reports `measured: false`.
- **Re-measures on window resize.** If the reference column reflows without the frame changing size, the gutters can go stale until the next resize.
- **One surface is verified.** `form` has been measured against a live org; the others carry estimates.
