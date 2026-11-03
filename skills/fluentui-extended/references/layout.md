# Layout and hosting in Dynamics

A web resource runs in an iframe inside D365 chrome. Four exports make it sit like native UI, plus a dev setup that reproduces the org locally.

| Export | Role | Where it goes |
| --- | --- | --- |
| `FluentShell` | Owns every gutter between host chrome and app | Outermost element of the web resource, directly inside `FluentProvider` |
| `FluentContainer` | The D365 form card surface (shadow4, 8px radius, transparent border) | Each card/section inside the shell |
| `ParentPortal` / `useParentPortalMount` | Render dialogs/overlays into the **parent** D365 document | Around overlay content |
| `D365TestHarness` | Local stand-in for the form that will host the iframe | Wraps the shell in `main.tsx`; inert outside localhost |

Canonical tree:

```tsx
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { D365TestHarness, FluentShell, FluentContainer } from 'fluentui-extended';

createRoot(document.getElementById('root')!).render(
  <FluentProvider theme={webLightTheme} style={{ height: '100%' }}>
    <D365TestHarness recordName="Boomer iMAC" entityName="Price List">
      <FluentShell>
        <FluentContainer as="section">{/* header fields */}</FluentContainer>
        <FluentContainer fill scrolls="vertical" padding="none">{/* DataGrid */}</FluentContainer>
      </FluentShell>
    </D365TestHarness>
  </FluentProvider>,
);
```

`index.html` must let the app fill the frame:

```html
<style>html, body, #root { margin: 0; padding: 0; height: 100%; overflow: hidden; }</style>
```

---

## FluentShell

The first element inside the web resource. Measures what the host already pads and where the form's content column sits, then adds only the difference, so the app lines up with the native form header. Re-measures on window resize.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `children` | `ReactNode` | – | The app |
| `surface` | `'form'\|'fullPage'\|'sidePane'\|'dialog'\|'standalone'` | detected | Pin when deployed one way only, or host is cross-origin |
| `strategy` | `'auto'\|'align'\|'target'` | `'auto'` | `auto` aligns to the form column when found, else surface target |
| `padding` | `number \| Partial<{top,right,bottom,left}>` | – | Overrides resolved gutters outright (number = all sides) |
| `background` | `boolean` | `true` | Paints `colorNeutralBackground2` (page ground); `false` inherits host |
| `overflow` | `'clip'\|'scroll'` | `'clip'` | `clip` = children own scrolling; `scroll` = shell scrolls vertically |
| `showContainers` | `boolean` | `false` | Red guides on frame edge + content edge, version tag |
| `debug` | `boolean` | URL `shellDebug` / stored flag | Tints gutters, badge, logs report |
| `className` / `style` | | – | On the shell element |

Rendered as a flex column, `width: 100%; height: 100%` (never `100vh`), `min-height: 0`, padding from CSS vars `--fluentShellPad{Top,Right,Bottom,Left}`.

### Rules

- **Nothing below the shell sets an outer margin or padding.** The two compound invisibly: a 4px wrapper padding turns a 12px gutter into 16px. Let the shell own the edges.
- Give `FluentProvider` `style={{ height: '100%' }}` – otherwise the shell's `100%` resolves against nothing.
- Use `overflow="clip"` (default) and put the scroll region on one child (`FluentContainer scrolls="vertical"`, a `DataGrid`), so the host never gets nested scrollbars.
- For edge-to-edge content (a full-bleed banner), cancel the gutters instead of fighting them: `const bleed = useShellBleed(['left','right'])` → `<div style={bleed}>`.

### Surfaces (`SURFACE_RULES`)

| Surface | Detected by | Target (comfortable / compact <600px) | Status |
| --- | --- | --- | --- |
| `form` | frame id `WebResource_*` or record-form host URL | 12 / 8 all sides | Measured against a live org |
| `fullPage` | `pagetype=webresource` in host URL | 12·20·20·20 / 8·12·12·12 (T·R·B·L) | Estimate |
| `sidePane` | frame inside a side-pane container | 12 / 8 | Estimate, detection unverified |
| `dialog` | frame inside `[role="dialog"]` | 0 | Dialog pads its own body |
| `standalone` | not framed | 24 / 12 | Bare dev server |

Density comes from the **iframe's** width (<600px = compact), not the browser window.

### Hooks and utilities

| Export | Signature / purpose |
| --- | --- |
| `useShellSurface()` | `HostSurfaceInfo` (`surface, density, target, hostInset, spacing, basis, alignment, measured, width, embedded, reason`). Throws outside `<FluentShell>` |
| `useShellBleed(sides = ['left','right'])` | `CSSProperties` of negative margins |
| `useHostSurface(surface?, strategy?, win?)` / `detectHostSurface(surface?, strategy?, win?)` | Detection without a shell / outside React |
| `collectHostChain`, `measureAlignment`, `readAlignmentAgainst`, `collectShellDiagnostics`, `logShellDiagnostics`, `isShellDebugEnabled` | Diagnostics |
| `FLUENT_SHELL_VERSION`, `SURFACE_RULES` | Constants |

### Dynamics behaviour

- Same-origin host required for measurement (normal for web resources). Cross-origin it falls back to surface targets and reports `measured: false`.
- Vertical: walks up from its `<iframe>` summing host padding/borders until the first clipping ancestor, then adds the shortfall (live form: host gives 7px, shell adds 5 → 12).
- Horizontal: aligns to the form content column (live form: 8px left, 20px right). References are matched by `id` / `data-id`, never by UCI's regenerated class names; readings implying a negative gutter or >96px are rejected.
- Minimum gutters are sized from the card shadow's reach, so a `FluentContainer` shadow is never clipped by the frame edge.
- Console probe in a deployed org (mirrored onto the host window, so no context switch in DevTools): `__fluentShell.report()`, `.edges()`, `.cards()`, `.compare()`, `.apply({ left: 8 })`, `.tryReference('#id')`, `.debug(true)`, `.containers(true)`, `.reset()`. Applied values last until the next re-render. Add `shellDebug` to the host URL to turn the overlay on where the web resource URL is not editable.

---

## FluentContainer

The card surface D365 draws on a model-driven form: `colorNeutralBackground1`, `shadow4`, `borderRadiusXLarge` (8px), and a **transparent** 1px border, on the shell's `colorNeutralBackground2` ground. Use it for every card; do not hand-roll cards with a visible `colorNeutralStroke2` hairline (reads as a foreign edge next to real D365 cards).

```tsx
<FluentContainer as="section">
  <Field label="Name"><Input /></Field>
</FluentContainer>

<FluentContainer fill scrolls="vertical" padding="none">
  <DataGrid data={rows} columns={columns} getRowId={(r) => r.id} />
</FluentContainer>
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `children` | `ReactNode` | – | |
| `scrolls` | `'visible'\|'clip'\|'vertical'\|'horizontal'\|'both'` | `'visible'` | Clip/scroll only on the card that owns a scroll region |
| `padding` | `'none'\|'compact'\|'comfortable'` | `'comfortable'` | compact = `spacingVerticalS`/`HorizontalS`; comfortable = `M`/`M`; `none` for grids that own their layout |
| `fill` | `boolean` | `false` | `flex: 1 1; min-height: 0` – the last card in the column (grid, list). Otherwise the card is `flex-shrink: 0` |
| `flat` | `boolean` | `false` | No shadow – for a card nested inside another |
| `as` | `'div'\|'section'\|'article'\|'aside'` | `'div'` | |
| `className` / `style` | | – | |

Also exported: `SHADOW_REACH = { top: 1, right: 2, bottom: 4, left: 2 }`.

### Dynamics behaviour

- The card is a flex column with `min-height: 0`, so a filling child can scroll.
- The shadow paints **outside** the box. Any ancestor with `overflow: hidden` sitting on the card's edge shaves it (card looks slightly flat on one side). Hence `scrolls` defaults to `visible`.
- In development it measures the nearest clipping ancestor after paint and `console.warn`s `[FluentContainer] The card's shadow is being clipped on: …` naming the element. Stripped from production builds (`process.env.NODE_ENV`).
- Do not add margins between the shell and the first card; use a `gap` on a flex wrapper between cards if needed, and keep the wrapper `overflow: visible`.

---

## ParentPortal

Renders Fluent content into `window.parent.document` so dialogs and overlays float over the whole D365 page instead of being trapped (and scroll-barred) inside the iframe. Fluent v9 has no cross-frame portal: Griffel injects styles into the iframe's `<head>`, so `ParentPortal` mirrors the CSSOM rules and theme tokens to the parent.

| Prop (both APIs) | Type | Default |
| --- | --- | --- |
| `children` (`ParentPortal` only) | `ReactNode` | required |
| `containerId` | `string` | `'fluentui-extended-parent-portal-root'` |
| `syncStyles` | `boolean` | `true` – mirror Griffel CSSOM rules to parent `<head>` |
| `syncTokens` | `boolean` | `true` – copy `--color…` custom properties from the iframe's `.fui-FluentProvider` |
| `syncInterval` | `number` (ms) | `300` – re-sync for lazily inserted rules (plus a `MutationObserver`) |
| `containerStyles` | `string` (CSS) | built-in fixed, full-viewport, `z-index: 100000`, centred |

Two APIs:

```tsx
import { Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent } from '@fluentui/react-components';
import { ParentPortal, useParentPortalMount } from 'fluentui-extended';

// A. Dialogs: hand the parent mount node to Fluent's own portal (the source's recommendation).
function ConfirmDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mountNode = useParentPortalMount();
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface mountNode={mountNode}>
        <DialogBody><DialogTitle>Delete lines?</DialogTitle><DialogContent>…</DialogContent></DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

// B. Non-portal content (a toast strip, a custom overlay): wrap it.
<ParentPortal><div className={styles.banner}>Saved</div></ParentPortal>;
```

### Dynamics behaviour

- **Same-origin required.** If `window.parent` is the same window (not framed) or is cross-origin (access throws), both APIs fall back: `ParentPortal` renders children in place, `useParentPortalMount` returns `undefined` (Fluent then uses its default portal).
- `ParentPortal`'s own `FluentProvider` takes no theme of its own: through React context it inherits the app's theme, dark or custom. The container it creates (and its stylesheet) is removed when the last portal using it unmounts; a container you supplied by id is left alone.
- The container is `pointer-events: none` with `pointer-events: auto` on its descendants, so the D365 page stays clickable around the overlay.
- Avoids D365's auto-height iframe growing (and adding scrollbars) when a dialog opens.

---

## D365TestHarness

Local stand-in for the model-driven form. Hosts children in a **real same-origin iframe** named `WebResource_harness` (so `FluentShell` detects `form`) and reproduces the measured geometry (`HARNESS_GEOMETRY`: 7px vertical padding on the clipping frame wrapper, header card inset 8px left / 20px right), so the shell resolves the same gutters locally as in the org.

**Inactive outside a local host**: with `active` unset it renders `children` alone unless the hostname is `localhost`, `127.0.0.1`, `::1`, `[::1]`, `0.0.0.0`, `*.local`, `*.localhost`, or the protocol is `file:`. The same tree ships to Dynamics unchanged.

| Prop | Type | Default |
| --- | --- | --- |
| `children` | `ReactNode` | – |
| `active` | `boolean` | local-host check |
| `recordName` | `string` | `'Sample record'` |
| `entityName` | `string` | `'Entity'` |
| `saved` | `boolean` | `true` ("- Saved" flag) |
| `tabs` | `string[]` | `['General', 'Related']` (first selected) |
| `commands` | `string[]` | `['Save', 'Save & Close', 'New']` – decorative, not wired |
| `status` | `[value, label]` | `['Active', 'Status']` |
| `orgName` / `appName` / `userInitials` | `string` | `'CONTOSO'` / `'Sales Hub'` / `'GC'` |
| `notification` | `ReactNode` | – (strip under top bar) |
| `navGroups` | `D365NavGroup[]` (`{ label?, items: { label, icon?, selected?, onClick? }[] }`) | Sales-app sitemap |
| `hideNav` | `boolean` | `false` |
| `theme` | Fluent `Theme` | `webLightTheme` – applied **inside** the frame |
| `onFrameReady` | `(doc: Document) => void` | – |

Sitemap items with `onClick` render as buttons, so the nav can drive a component gallery; items without it are inert text.

### Dynamics behaviour

- Content is rendered into the frame through `RendererProvider(createDOMRenderer(frameDoc))` + `FluentProvider targetDocument` – real styling, no mirroring. While active, the app's theme is the harness `theme` prop, not the outer `FluentProvider`'s; pass the same theme to both.
- Layout only: **no `Xrm`**. Guard with `typeof Xrm !== 'undefined'` or stub it.
- Only the `form` surface is simulated. Do not edit `HARNESS_GEOMETRY`-derived values; they are what make local predict production.

---

## Local development against a real org

Two gaps on a bare dev server: no chrome (fixed by `D365TestHarness`) and no Dataverse – the browser calling `https://yourorg.crm.dynamics.com` from `localhost` hits CORS and has no token. Fix: a dev-server proxy that mints a token and forwards `/api/data/v9.2/*`, so the app only calls its own origin with the same path it uses in the org.

### Auth choice

| | Client credentials (what this repo uses) | User token (auth code / MSAL) |
| --- | --- | --- |
| Runs as | An application user | The signed-in developer |
| Security | App user's role – RLS, field security, "my" views will differ from real users | Exactly what that person sees |
| Setup | App registration + secret | App registration + redirect URI, interactive sign-in |

Client-credentials setup: app registration with the **Dynamics CRM** permission + admin consent, then an **application user** in the org (Power Platform admin centre → Environment → Users → Application users) with a security role. Missing app user = 401 on every call even though a token is issued.

### `.env` (beside `vite.config.ts`, git-ignored)

```ini
VITE_DYNAMICS_URL=https://yourorg.crm.dynamics.com
VITE_AZURE_TENANT_ID=00000000-0000-0000-0000-000000000000
VITE_AZURE_CLIENT_ID=00000000-0000-0000-0000-000000000000
D365_CLIENT_SECRET=your-client-secret
```

**Never prefix a secret with `VITE_`.** Vite exposes every `VITE_*` variable to client code via `import.meta.env` and bakes it into `vite build`. Read unprefixed names in the plugin with `loadEnv(mode, dir, '')`. The secret is then read only in the dev server's proxy and never reaches the browser.

### Vite proxy plugin

```ts
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function dynamicsProxy(): Plugin {
  let env: Record<string, string>;
  let token: string | null = null;
  let expiresAt = 0;

  async function getToken(): Promise<string> {
    if (token && Date.now() < expiresAt - 300_000) return token; // reuse until 5 min before expiry
    const org = env.VITE_DYNAMICS_URL.replace(/\/$/, '');
    const res = await fetch(`https://login.microsoftonline.com/${env.VITE_AZURE_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.VITE_AZURE_CLIENT_ID,
        client_secret: env.D365_CLIENT_SECRET,
        scope: `${org}/.default`,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description ?? data.error);
    token = data.access_token;
    expiresAt = Date.now() + data.expires_in * 1000;
    return token!;
  }

  return {
    name: 'dynamics-proxy',
    configResolved(config) {
      env = loadEnv(config.mode, config.envDir || process.cwd(), ''); // '' = include unprefixed
    },
    configureServer(server) {
      server.middlewares.use('/api/data/v9.2', async (req, res) => {
        try {
          const org = env.VITE_DYNAMICS_URL.replace(/\/$/, '');
          const upstream = await fetch(`${org}/api/data/v9.2${req.url}`, {
            method: req.method,
            headers: {
              Authorization: `Bearer ${await getToken()}`,
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
              Accept: req.headers.accept ?? 'application/json',
              'Content-Type': 'application/json',
              // Forward Prefer: EntityGrid/DataGrid rely on odata.maxpagesize and FormattedValue annotations.
              ...(req.headers.prefer ? { Prefer: String(req.headers.prefer) } : {}),
            },
          });
          const type = upstream.headers.get('content-type') ?? 'application/json';
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', type);
          if (/^(image|audio|video|application\/octet-stream)/.test(type)) {
            res.end(Buffer.from(await upstream.arrayBuffer())); // binary (entity images) must not go through text()
          } else {
            res.end(await upstream.text());
          }
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    },
  };
}

export default defineConfig({ plugins: [react(), dynamicsProxy()], server: { port: 5173 } });
```

Not handled above: request bodies (`POST`/`PATCH` are forwarded without a body – add body piping before relying on writes), and absolute `@odata.nextLink` URLs, which point at the org origin and will hit CORS if followed from `localhost`.

### Point the library at the proxy

```ts
import { setWebApiBaseUrl } from 'fluentui-extended';

setWebApiBaseUrl(import.meta.env.DEV ? '/api/data/v9.2' : `${window.location.origin}/api/data/v9.2`);
```

| Client | Configured by |
| --- | --- |
| `webApiGet` and everything on it (EntityGrid, `useEntityColumns`, QueryBuilder, metadata-aware Lookup/OptionSetField/DateTimeField, personas, hover cards) | `setWebApiBaseUrl(url)` (default `'/api/data/v9.2'`, trailing slashes stripped), `setWebApiFetch(fetchImpl)` to supply your own authenticated transport |

### Troubleshooting

| Symptom | Cause |
| --- | --- |
| `401` on every call, token issued fine | No application user for the app registration, or no security role on it |
| `FluentShell` reports `surface: standalone` | Not wrapped in `D365TestHarness`, or harness inactive (host not local) |
| CORS error | App calls the org URL directly instead of the proxy path – check `setWebApiBaseUrl`, or a followed `@odata.nextLink` |
| Lookups show GUIDs / option sets show ints locally only | Proxy dropped the `Prefer` header |
| Entity images corrupt, personas fall back to initials | Proxy read a binary body as text, or forced `Accept: application/json` |
| Secret visible in `import.meta.env` | It is `VITE_`-prefixed – rename, load with empty `loadEnv` prefix |
| Secret rotated, still failing | Token cached in plugin memory – restart the dev server |
