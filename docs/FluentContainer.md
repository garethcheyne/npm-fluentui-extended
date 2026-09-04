# FluentContainer

A card matching the surface Dynamics 365 draws on a model-driven form. The values are measured from a live form rather than approximated:

```
box-shadow:    rgba(0,0,0,0.12) 0 0 2px, rgba(0,0,0,0.14) 0 2px 4px   /* shadow4 */
border-radius: 8px                                                     /* borderRadiusXLarge */
border:        1px solid transparent
background:    colorNeutralBackground1 on colorNeutralBackground2
```

```tsx
import { FluentContainer } from 'fluentui-extended';

<FluentContainer as="section">
  <DetailsForm />
</FluentContainer>

<FluentContainer fill scrolls="vertical" padding="none">
  <DataGrid />
</FluentContainer>
```

## The transparent border

The border is the detail most often got wrong. D365 declares `1px solid rgba(0, 0, 0, 0)` — it reserves the pixel so the box size is stable, and paints nothing, letting the shadow define the edge.

Drawing a visible hairline there (`colorNeutralStroke2`, say) is a reasonable-sounding instinct — a card needs a boundary where its shadow is subtle — but next to genuine D365 cards it reads as a harder, foreign edge. The two sit side by side on a form, so the difference is visible.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | — | Card content |
| `scrolls` | `'visible' \| 'clip' \| 'vertical' \| 'horizontal' \| 'both'` | `'visible'` | Whether this card clips or scrolls its content |
| `padding` | `'none' \| 'compact' \| 'comfortable'` | `'comfortable'` | Inner spacing |
| `fill` | `boolean` | `false` | Fill remaining space in a flex column rather than sizing to content |
| `flat` | `boolean` | `false` | Drop the shadow, for a card nested inside another |
| `as` | `'div' \| 'section' \| 'article' \| 'aside'` | `'div'` | Rendered element |
| `className` / `style` | | — | Applied to the card |

## Why clipping is opt-in

A card's shadow is painted **outside** its border box. Any ancestor that clips at the card's own bounds erases it — and a wrapper sized to its content is exactly such an ancestor, which makes this easy to introduce by accident.

The resulting bug is unusually hard to see. The card still looks fine; it is just slightly flat on one side. The cause is typically a `overflow: hidden` several levels up, and no amount of padding further out can rescue it, because the clip is *inside* that padding.

So `scrolls` defaults to `visible`, and clipping belongs on the element that genuinely owns a scroll region:

```tsx
// The grid card owns its scroll region, so it clips.
<FluentContainer fill scrolls="vertical" padding="none">
  <DataGrid />
</FluentContainer>
```

In development the container measures its nearest clipping ancestor after paint and warns when the clearance is smaller than the shadow's reach, naming the element and the sides being shaved:

```
[FluentContainer] The card's shadow is being clipped on: left, right.
The nearest clipping ancestor is: <div class="...">
It has overflow: hidden/hidden and leaves too little clearance for the shadow.
```

The check is written against the literal `process.env.NODE_ENV`, so bundlers fold it away and it drops out of production builds entirely.

## Pairing with FluentShell

[`FluentShell`](FluentShell.md) supplies the gutter the shadow needs. A card flush against an iframe's edge loses its shadow outright: the frame is a hard clip and there is no room outside it to paint into. This is why the shell keeps a minimum gutter even when the host's own column measures flush — the minimum is sized from the shadow's reach, not chosen for looks.
