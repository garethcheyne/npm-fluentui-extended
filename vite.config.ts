import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin, Connect } from 'vite';

// Dynamics 365 proxy plugin - handles /api/dynamics/* requests
function dynamicsProxyPlugin(): Plugin {
  let dynamicsUrl: string;
  let clientId: string;
  let clientSecret: string;
  let tenantId: string;
  let accessToken: string | null = null;
  let tokenExpiry = 0;

  const getAccessToken = async (): Promise<string> => {
    // Return cached token if still valid (with 5 min buffer)
    if (accessToken && Date.now() < tokenExpiry - 300000) {
      return accessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: `${dynamicsUrl}/.default`,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token request failed: ${error}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return accessToken!;
  };

  return {
    name: 'dynamics-proxy',
    configureServer(server) {
      // Load environment variables
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeProcess = (globalThis as any).process;
      const cwd = nodeProcess?.cwd?.() || '.';
      const env = loadEnv('', cwd, '');
      dynamicsUrl = env.VITE_DYNAMICS_URL?.replace(/\/$/, '') || '';
      clientId = env.VITE_AZURE_CLIENT_ID || '';
      clientSecret = env.VITE_AZURE_CLIENT_SECRET || '';
      tenantId = env.VITE_AZURE_TENANT_ID || '';

      const isConfigured = !!(
        dynamicsUrl &&
        clientId &&
        clientSecret &&
        tenantId &&
        !dynamicsUrl.includes('yourorg') &&
        !clientId.includes('your-azure')
      );

      // Handle /api/dynamics-token - verify connection
      server.middlewares.use('/api/dynamics-token', async (_req, res) => {
        if (!isConfigured) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Dynamics not configured' }));
          return;
        }

        try {
          await getAccessToken();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } catch (error: any) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      // Handle /api/dynamics/* - proxy to Dynamics Web API
      server.middlewares.use('/api/dynamics/', async (req: Connect.IncomingMessage, res) => {
        if (!isConfigured) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Dynamics not configured' }));
          return;
        }

        try {
          const token = await getAccessToken();
          // Extract the endpoint from the URL (everything after /api/dynamics/)
          const reqUrl = (req as any).url as string || '';
          const endpoint = reqUrl.replace(/^\//, '');
          const apiUrl = `${dynamicsUrl}/api/data/v9.2/${endpoint}`;

          console.log(`[Dynamics Proxy] ${apiUrl}`);

          const response = await fetch(apiUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
            },
          });

          const data = await response.text();
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(data);
        } catch (error: any) {
          console.error('[Dynamics Proxy] Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), dynamicsProxyPlugin()],
});
