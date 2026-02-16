import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Token cache for server-side
let cachedToken: string | null = null;
let tokenExpiry = 0;

// Plugin to handle OAuth and proxy Dynamics API calls (avoids CORS issues)
function dynamicsAuthPlugin(): Plugin {
  let env: Record<string, string>;

  const getToken = async (): Promise<string> => {
    // Return cached token if still valid (with 5 min buffer)
    if (cachedToken && Date.now() < tokenExpiry - 300000) {
      return cachedToken;
    }

    const tenantId = env.VITE_AZURE_TENANT_ID;
    const clientId = env.VITE_AZURE_CLIENT_ID;
    const clientSecret = env.VITE_AZURE_CLIENT_SECRET;
    const dynamicsUrl = env.VITE_DYNAMICS_URL?.replace(/\/$/, '');

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: `${dynamicsUrl}/.default`,
      grant_type: 'client_credentials',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || data.error);
    }

    cachedToken = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000;
    return cachedToken;
  };

  return {
    name: 'dynamics-auth',
    configResolved(config) {
      // Load env vars from the testHarness directory
      env = loadEnv(config.mode, __dirname, 'VITE_');
    },
    configureServer(server) {
      // Token endpoint
      server.middlewares.use('/api/dynamics-token', async (req, res) => {
        const tenantId = env.VITE_AZURE_TENANT_ID;
        const clientId = env.VITE_AZURE_CLIENT_ID;
        const clientSecret = env.VITE_AZURE_CLIENT_SECRET;
        const dynamicsUrl = env.VITE_DYNAMICS_URL?.replace(/\/$/, '');

        if (!tenantId || !clientId || !clientSecret || !dynamicsUrl) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing configuration' }));
          return;
        }

        try {
          const token = await getToken();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            accessToken: token,
            expiresIn: Math.floor((tokenExpiry - Date.now()) / 1000),
          }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(error) }));
        }
      });

      // Proxy handler for both /api/dynamics and /api/data/v9.2
      const proxyHandler = async (req: any, res: any, pathPrefix: string) => {
        const dynamicsUrl = env.VITE_DYNAMICS_URL?.replace(/\/$/, '');

        if (!dynamicsUrl) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Dynamics URL not configured' }));
          return;
        }

        try {
          const token = await getToken();

          // Get the path after the prefix - req.url is already stripped of the prefix
          const apiPath = req.url || '';
          // Both paths need to construct the full Dynamics URL with /api/data/v9.2
          const targetUrl = `${dynamicsUrl}/api/data/v9.2${apiPath}`;

          console.log(`[Dynamics Proxy] ${req.method} ${targetUrl}`);

          const response = await fetch(targetUrl, {
            method: req.method || 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });

          const data = await response.text();

          res.statusCode = response.status;
          res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
          res.end(data);
        } catch (error) {
          console.error('[Dynamics Proxy] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(error) }));
        }
      };

      // Proxy for native Dynamics Web API calls (used by QueryBuilder)
      server.middlewares.use('/api/data/v9.2', (req, res) => proxyHandler(req, res, '/api/data/v9.2'));

      // Proxy for Dynamics Web API calls via /api/dynamics (used by dynamics-mock.ts)
      server.middlewares.use('/api/dynamics', (req, res) => proxyHandler(req, res, '/api/dynamics'));
    },
  };
}

export default defineConfig({
  plugins: [react(), dynamicsAuthPlugin()],
  root: __dirname,
  envDir: __dirname,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
