import { NativeModules, Platform } from 'react-native';
import type { Device, NetworkInfo, Port } from '@shared/src/types/device';
import { getDeviceManufacturer } from './vendorLookup';
import { classifyDevice } from './deviceClassifier';
import { analyzeThreatLevel } from './threatAnalyzer';

const TAG = 'NetworkScanner';

interface NativeNetworkInfoResponse {
  ssid?: string;
  bssid?: string;
  ip?: string;
  deviceIp?: string;
  gateway?: number;
  subnet?: number;
  rssi?: number;
  success?: boolean;
  error?: string;
  message?: string;
  wifiEnabled?: boolean;
}

interface NativeNetworkScanner {
  getNetworkInfo(): Promise<NativeNetworkInfoResponse>;
  getArpTable(): Promise<Array<{ mac: string; ip: string; hostname?: string }>>;
  scanPorts(ip: string, ports: number[]): Promise<Array<{
    number: number;
    protocol: string;
    state: string;
    service?: string;
  }>>;
  ping(ip: string): Promise<{ success: boolean; time?: number }>;
}

const NetworkScanner: NativeNetworkScanner = NativeModules.NetworkScanner || {
  getNetworkInfo: async () => ({ error: 'NATIVE_MODULE_UNAVAILABLE' }),
  getArpTable: async () => [],
  scanPorts: async () => [],
  ping: async () => ({ success: false }),
};

export interface NetworkInfoError {
  type: 'permission' | 'not_connected' | 'no_ip' | 'native_unavailable' | 'unknown';
  message: string;
  wifiEnabled?: boolean;
}

export interface NetworkInfoResult {
  networkInfo: NetworkInfo | null;
  error: NetworkInfoError | null;
}

export async function getNetworkInfo(): Promise<NetworkInfo | null> {
  const result = await getNetworkInfoWithDebug();
  return result.networkInfo;
}

export async function getNetworkInfoWithDebug(): Promise<NetworkInfoResult> {
  try {
    console.log(`[${TAG}] Getting network info...`);
    
    const info = await NetworkScanner.getNetworkInfo();
    
    console.log(`[${TAG}] Native response:`, JSON.stringify(info));
    
    if (!info) {
      console.log(`[${TAG}] No response from native module`);
      return {
        networkInfo: null,
        error: { type: 'unknown', message: 'No response from network scanner' },
      };
    }
    
    if (info.error) {
      console.log(`[${TAG}] Native error: ${info.error} - ${info.message}`);
      
      let errorType: NetworkInfoError['type'];
      switch (info.error) {
        case 'PERMISSION_DENIED':
          errorType = 'permission';
          break;
        case 'NOT_CONNECTED':
          errorType = 'not_connected';
          break;
        case 'NO_IP':
          errorType = 'no_ip';
          break;
        case 'NATIVE_MODULE_UNAVAILABLE':
          errorType = 'native_unavailable';
          break;
        default:
          errorType = 'unknown';
      }
      
      return {
        networkInfo: null,
        error: {
          type: errorType,
          message: info.message || 'Unknown error',
          wifiEnabled: info.wifiEnabled,
        },
      };
    }
    
    if (!info.deviceIp || info.deviceIp === '0.0.0.0') {
      console.log(`[${TAG}] Invalid device IP: ${info.deviceIp}`);
      return {
        networkInfo: null,
        error: { type: 'no_ip', message: 'Could not get device IP address' },
      };
    }

    const networkInfo: NetworkInfo = {
      ssid: info.ssid || 'Connected WiFi',
      bssid: info.bssid || '',
      ip: info.deviceIp || info.ip || '0.0.0.0',
      gateway: intToIp(info.gateway || 0),
      subnet: intToIp(info.subnet || 0),
      dns: [],
      securityType: 'wpa2',
      signalStrength: info.rssi || -100,
    };
    
    console.log(`[${TAG}] Success: SSID=${networkInfo.ssid}, IP=${networkInfo.ip}`);
    
    return { networkInfo, error: null };
  } catch (error) {
    console.error(`[${TAG}] Exception:`, error);
    return {
      networkInfo: null,
      error: {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
  }
}

export async function scanNetwork(
  onProgress?: (progress: number) => void
): Promise<Device[]> {
  console.log(`[${TAG}] Starting network scan...`);
  onProgress?.(10);
  
  const result = await getNetworkInfoWithDebug();
  if (result.error) {
    console.log(`[${TAG}] Scan failed: ${result.error.message}`);
    throw new Error(result.error.message);
  }
  
  const networkInfo = result.networkInfo;
  if (!networkInfo) {
    throw new Error('Not connected to network');
  }

  onProgress?.(20);
  
  const gatewayIp = networkInfo.gateway;
  const subnet = getSubnet(networkInfo.ip);
  const devices: Device[] = [];
  
  console.log(`[${TAG}] Scanning subnet: ${subnet}.x, Gateway: ${gatewayIp}`);
  
  onProgress?.(30);
  
  let arpDevices: Array<{ mac: string; ip: string; hostname?: string }> = [];
  
  try {
    arpDevices = await NetworkScanner.getArpTable();
    console.log(`[${TAG}] Found ${arpDevices.length} devices via ARP`);
  } catch (error) {
    console.log(`[${TAG}] ARP table not available, using ping sweep`);
    arpDevices = await pingSweep(subnet);
    console.log(`[${TAG}] Found ${arpDevices.length} devices via ping sweep`);
  }
  
  onProgress?.(50);
  
  const totalDevices = arpDevices.length;
  let processed = 0;
  
  for (const arpDevice of arpDevices) {
    const openPorts = await scanDevicePorts(arpDevice.ip);
    
    const vendor = getDeviceManufacturer(arpDevice.mac);
    const deviceType = classifyDevice(arpDevice.mac, vendor, arpDevice.hostname, openPorts);
    const { threatLevel, reasons } = analyzeThreatLevel(deviceType, openPorts, networkInfo);
    
    const device: Device = {
      mac: arpDevice.mac,
      ip: arpDevice.ip,
      hostname: arpDevice.hostname,
      vendor,
      deviceType,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      openPorts,
      isGateway: arpDevice.ip === gatewayIp,
      threatLevel,
      threatReasons: reasons,
    };
    
    devices.push(device);
    
    processed++;
    onProgress?.(50 + Math.floor((processed / totalDevices) * 40));
  }
  
  if (!devices.find(d => d.isGateway)) {
    const gatewayPorts = await scanDevicePorts(gatewayIp);
    const { threatLevel, reasons } = analyzeThreatLevel('router', gatewayPorts, networkInfo);
    
    devices.push({
      mac: networkInfo.bssid || 'Unknown',
      ip: gatewayIp,
      vendor: 'Gateway/Router',
      deviceType: 'router',
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      openPorts: gatewayPorts,
      isGateway: true,
      threatLevel,
      threatReasons: reasons,
    });
  }
  
  console.log(`[${TAG}] Scan complete: ${devices.length} devices found`);
  onProgress?.(100);
  
  return devices;
}

async function scanDevicePorts(ip: string): Promise<Port[]> {
  const commonPorts = [
    21, 22, 23, 80, 443, 445, 554, 
    3306, 3389, 5432, 8000, 8080, 
    8443, 8554, 9000, 37777
  ];
  
  try {
    const results = await NetworkScanner.scanPorts(ip, commonPorts);
    return results
      .filter(p => p.state === 'open')
      .map(p => ({
        number: p.number,
        protocol: p.protocol as 'tcp' | 'udp',
        service: p.service,
        state: 'open' as const,
      }));
  } catch (error) {
    console.error(`[${TAG}] Port scan error for ${ip}:`, error);
    return [];
  }
}

async function pingSweep(subnet: string): Promise<Array<{ mac: string; ip: string; hostname?: string }>> {
  const devices: Array<{ mac: string; ip: string; hostname?: string }> = [];
  const range = 254;
  const batchSize = 20;
  
  for (let i = 1; i < range; i += batchSize) {
    const promises: Promise<void>[] = [];
    const batch = Math.min(batchSize, range - i);
    
    for (let j = 0; j < batch; j++) {
      const ip = `${subnet}.${i + j}`;
      
      promises.push(
        (async () => {
          try {
            const result = await NetworkScanner.ping(ip);
            if (result.success) {
              devices.push({
                mac: generateMockMac(),
                ip,
                hostname: undefined,
              });
            }
          } catch {
            // Ignore
          }
        })()
      );
    }
    
    await Promise.all(promises);
  }
  
  return devices;
}

function intToIp(int: number): string {
  return [
    (int >>> 24) & 0xff,
    (int >>> 16) & 0xff,
    (int >>> 8) & 0xff,
    int & 0xff,
  ].join('.');
}

function getSubnet(ip: string): string {
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function generateMockMac(): string {
  const hex = '0123456789ABCDEF';
  let mac = '';
  for (let i = 0; i < 6; i++) {
    mac += hex[Math.floor(Math.random() * 16)];
    mac += hex[Math.floor(Math.random() * 16)];
    if (i < 5) mac += ':';
  }
  return mac;
}

export async function pingDevice(ip: string): Promise<{ success: boolean; time?: number }> {
  try {
    return await NetworkScanner.ping(ip);
  } catch {
    return { success: false };
  }
}

export function isNativeModuleAvailable(): boolean {
  return !!NativeModules.NetworkScanner;
}
