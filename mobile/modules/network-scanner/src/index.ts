import { NativeModules, NativeEventEmitter, Platform, EmitterSubscription, NativeModule } from 'react-native';

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

export interface ScanProgressEvent {
  progress: number;
  message: string;
}

export interface DeviceFoundEvent {
  mac: string;
  ip: string;
  hostname?: string;
  vendor: string;
  deviceType: string;
  openPorts: PortInfo[];
  isGateway: boolean;
  threatLevel: number;
  threatReasons: string[];
  snapshotUrl?: string;
  requiresAuth?: boolean;
}

export interface ScanCompleteEvent {
  totalDevices: number;
  cancelled: boolean;
}

export interface ScanErrorEvent {
  code: string;
  message: string;
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
  startFullScan(ports: number[]): Promise<boolean>;
  cancelScan(): Promise<boolean>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const NativeModule = NativeModules.NetworkScanner;

const NetworkScanner: NativeNetworkScanner = NativeModule || {
  getNetworkInfo: async () => ({ error: 'NATIVE_MODULE_UNAVAILABLE', message: 'Network scanner not available' } as NetworkInfo),
  getArpTable: async () => [],
  scanPorts: async () => [],
  ping: async () => ({ success: false }),
  hasRootBinary: async () => false,
  requestRootAccess: async () => false,
  hasRootPermission: async () => false,
  rootArpScan: async () => [],
  getAllNetworkInterfaces: async () => [],
  startFullScan: async () => false,
  cancelScan: async () => false,
  addListener: () => {},
  removeListeners: () => {},
};

const eventEmitter = NativeModule ? new NativeEventEmitter(NativeModule) : null;

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

export const startFullScan = (ports: number[]): Promise<boolean> => {
  return NetworkScanner.startFullScan(ports);
};

export const cancelScan = (): Promise<boolean> => {
  return NetworkScanner.cancelScan();
};

export function addScanProgressListener(
  callback: (event: ScanProgressEvent) => void
): EmitterSubscription {
  if (!eventEmitter) {
    return { remove: () => {} } as EmitterSubscription;
  }
  return eventEmitter.addListener('ScanProgress', callback);
}

export function addDeviceFoundListener(
  callback: (event: DeviceFoundEvent) => void
): EmitterSubscription {
  if (!eventEmitter) {
    return { remove: () => {} } as EmitterSubscription;
  }
  return eventEmitter.addListener('DeviceFound', callback);
}

export function addScanCompleteListener(
  callback: (event: ScanCompleteEvent) => void
): EmitterSubscription {
  if (!eventEmitter) {
    return { remove: () => {} } as EmitterSubscription;
  }
  return eventEmitter.addListener('ScanComplete', callback);
}

export function addScanErrorListener(
  callback: (event: ScanErrorEvent) => void
): EmitterSubscription {
  if (!eventEmitter) {
    return { remove: () => {} } as EmitterSubscription;
  }
  return eventEmitter.addListener('ScanError', callback);
}

export default NetworkScanner;
