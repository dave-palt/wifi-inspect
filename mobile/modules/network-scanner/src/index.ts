import { NativeModules, Platform } from 'react-native';

export interface NetworkInfo {
  ssid: string;
  bssid: string;
  ip: string;
  deviceIp: string;
  gateway: number;
  subnet: number;
  rssi: number;
  success?: boolean;
  error?: string;
  message?: string;
  wifiEnabled?: boolean;
}

export interface ArpEntry {
  mac: string;
  ip: string;
  hostname?: string;
}

export interface PortInfo {
  number: number;
  protocol: string;
  state: string;
  service?: string;
}

export interface PingResult {
  success: boolean;
  time?: number;
}

interface NativeNetworkScanner {
  getNetworkInfo(): Promise<NetworkInfo>;
  getArpTable(): Promise<ArpEntry[]>;
  scanPorts(ip: string, ports: number[]): Promise<PortInfo[]>;
  ping(ip: string): Promise<PingResult>;
}

const NetworkScanner: NativeNetworkScanner = NativeModules.NetworkScanner || {
  getNetworkInfo: async () => ({ error: 'NATIVE_MODULE_UNAVAILABLE', message: 'Network scanner not available' } as NetworkInfo),
  getArpTable: async () => [],
  scanPorts: async () => [],
  ping: async () => ({ success: false }),
};

export const isNativeModuleAvailable = (): boolean => {
  return Platform.OS === 'android' && !!NativeModules.NetworkScanner;
};

export const getNetworkInfo = (): Promise<NetworkInfo> => {
  return NetworkScanner.getNetworkInfo();
};

export const getArpTable = (): Promise<ArpEntry[]> => {
  return NetworkScanner.getArpTable();
};

export const scanPorts = (ip: string, ports: number[]): Promise<PortInfo[]> => {
  return NetworkScanner.scanPorts(ip, ports);
};

export const ping = (ip: string): Promise<PingResult> => {
  return NetworkScanner.ping(ip);
};

export default NetworkScanner;
