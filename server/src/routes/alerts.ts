// @ts-nocheck
import { db } from '../db/client.js';

export async function alertsRouter(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === 'GET' && url.pathname === '/v1/alerts/nearby') {
    return getNearbyAlerts(req);
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getNearbyAlerts(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!authToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tokenRecord = await db.queryOne<{ device_id: string; expires_at: string }>(
      'SELECT device_id, expires_at FROM auth_tokens WHERE token = $1',
      [authToken]
    );

    if (!tokenRecord) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const geohash = url.searchParams.get('geohash');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let query = `
      SELECT 
        n.ssid,
        n.bssid_hash as bssid,
        na.alert_type,
        na.severity,
        na.description,
        nl.geohash,
        nl.city,
        na.created_at
      FROM network_alerts na
      JOIN networks n ON n.id = na.network_id
      LEFT JOIN network_locations nl ON nl.network_id = n.id
      WHERE na.is_active = true 
        AND (na.expires_at IS NULL OR na.expires_at > NOW())
    `;

    const params: any[] = [];

    if (geohash && geohash.length >= 3) {
      query += ` AND nl.geohash LIKE $1`;
      params.push(`${geohash.substring(0, 3)}%`);
    }

    query += ` ORDER BY na.severity DESC, na.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const alerts = await db.query<{
      ssid: string;
      bssid: string;
      alert_type: string;
      severity: number;
      description: string;
      geohash: string;
      city: string;
      created_at: string;
    }>(query, params);

    return new Response(JSON.stringify({
      alerts: alerts.map(a => ({
        ssid: a.ssid,
        bssid: a.bssid,
        alertType: a.alert_type,
        severity: a.severity,
        description: a.description,
        geohash: a.geohash,
        city: a.city,
        reportedAt: a.created_at,
      })),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get nearby alerts error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
