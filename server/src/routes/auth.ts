// @ts-nocheck
import { getEnvironmentVariable } from '../utils/env.js';
import { db } from '../db/client.js';

const JWT_SECRET = getEnvironmentVariable('JWT_SECRET', 'dev-secret-change-in-production');

export async function authRouter(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const deviceId = req.headers.get('x-device-id');

    if (!deviceId) {
      return new Response(JSON.stringify({ error: 'Missing device ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = await db.queryOne(
      'SELECT device_id FROM devices WHERE device_id = $1',
      [deviceId]
    );

    if (!existing) {
      await db.execute(
        'INSERT INTO devices (device_id, first_seen, last_seen) VALUES ($1, NOW(), NOW())',
        [deviceId]
      );
    } else {
      await db.execute(
        'UPDATE devices SET last_seen = NOW() WHERE device_id = $1',
        [deviceId]
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.execute(
      'INSERT INTO auth_tokens (token, device_id, expires_at) VALUES ($1, $2, $3)',
      [token, deviceId, expiresAt]
    );

    return new Response(JSON.stringify({
      token,
      deviceId,
      expiresAt,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
