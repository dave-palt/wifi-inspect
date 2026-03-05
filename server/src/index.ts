import { serve } from 'bun';
import { getEnvironmentVariable } from './utils/env.js';
import { authRouter } from './routes/auth.js';
import { networksRouter } from './routes/networks.js';
import { alertsRouter } from './routes/alerts.js';
import { healthRouter } from './routes/health.js';
import { testConnection } from './db/client.js';

const PORT = parseInt(getEnvironmentVariable('PORT', '3000'));

const server = serve({
  port: PORT,
  fetch: async (req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    console.log(`${method} ${path}`);

    if (path.startsWith('/v1/auth')) {
      return authRouter(req);
    }
    
    if (path.startsWith('/v1/networks')) {
      return networksRouter(req);
    }
    
    if (path.startsWith('/v1/alerts')) {
      return alertsRouter(req);
    }
    
    if (path === '/v1/health' || path === '/health') {
      return healthRouter(req);
    }

    if (path === '/') {
      return new Response(JSON.stringify({
        name: 'CamDetect API',
        version: '1.0.0',
        status: 'running',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});

const dbConnected = await testConnection();

console.log(`
╔═══════════════════════════════════════════╗
║         CamDetect API Server               ║
╠═══════════════════════════════════════════╣
║  Port: ${PORT}                                ║
║  Database: ${dbConnected ? 'Connected' : 'Failed'}                  ║
║  Status: Running                            ║
╚═══════════════════════════════════════════╝
`);

export default server;
