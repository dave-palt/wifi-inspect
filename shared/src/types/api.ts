export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthToken {
  token: string;
  deviceId: string;
  expiresAt: string;
}

export interface NetworkCheckRequest {
  ssid: string;
  bssidHash: string;
}

export interface NetworkCheckResponse {
  known: boolean;
  reputation: number;
  alerts: NetworkAlert[];
  totalReports: number;
}

export interface NetworkAlert {
  id: number;
  type: AlertType;
  severity: number;
  description: string;
  createdAt: string;
}

export type AlertType = 
  | 'cameras_detected'
  | 'suspicious'
  | 'high_risk_area'
  | 'known_threat';

export interface ReportRequest {
  ssid: string;
  bssidHash: string;
  securityType: string;
  devicesFound: ReportedDevice[];
  threatLevel: number;
  location?: LocationData;
}

export interface ReportedDevice {
  ip: string;
  mac: string;
  openPorts: number[];
  deviceType: string;
}

export interface LocationData {
  geohash: string;
  city?: string;
  country?: string;
}

export interface NearbyAlert {
  ssid: string;
  bssid: string;
  alertType: AlertType;
  severity: number;
  distance: string;
  reportedAt: string;
}
