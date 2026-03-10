export interface CameraEndpoints {
  snapshotUrl?: string;
  rtspPath?: string;
  requiresAuth?: boolean;
}

export interface Device {
  mac: string;
  ip: string;
  hostname?: string;
  vendor?: string;
  deviceType?: DeviceType;
  firstSeen: number;
  lastSeen: number;
  signalStrength?: number;
  openPorts?: Port[];
  isGateway?: boolean;
  threatLevel?: ThreatLevel;
  threatReasons?: string[];
  cameraEndpoints?: CameraEndpoints;
}

export type DeviceType = 
  | 'camera'
  | 'phone'
  | 'laptop'
  | 'tablet'
  | 'smart_tv'
  | 'iot_device'
  | 'router'
  | 'unknown';

export type ThreatLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface Port {
  number: number;
  protocol: 'tcp' | 'udp';
  service?: string;
  state: 'open' | 'closed' | 'filtered';
  banner?: string;
  requiresAuth?: boolean;
}

export interface NetworkInfo {
  ssid: string;
  bssid: string;
  ip: string;
  gateway: string;
  subnet: string;
  dns: string[];
  securityType: SecurityType;
  signalStrength: number;
}

export type SecurityType = 
  | 'open'
  | 'wep'
  | 'wpa'
  | 'wpa2'
  | 'wpa3'
  | 'unknown';

export interface ScanResult {
  id: string;
  timestamp: number;
  network: NetworkInfo;
  devices: Device[];
  duration: number;
  isComplete: boolean;
}
