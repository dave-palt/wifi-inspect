// @ts-nocheck
import { hashBssid, getClientIp } from '../utils/env.js';
import { db } from '../db/client.js';

type DbRow = Record<string, any>;

export async function networksRouter(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === 'POST' && url.pathname === '/v1/networks/check') {
    return checkNetwork(req);
  }

  if (req.method === 'POST' && url.pathname === '/v1/networks/report') {
    return reportNetwork(req);
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function checkNetwork(req: Request): Promise<Response> {
  try {
    const body = await req.json() as { ssid?: string; bssidHash?: string };
    const { ssid, bssidHash } = body;

    if (!ssid) {
      return new Response(JSON.stringify({ error: 'Missing SSID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const bssid = bssidHash || hashBssid('');
    
    const network = db.queryOne(
      'SELECT id, ssid, security_type FROM networks WHERE ssid = $1 AND (bssid_hash = $2 OR bssid_hash IS NULL)',
      [ssid, bssid]
    ) as Promise<DbRow | null>;

    if (!network) {
      return new Response(JSON.stringify({
        known: false,
        reputation: 1.0,
        alerts: [],
        totalReports: 0,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const alerts = await db.query<{
      id: number;
      alert_type: string;
      severity: number;
      description: string;
      created_at: string;
    }>(
      `SELECT id, alert_type, severity, description, created_at 
       FROM network_alerts 
       WHERE network_id = $1 AND is_active = true 
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY severity DESC`,
      [network.id]
    );

    const reportCount = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM reports WHERE network_id = $1 AND validated = true',
      [network.id]
    );

    return new Response(JSON.stringify({
      known: true,
      reputation: 1.0,
      alerts: alerts.map(a => ({
        id: a.id,
        type: a.alert_type,
        severity: a.severity,
        description: a.description,
        createdAt: a.created_at,
      })),
      totalReports: reportCount?.count ? parseInt(String(reportCount.count)) : 0,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Check network error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function reportNetwork(req: Request): Promise<Response> {
  try {
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

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as {
      ssid?: string;
      bssidHash?: string;
      securityType?: string;
      devicesFound?: Array<{ ip: string; mac: string; openPorts: number[]; deviceType: string }>;
      threatLevel?: number;
      location?: { geohash?: string; city?: string; country?: string };
    };
    const { ssid, bssidHash, securityType, devicesFound, threatLevel, location } = body;

    if (!ssid || !devicesFound) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const bssid = bssidHash || hashBssid('');

    let network = await db.queryOne<{ id: number }>(
      'SELECT id FROM networks WHERE ssid = $1 AND (bssid_hash = $2 OR bssid_hash IS NULL)',
      [ssid, bssid]
    );

    if (!network) {
      const result = await db.query<{ id: number }>(
        'INSERT INTO networks (ssid, bssid_hash, security_type, updated_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [ssid, bssid, securityType || 'unknown']
      );
      network = result[0];
    }

    const report = await db.query<{ id: number }>(
      `INSERT INTO reports (network_id, device_id, devices_found, threat_level, security_type, location_geohash, submitted_at, source_ip)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7) RETURNING id`,
      [
        network.id,
        tokenRecord.device_id,
        JSON.stringify(devicesFound),
        threatLevel || 0,
        securityType || 'unknown',
        location?.geohash || null,
        getClientIp(req),
      ]
    );

    if (location?.geohash) {
      await db.execute(
        `INSERT INTO network_locations (network_id, geohash, city, country, reported_count, last_reported)
         VALUES ($1, $2, $3, $4, 1, NOW())
         ON CONFLICT (network_id, geohash) 
         DO UPDATE SET reported_count = network_locations.reported_count + 1, last_reported = NOW()`,
        [network.id, location.geohash, location.city || null, location.country || null]
      );
    }

    if (threatLevel && threatLevel >= 3) {
      const existingAlert = await db.queryOne<{ id: number }>(
        'SELECT id FROM network_alerts WHERE network_id = $1 AND alert_type = $2 AND is_active = true',
        [network.id, 'cameras_detected']
      );

      if (existingAlert) {
        await db.execute(
          'UPDATE network_alerts SET source_count = source_count + 1, created_at = NOW() WHERE id = $1',
          [existingAlert.id]
        );
      } else {
        await db.execute(
          `INSERT INTO network_alerts (network_id, alert_type, severity, description, source_count, created_at)
           VALUES ($1, 'cameras_detected', $2, $3, 1, NOW())`,
          [
            network.id,
            Math.min(5, threatLevel),
            `Camera device detected on this network. Users reported ${devicesFound.length} camera(s).`,
          ]
        );
      }
    }

    await db.execute(
      'UPDATE devices SET report_count = report_count + 1, reputation_score = LEAST(5.0, reputation_score + 0.1) WHERE device_id = $1',
      [tokenRecord.device_id]
    );

    return new Response(JSON.stringify({
      success: true,
      reportId: report[0].id,
      message: 'Report submitted successfully',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Report network error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
