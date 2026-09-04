# Local development against Dynamics 365

Running a web resource on a dev server is not the same as running it in the org, in two ways that both need setting up:

1. **There is no D365 chrome** — no iframe, no form header, no sitemap. Components that measure the host have nothing to measure, so `FluentShell` falls back to standalone behaviour and the layout you develop is not the layout that ships. [`D365TestHarness`](D365TestHarness.md) supplies that.
2. **There is no Dataverse** — a browser calling `https://yourorg.crm.dynamics.com` from `localhost` is blocked by CORS, and has no token. A dev-server proxy supplies that.

This page covers the second, plus what to put in `.env` and how to wire it into `vite.config.ts`.

## 1. Wrap the app

```tsx
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { D365TestHarness, FluentShell } from 'fluentui-extended';

createRoot(document.getElementById('root')!).render(
  <FluentProvider theme={webLightTheme} style={{ height: '100%' }}>
    <D365TestHarness recordName="Boomer iMAC" entityName="Price List">
      <FluentShell>
        <App />
      </FluentShell>
    </D365TestHarness>
  </FluentProvider>,
);
```

The harness disables itself off a local host, so this tree ships to Dynamics unchanged — the wrapper becomes a pass-through and `FluentShell` measures the real chrome instead of the simulated one.

Your `index.html` needs the app to be able to fill the frame:

```html
<style>
  html, body, #root { margin: 0; padding: 0; height: 100%; overflow: hidden; }
</style>
```

## 2. Why a proxy, and which kind

The browser cannot call Dataverse directly from `localhost`: the Web API sends no CORS headers for your dev origin, and the browser has no token for it. The fix is to keep both concerns on the dev server — it mints a token and forwards the request, so the app only ever calls its own origin.

Two ways to get a token, and the choice matters:

| | Client credentials | User (auth code / MSAL) |
|---|---|---|
| Who the calls run as | An application user | The signed-in developer |
| Sees | Everything that app user's role allows | Exactly what that person can see |
| Setup | App registration + secret | App registration + redirect URI, interactive sign-in |
| Risk | A secret on disk that impersonates a service account | No secret; the token is the developer's own |

Client credentials are simpler and are what the harness in this repo uses. Be aware of what it means: **the app runs as an application user, not as you**, so row-level security, field security and "assigned to me" views will not behave the way they will for a real user. If that matters to what you are building, use a user-token flow instead.

## 3. The environment file

Create `.env` next to your Vite config, and make sure it is git-ignored:

```ini
# .gitignore
.env
.env.local
.env.*.local
```

```ini
# Dataverse instance, no trailing slash
VITE_DYNAMICS_URL=https://yourorg.crm.dynamics.com

# Azure AD app registration.
# Public — safe to expose to the browser.
VITE_AZURE_TENANT_ID=00000000-0000-0000-0000-000000000000
VITE_AZURE_CLIENT_ID=00000000-0000-0000-0000-000000000000

# Secret — deliberately NOT VITE_-prefixed. See the warning below.
D365_CLIENT_SECRET=your-client-secret
```

> ### The `VITE_` prefix is a disclosure decision, not a naming convention
>
> Vite exposes **every** `VITE_`-prefixed variable to client code through `import.meta.env`. That is the documented purpose of the prefix: it is the opt-in that says "this is safe for the browser to see".
>
> So a client secret named `VITE_AZURE_CLIENT_SECRET` is readable in the browser, and would be baked into the bundle by `vite build`. Give secrets a name **without** the prefix and read them with `loadEnv(mode, dir, '')`, which loads everything regardless of prefix — that keeps them in the Node process where the proxy runs.
>
> The harness in this repository currently uses the prefixed name. It is local-only, so the exposure is to your own browser, but do not copy that part of the pattern into a project you will build for hosting.

The app registration needs the **Dynamics CRM** application permission for client credentials, admin consent, and an **application user** created in the org (Power Platform admin centre → Environment → Users → Application users) with a security role. Without that last step every call returns 401 even though the token is issued.

## 4. The Vite plugin

A dev-server plugin that mints a token, caches it, and forwards `/api/data/v9.2/*` to the org. The app then calls `/api/data/v9.2/accounts?...` on its own origin — the same path shape it will use in the org, so no code changes between local and deployed.

```ts
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function dynamicsProxy(): Plugin {
  let env: Record<string, string>;
  let token: string | null = null;
  let expiresAt = 0;

  async function getToken(): Promise<string> {
    // Re-use until five minutes before expiry, so a long session does not mint
    // a token per request and a request never starts with one about to lapse.
    if (token && Date.now() < expiresAt - 300_000) return token;

    const url = `${env.VITE_DYNAMICS_URL.replace(/\/$/, '')}`;
    const res = await fetch(
      `https://login.microsoftonline.com/${env.VITE_AZURE_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: env.VITE_AZURE_CLIENT_ID,
          client_secret: env.D365_CLIENT_SECRET,
          scope: `${url}/.default`,
        }),
      },
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description ?? data.error);

    token = data.access_token;
    expiresAt = Date.now() + data.expires_in * 1000;
    return token;
  }

  return {
    name: 'dynamics-proxy',
    configResolved(config) {
      // Empty prefix: loads unprefixed names too, so the secret can stay out of
      // the client bundle.
      env = loadEnv(config.mode, config.envDir ?? process.cwd(), '');
    },
    configureServer(server) {
      server.middlewares.use('/api/data/v9.2', async (req, res) => {
        try {
          const target = `${env.VITE_DYNAMICS_URL.replace(/\/$/, '')}/api/data/v9.2${req.url}`;
          const upstream = await fetch(target, {
            method: req.method,
            headers: {
              Authorization: `Bearer ${await getToken()}`,
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          });
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
          res.end(await upstream.text());
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), dynamicsProxy()],
  // Dev only: in the org the web resource is served from the Dataverse origin,
  // so these paths resolve without a proxy.
  server: { port: 5173 },
});
```

Point the library's Web API client at that path so it uses the proxy in dev and the org origin when deployed:

```ts
import { setWebApiBaseUrl } from 'fluentui-extended';

setWebApiBaseUrl(import.meta.env.DEV ? '/api/data/v9.2' : `${window.location.origin}/api/data/v9.2`);
```

The body of a `POST`/`PATCH` is not forwarded by the handler above — it reads only the method and URL. Add body piping before you rely on writes; reads are what a harness usually needs.

## 5. What the harness does not give you

- **No `Xrm`.** The harness reproduces layout, not the client API. `Xrm.Page`, `Xrm.Navigation`, `Xrm.WebApi` are all absent, so guard any use of them (`typeof Xrm !== 'undefined'`) or stub them yourself.
- **Only the form surface.** A full-page web resource, a side pane and a dialog all have different chrome, and only the form is simulated.
- **The proxy runs as an application user**, not as you — see the table above.
- **Client-credential tokens do not expire the session.** If you rotate the secret, restart the dev server; the token is cached in the plugin's memory.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `401` on every call, token issued fine | No application user in the org for that app registration, or no security role on it |
| `FluentShell` reports `surface: standalone` | Not wrapped in `D365TestHarness`, or the harness is inactive because the host is not local |
| CORS error in the console | The app is calling the org URL directly rather than the proxy path — check `setWebApiBaseUrl` |
| Proxy returns `Dynamics URL not configured` | `.env` is not beside the Vite config, or `envDir` does not point at it |
| Secret appears in `import.meta.env` | It is `VITE_`-prefixed — rename it and read it with an empty `loadEnv` prefix |
