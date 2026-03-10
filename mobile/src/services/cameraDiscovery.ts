import type { CameraEndpoints, Port } from '@shared/src/types/device';

const SNAPSHOT_PATHS = [
  '/snapshot.jpg',
  '/image.jpg',
  '/jpg/image.jpg',
  '/cgi-bin/snapshot.cgi',
  '/cgi-bin/api.cgi?cmd=Snap',
  '/Streaming/Channels/1/picture',
  '/ISAPI/Streaming/Channels/1/picture',
  '/snap.jpg',
  '/capture',
  '/img/snapshot.cgi',
];

const RTSP_PATHS = [
  '/',
  '/stream1',
  '/stream2',
  '/live/ch1',
  '/live/ch2',
  '/h264',
  '/h264Preview',
  '/cam/realmonitor?channel=1&subtype=0',
  '/video1',
  '/videoMain',
  '/1/h264major',
  '/live/main',
  '/ch01/0',
  '/live/stream1',
];

const HTTP_PORTS = [80, 443, 8000, 8080, 8443, 9000];

function getBaseHttpUrl(ip: string, port: number): string {
  const protocol = port === 443 || port === 8443 ? 'https' : 'http';
  return `${protocol}://${ip}:${port}`;
}

async function probeUrl(url: string, timeout: number): Promise<{ status: number; ok: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return { status: response.status, ok: response.ok };
  } catch {
    clearTimeout(timeoutId);
    return { status: 0, ok: false };
  }
}

async function findSnapshotUrl(
  ip: string,
  ports: Port[],
  timeoutPerUrl: number,
  maxTotalTime: number
): Promise<{ url: string; requiresAuth: boolean } | null> {
  const startTime = Date.now();
  const httpPorts = ports
    .filter(p => HTTP_PORTS.includes(p.number) && p.state === 'open')
    .map(p => p.number);

  if (httpPorts.length === 0) {
    httpPorts.push(80);
  }

  for (const port of httpPorts) {
    if (Date.now() - startTime > maxTotalTime) break;

    const baseUrl = getBaseHttpUrl(ip, port);

    for (const path of SNAPSHOT_PATHS) {
      if (Date.now() - startTime > maxTotalTime) break;

      const url = `${baseUrl}${path}`;
      const result = await probeUrl(url, timeoutPerUrl);

      if (result.status === 200) {
        return { url, requiresAuth: false };
      }
      if (result.status === 401) {
        return { url, requiresAuth: true };
      }
    }
  }

  return null;
}

async function findRtspPath(
  ip: string,
  ports: Port[],
  timeoutPerUrl: number,
  maxTotalTime: number
): Promise<{ path: string; requiresAuth: boolean } | null> {
  const startTime = Date.now();
  const httpPorts = ports
    .filter(p => HTTP_PORTS.includes(p.number) && p.state === 'open')
    .map(p => p.number);

  if (httpPorts.length === 0) {
    httpPorts.push(80);
  }

  for (const port of httpPorts) {
    if (Date.now() - startTime > maxTotalTime) break;

    const baseUrl = getBaseHttpUrl(ip, port);

    for (const path of RTSP_PATHS) {
      if (Date.now() - startTime > maxTotalTime) break;

      const probePath = `/rtsp${path === '/' ? '' : path}`;
      const url = `${baseUrl}${probePath}`;
      const result = await probeUrl(url, timeoutPerUrl);

      if (result.status === 200 || result.status === 401) {
        return { path, requiresAuth: result.status === 401 };
      }
    }
  }

  if (ports.some(p => p.number === 554 || p.number === 8554)) {
    return { path: '/', requiresAuth: false };
  }

  return null;
}

export async function discoverCameraEndpoints(
  ip: string,
  ports: Port[],
  options?: {
    timeoutPerUrl?: number;
    maxTotalTime?: number;
  }
): Promise<CameraEndpoints> {
  const timeoutPerUrl = options?.timeoutPerUrl ?? 1000;
  const maxTotalTime = options?.maxTotalTime ?? 5000;

  const endpoints: CameraEndpoints = {};

  const snapshotResult = await findSnapshotUrl(ip, ports, timeoutPerUrl, maxTotalTime);
  if (snapshotResult) {
    endpoints.snapshotUrl = snapshotResult.url;
    endpoints.requiresAuth = snapshotResult.requiresAuth;
  }

  const rtspResult = await findRtspPath(ip, ports, timeoutPerUrl, maxTotalTime);
  if (rtspResult) {
    endpoints.rtspPath = rtspResult.path;
    if (!endpoints.requiresAuth) {
      endpoints.requiresAuth = rtspResult.requiresAuth;
    }
  }

  return endpoints;
}

export function buildRtspUrl(
  ip: string,
  port: number,
  path: string,
  credentials?: { username: string; password: string }
): string {
  if (credentials) {
    const encodedUser = encodeURIComponent(credentials.username);
    const encodedPass = encodeURIComponent(credentials.password);
    return `rtsp://${encodedUser}:${encodedPass}@${ip}:${port}${path}`;
  }
  return `rtsp://${ip}:${port}${path}`;
}
