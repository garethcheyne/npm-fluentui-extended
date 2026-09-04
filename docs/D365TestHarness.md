# D365TestHarness

A local stand-in for the Dynamics 365 form that will host a web resource.

```tsx
import { D365TestHarness, FluentShell } from 'fluentui-extended';

createRoot(root).render(
  <D365TestHarness recordName="Boomer iMAC" entityName="Price List">
    <FluentShell>
      <App />
    </FluentShell>
  </D365TestHarness>
);
```

Inactive outside a local host by default, where it renders `children` alone — so the same tree ships to the org without being unwrapped.

## Why it exists

A web resource in the org is an iframe inside a particular arrangement of chrome. Components that *measure* that chrome — [`FluentShell`](FluentShell.md) above all — have nothing to measure on a bare dev server: `window.frameElement` is null, there is no form header to align to, and the shell falls back to its standalone behaviour. The layout being developed is then not the layout that ships, and the difference only appears after a deploy.

So the harness does two things a decorative mock would not:

1. **Hosts the app in a genuine same-origin iframe.** `window.frameElement`, the ancestor walk, the alignment reference and the parent-window debug mirror all work exactly as they will in Dynamics. The frame is called `WebResource_harness`, which is what makes `FluentShell` detect the `form` surface.
2. **Reproduces the measured geometry.** The wrapper around the frame applies 7px above and below and clips; the header card sits 8px inside the frame's left edge and 20px inside its right. Those are the numbers a live model-driven form measures, so `FluentShell` resolves the same gutters locally that it resolves in the org.

Those values are exported as `HARNESS_GEOMETRY`. Changing them makes local development stop predicting production, which is the one thing the harness is for.

## How the frame is rendered

Content goes into the frame through Fluent's own cross-document support — a Griffel renderer created against the frame's document, and a `FluentProvider` bound to it:

```tsx
<RendererProvider renderer={createDOMRenderer(frameDoc)} targetDocument={frameDoc}>
  <FluentProvider theme={theme} targetDocument={frameDoc}>{children}</FluentProvider>
</RendererProvider>
```

Styling inside the frame is therefore real rather than mirrored — no stylesheet copying, no sync interval, and no drift between what the frame shows and what the app declares. (This is the opposite direction to [`ParentPortal`](../README.md#parentportal), which pushes content *out* of an iframe into the host document.)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | — | The web resource under development |
| `active` | `boolean` | *local host detected* | Render the chrome. Off elsewhere, so the wrapper is a no-op in the org |
| `recordName` | `string` | `'Sample record'` | Record title in the header |
| `entityName` | `string` | `'Entity'` | Line under the title |
| `saved` | `boolean` | `true` | Shows the "- Saved" flag beside the title |
| `tabs` | `string[]` | `['General', 'Related']` | Tab labels; the first renders as selected |
| `commands` | `string[]` | `['Save', 'Save & Close', 'New']` | Command labels — decorative |
| `status` | `[value, label]` | `['Active', 'Status']` | Status field at the right of the header |
| `orgName` | `string` | `'CONTOSO'` | Organisation branding in the top bar |
| `appName` | `string` | `'Sales Hub'` | App name beside the product name |
| `userInitials` | `string` | `'GC'` | Initials in the top-right avatar |
| `notification` | `React.ReactNode` | — | Strip under the top bar |
| `navGroups` | `D365NavGroup[]` | *a Sales-app sitemap* | Sitemap groups in the left nav |
| `hideNav` | `boolean` | `false` | Hide the left nav, for a wider content area |
| `theme` | `Theme` | `webLightTheme` | Applied inside the frame |
| `onFrameReady` | `(doc: Document) => void` | — | Called with the frame's document once ready |

## Driving it from the sitemap

`navGroups` entries take an `onClick`, which renders them as buttons. That makes the sitemap usable
as the app's actual navigation — the library's own harness uses it this way, with each component
example as a sitemap entry and the selected one rendering inside the form:

```tsx
<D365TestHarness
  recordName={active.label}
  entityName="Component example"
  navGroups={[
    {
      label: 'Components',
      items: examples.map((e) => ({
        label: e.label,
        icon: e.icon,
        selected: e.id === activeId,
        onClick: () => setActiveId(e.id),
      })),
    },
  ]}
>
  {renderActiveExample()}
</D365TestHarness>
```

Entries without `onClick` render as inert text rather than as dead buttons.

## Host detection

`active` defaults to a hostname check: `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, any `.local` or `.localhost` suffix, or a `file:` URL. Hostname rather than a build flag, so no bundler configuration is needed and the behaviour is the same in every toolchain.

Pass `active` explicitly to override — `active` to force the chrome on (useful in a component gallery), or `active={false}` to disable it in a local test.

## Setting it up in your own project

Wrapping the app is one half. The other is a dev-server proxy, without which the browser cannot
reach Dataverse from `localhost` — CORS blocks it and there is no token. See
[Local development against Dynamics 365](local-development.md) for the `.env` variables, the Vite
plugin, the app-registration steps, and a warning about which of those variables may carry the
`VITE_` prefix.

## Limits

- The chrome is a **layout** stand-in, not a functional one. Commands and tabs do not do anything, and no `Xrm` is provided — mock that separately if the app needs it.
- Only the `form` surface is simulated. A full-page web resource or a side pane would need different chrome.
