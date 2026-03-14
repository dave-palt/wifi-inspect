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

export interface InterfaceInfo {
  name: string;
  ipAddress: string;
  subnet: string;
  subnetMask: string;
  isLoopback: boolean;
  isUp: boolean;
}

interface NativeNetworkScanner {
  getNetworkInfo(): Promise<NetworkInfo>;
  getArpTable(): Promise<ArpEntry[]>;
  scanPorts(ip: string, ports: number[]): Promise<PortInfo[]>;
  ping(ip: string): Promise<PingResult>;
  hasRootBinary(): Promise<boolean>;
  requestRootAccess(): Promise<boolean>;
  hasRootPermission(): Promise<boolean>;
  rootArpScan(subnet: string): Promise<ArpEntry[]>;
  getAllNetworkInterfaces(): Promise<InterfaceInfo[]>;
}

const NetworkScanner: NativeNetworkScanner = NativeModules.NetworkScanner || {
  getNetworkInfo: async () => ({ error: 'NATIVE_MODULE_UNAVAILABLE', message: 'Network scanner not available' } as NetworkInfo),
  getArpTable: async () => [],
  scanPorts: async () => [],
  ping: async () => ({ success: false }),
  hasRootBinary: async () => false,
  requestRootAccess: async () => false,
  hasRootPermission: async () => false,
  rootArpScan: async () => [],
  getAllNetworkInterfaces: async () => [],
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

export const hasRootBinary = (): Promise<boolean> => {
  return NetworkScanner.hasRootBinary();
};

export const requestRootAccess = (): Promise<boolean> => {
  return NetworkScanner.requestRootAccess();
};

export const hasRootPermission = (): Promise<boolean> => {
  return NetworkScanner.hasRootPermission();
};

export const rootArpScan = (subnet: string): Promise<ArpEntry[]> => {
  return NetworkScanner.rootArpScan(subnet);
};

export const getAllNetworkInterfaces = (): Promise<InterfaceInfo[]> => {
  return NetworkScanner.getAllNetworkInterfaces();
};

export default NetworkScanner;
