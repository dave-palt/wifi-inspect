import { testConnection } from '../db/client.js';

export async function healthRouter(req: Request): Promise<Response> {
  const dbConnected = await testConnection();

  const status = {
    status: dbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      api: 'up',
      database: dbConnected ? 'up' : 'down',
    },
    version: '1.0.0',
  };

  return new Response(JSON.stringify(status), {
    status: dbConnected ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
