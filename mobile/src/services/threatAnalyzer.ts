import type { DeviceType, Port, NetworkInfo, ThreatLevel } from '@shared/src/types/device';
import { CAMERA_PORTS, THREAT_REASONS } from '@shared/src/constants';

export interface ThreatAnalysis {
  threatLevel: ThreatLevel;
  reasons: string[];
}

export function analyzeThreatLevel(
  deviceType: DeviceType | undefined,
  openPorts: Port[] = [],
  network?: NetworkInfo
): ThreatAnalysis {
  const reasons: string[] = [];
  let score = 0;

  if (deviceType === 'camera') {
    score += 3;
    reasons.push(THREAT_REASONS.camera_detected);
  }

  const hasRtsp = openPorts.some(p => p.number === 554 || p.number === 8554);
  if (hasRtsp) {
    score += 2;
    reasons.push(THREAT_REASONS.open_rtsp);
  }

  const cameraPorts = openPorts.filter(p =>
    CAMERA_PORTS.some(cp => cp.port === p.number)
  );
  
  if (cameraPorts.length > 0) {
    score += cameraPorts.length;
    if (!reasons.includes(THREAT_REASONS.camera_detected)) {
      reasons.push(THREAT_REASONS.open_camera_web);
    }
  }

  const suspiciousPorts = [23, 23];
  const hasTelnet = openPorts.some(p => p.number === 23);
  if (hasTelnet) {
    score += 1;
    if (!reasons.includes(THREAT_REASONS.suspicious_port)) {
      reasons.push(THREAT_REASONS.suspicious_port);
    }
  }

  if (openPorts.length > 5) {
    score += 1;
    reasons.push(THREAT_REASONS.many_open_ports);
  }

  if (network) {
    if (network.securityType === 'open' || network.securityType === 'wep') {
      score += 1;
      reasons.push(THREAT_REASONS.weak_security);
    }
  }

  if (!deviceType || deviceType === 'unknown') {
    score += 1;
    if (!reasons.includes(THREAT_REASONS.unknown_device)) {
      reasons.push(THREAT_REASONS.unknown_device);
    }
  }

  const threatLevel = Math.min(5, Math.floor(score)) as ThreatLevel;

  return {
    threatLevel,
    reasons: reasons.slice(0, 3),
  };
}
