import { InteractionManager } from 'react-native';
import NetworkScanner, { 
  isNativeModuleAvailable, 
  getNetworkInfo as nativeGetNetworkInfo,
  getArpTable as nativeGetArpTable,
  scanPorts as nativeScanPorts,
  ping as nativePing,
  getAllNetworkInterfaces as nativeGetAllInterfaces,
  startFullScan,
  cancelScan,
  addScanProgressListener,
  addDeviceFoundListener,
  addScanCompleteListener,
  addScanErrorListener,
  type DeviceFoundEvent,
} from 'network-scanner';
import type { Device, NetworkInfo, Port, DeviceType, ThreatLevel } from '@shared/src/types/device';
import { getDeviceManufacturer } from './vendorLookup';
import { classifyDevice } from './deviceClassifier';
import { analyzeThreatLevel } from './threatAnalyzer';
import { discoverCameraEndpoints } from './cameraDiscovery';
import { perfLogger } from '../utils/perfLogger';

const TAG = 'NetworkScanner';

const DEFAULT_PORTS: number[] = [
  21, 22, 23, 25, 53, 80, 110, 123, 143, 161, 443, 445, 514, 993, 995,
  554, 8554, 37777, 37778,
  8000, 8001, 8002, 8080, 8081, 8082, 8083, 8084, 8443, 8800, 9000, 9001, 9008, 1024,
  1433, 1521, 1883, 3306, 3389, 5432, 5800, 5900, 6000, 62078, 6789, 6667,
  1900, 5000, 5353, 5357,
];

export function getPortsToScan(customPorts: number[]): number[] {
  return [...new Set([...DEFAULT_PORTS, ...customPorts])].sort((a, b) => a - b);
}

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
    
    const info = await nativeGetNetworkInfo();
    
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

export type ScanCallbacks = {
  onDeviceFound: (device: Device) => void;
  onProgress?: (progress: number, message?: string) => void;
};

export interface ScanOptions {
  customPorts?: number[];
  scanAllSubnets?: boolean;
}

export async function scanNetwork(callbacks: ScanCallbacks, options?: ScanOptions): Promise<void> {
  const { onDeviceFound, onProgress } = callbacks;
  const customPorts = options?.customPorts ?? [];
  
  perfLogger.log('scanNetwork', 'start');
  console.log(`[${TAG}] Starting network scan...`);
  onProgress?.(5, 'Initializing scan...');
  
  perfLogger.mark('getNetworkInfo:start');
  const result = await getNetworkInfoWithDebug();
  perfLogger.measure('getNetworkInfo', 'getNetworkInfo:start');
  
  if (result.error) {
    console.log(`[${TAG}] Scan failed: ${result.error.message}`);
    throw new Error(result.error.message);
  }
  
  const networkInfo = result.networkInfo;
  if (!networkInfo) {
    throw new Error('Not connected to network');
  }

  onProgress?.(10, 'Getting network info...');
  
  const gatewayIp = networkInfo.gateway;
  const primarySubnet = getSubnet(networkInfo.ip);
  
  let subnetsToScan: string[] = [primarySubnet];
  
  if (options?.scanAllSubnets) {
    try {
      const interfaces = await nativeGetAllInterfaces();
      const allSubnets = interfaces
        .filter(iface => !iface.isLoopback && iface.isUp && iface.subnet)
        .map(iface => iface.subnet);
      
      subnetsToScan = [...new Set([primarySubnet, ...allSubnets])];
      console.log(`[${TAG}] Scanning ${subnetsToScan.length} subnets: ${subnetsToScan.join(', ')}`);
    } catch (error) {
      console.log(`[${TAG}] Failed to get all interfaces, using primary subnet only: ${error}`);
    }
  }
  
  console.log(`[${TAG}] Scanning subnet: ${primarySubnet}.x, Gateway: ${gatewayIp}`);
  perfLogger.log('scanNetwork', 'subnet_info', { subnets: subnetsToScan, gateway: gatewayIp });
  
  onProgress?.(15, 'Discovering devices...');
  
  const portsToScan = getPortsToScan(customPorts);
  console.log(`[${TAG}] Scanning ${portsToScan.length} ports (${customPorts.length} custom)`);

  const allDiscoveredIps = new Set<string>();
  const totalSubnets = subnetsToScan.length;
  
  for (let i = 0; i < subnetsToScan.length; i++) {
    const currentSubnet = subnetsToScan[i];
    const baseProgress = 15 + Math.floor((i / totalSubnets) * 35);
    
    const discoveredIps = await pingSweepWithProgress(currentSubnet, (scanned, total) => {
      const subnetProgress = Math.floor((scanned / total) * (35 / totalSubnets));
      onProgress?.(baseProgress + subnetProgress, `Scanning ${currentSubnet}.x... ${scanned}/${total} IPs`);
    });
    
    discoveredIps.forEach(ip => allDiscoveredIps.add(ip));
  }
  
  const discoveredIps = allDiscoveredIps;
  
  console.log(`[${TAG}] Ping sweep found ${discoveredIps.size} active IPs across ${subnetsToScan.length} subnets`);
  onProgress?.(50, `Found ${discoveredIps.size} devices, getting details...`);
  
  let arpEntries: Array<{ mac: string; ip: string; hostname?: string }> = [];
  try {
    arpEntries = await nativeGetArpTable();
    console.log(`[${TAG}] ARP table has ${arpEntries.length} entries`);
  } catch (error) {
    console.log(`[${TAG}] ARP table read failed: ${error}`);
  }
  
  const devices: Array<{ ip: string; mac: string; hostname?: string }> = [];
  for (const ip of discoveredIps) {
    const arpEntry = arpEntries.find(e => e.ip === ip);
    devices.push({
      ip,
      mac: arpEntry?.mac || 'unknown',
      hostname: arpEntry?.hostname,
    });
  }
  
  console.log(`[${TAG}] Merged ${devices.length} devices from ping sweep + ARP`);
  onProgress?.(55, `Processing ${devices.length} devices...`);
  
  const totalDevices = devices.length;
  let processed = 0;
  let gatewayFound = false;
  
  perfLogger.log('scanNetwork', 'processing_devices', { total: totalDevices });
  
  for (const deviceInfo of devices) {
    perfLogger.mark(`device:${deviceInfo.ip}:start`);
    
    perfLogger.mark(`portScan:${deviceInfo.ip}:start`);
    const openPorts = await scanDevicePorts(deviceInfo.ip, portsToScan);
    perfLogger.measure(`portScan`, `portScan:${deviceInfo.ip}:start`, { ip: deviceInfo.ip, openPorts: openPorts.length });
    
    perfLogger.mark('classify:start');
    const vendor = getDeviceManufacturer(deviceInfo.mac);
    const deviceType = classifyDevice(deviceInfo.mac, vendor, deviceInfo.hostname, openPorts);
    perfLogger.measure('classify', 'classify:start', { ip: deviceInfo.ip, type: deviceType });
    
    let cameraEndpoints = undefined;
    const hasRtspPort = openPorts.some(p => p.number === 554 || p.number === 8554);
    if (deviceType === 'camera' || hasRtspPort) {
      perfLogger.mark(`cameraDiscovery:${deviceInfo.ip}:start`);
      try {
        cameraEndpoints = await discoverCameraEndpoints(deviceInfo.ip, openPorts);
        perfLogger.measure('cameraDiscovery', `cameraDiscovery:${deviceInfo.ip}:start`, { ip: deviceInfo.ip, found: !!cameraEndpoints });
      } catch (error) {
        perfLogger.log('scanNetwork', 'camera_discovery_failed', { ip: deviceInfo.ip, error: String(error) });
        console.log(`[${TAG}] Camera discovery failed for ${deviceInfo.ip}:`, error);
      }
    }
    
    perfLogger.mark('threatAnalysis:start');
    const { threatLevel, reasons } = analyzeThreatLevel(deviceType, openPorts, networkInfo);
    perfLogger.measure('threatAnalysis', 'threatAnalysis:start', { ip: deviceInfo.ip, level: threatLevel });
    
    const device: Device = {
      mac: deviceInfo.mac,
      ip: deviceInfo.ip,
      hostname: deviceInfo.hostname,
      vendor,
      deviceType,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      openPorts,
      isGateway: deviceInfo.ip === gatewayIp,
      threatLevel,
      threatReasons: reasons,
      cameraEndpoints,
    };
    
    if (device.isGateway) {
      gatewayFound = true;
    }
    
    perfLogger.mark('onDeviceFound:start');
    onDeviceFound(device);
    perfLogger.measure('onDeviceFound', 'onDeviceFound:start', { ip: deviceInfo.ip });
    
    processed++;
    const progress = 55 + Math.floor((processed / totalDevices) * 40);
    onProgress?.(progress, `Scanning device ${processed}/${totalDevices}...`);
    
    perfLogger.mark('yieldToUiThread:start');
    await yieldToUiThread();
    perfLogger.measure('yieldToUiThread', 'yieldToUiThread:start');
    
    perfLogger.measure('device_processing', `device:${deviceInfo.ip}:start`, { ip: deviceInfo.ip });
  }
  
  if (!gatewayFound) {
    perfLogger.log('scanNetwork', 'adding_gateway', { ip: gatewayIp });
    perfLogger.mark('gatewayScan:start');
    const gatewayPorts = await scanDevicePorts(gatewayIp, portsToScan);
    const { threatLevel, reasons } = analyzeThreatLevel('router', gatewayPorts, networkInfo);
    perfLogger.measure('gatewayScan', 'gatewayScan:start');
    
    const gatewayDevice: Device = {
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
    };
    
    onDeviceFound(gatewayDevice);
  }
  
  console.log(`[${TAG}] Scan complete`);
  perfLogger.log('scanNetwork', 'complete', { totalDevices, processed });
  onProgress?.(100, 'Scan complete');
}

function yieldToUiThread(): Promise<void> {
  return new Promise((resolve) => {
    perfLogger.mark('InteractionManager:start');
    InteractionManager.runAfterInteractions(() => {
      perfLogger.measure('InteractionManager', 'InteractionManager:start');
      resolve();
    });
  });
}

async function scanDevicePorts(ip: string, ports?: number[]): Promise<Port[]> {
  const portsToScan = ports ?? DEFAULT_PORTS;
  
  try {
    perfLogger.mark(`nativeScanPorts:${ip}:start`);
    const results = await nativeScanPorts(ip, portsToScan);
    perfLogger.measure('nativeScanPorts', `nativeScanPorts:${ip}:start`, { ip, resultCount: results.length });
    
    return results
      .filter((p: { state: string }) => p.state === 'open')
      .map((p: { number: number; protocol: string; service?: string; state: string }) => ({
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

async function pingSweepWithProgress(
  subnet: string,
  onProgress?: (scanned: number, total: number) => void
): Promise<Set<string>> {
  const discoveredIps = new Set<string>();
  const range = 254;
  const batchSize = 20;
  let scanned = 0;

  for (let i = 1; i < range; i += batchSize) {
    const promises: Promise<void>[] = [];
    const batch = Math.min(batchSize, range - i);
    
    for (let j = 0; j < batch; j++) {
      const ip = `${subnet}.${i + j}`;
      
      promises.push(
        (async () => {
          try {
            const result = await nativePing(ip);
            if (result.success) {
              discoveredIps.add(ip);
            }
          } catch {
            // Ignore
          }
        })()
      );
    }
    
    await Promise.all(promises);
    scanned += batch;
    onProgress?.(scanned, range - 1);
  }
  
  return discoveredIps;
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

export async function pingDevice(ip: string): Promise<{ success: boolean; time?: number }> {
  try {
    return await nativePing(ip);
  } catch {
    return { success: false };
  }
}

export { isNativeModuleAvailable };

export interface BackgroundScanCallbacks {
  onDeviceFound: (device: Device) => void;
  onProgress: (progress: number, message: string) => void;
  onComplete: (totalDevices: number, cancelled: boolean) => void;
  onError: (error: Error) => void;
}

export interface BackgroundScanController {
  cancel: () => void;
  flush: () => Device[];
}

export function startBackgroundScan(
  callbacks: BackgroundScanCallbacks,
  options?: { customPorts?: number[] }
): BackgroundScanController {
  const ports = getPortsToScan(options?.customPorts ?? []);
  
  const progressSub = addScanProgressListener(({ progress, message }) => {
    callbacks.onProgress(progress, message);
  });
  
  let pendingDevices: Device[] = [];
  let rafScheduled = false;
  
  const flushDevices = () => {
    const toAdd = [...pendingDevices];
    pendingDevices = [];
    rafScheduled = false;
    toAdd.forEach(device => callbacks.onDeviceFound(device));
  };
  
  const deviceSub = addDeviceFoundListener((event) => {
    const device: Device = {
      mac: event.mac,
      ip: event.ip,
      hostname: event.hostname,
      vendor: event.vendor,
      deviceType: event.deviceType as DeviceType,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      openPorts: event.openPorts?.map(p => ({
        number: p.number,
        protocol: p.protocol as 'tcp' | 'udp',
        service: p.service,
        state: 'open' as const,
      })),
      isGateway: event.isGateway,
      threatLevel: event.threatLevel as ThreatLevel,
      threatReasons: event.threatReasons,
      cameraEndpoints: event.snapshotUrl ? {
        snapshotUrl: event.snapshotUrl,
        requiresAuth: event.requiresAuth,
      } : undefined,
    };
    
    pendingDevices.push(device);
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(flushDevices);
    }
  });
  
  const completeSub = addScanCompleteListener(({ totalDevices, cancelled }) => {
    if (pendingDevices.length > 0) {
      pendingDevices.forEach(device => callbacks.onDeviceFound(device));
      pendingDevices = [];
      rafScheduled = false;
    }
    cleanup();
    callbacks.onComplete(totalDevices, cancelled);
  });
  
  const errorSub = addScanErrorListener(({ code, message }) => {
    cleanup();
    callbacks.onError(new Error(`${code}: ${message}`));
  });
  
  const cleanup = () => {
    progressSub.remove();
    deviceSub.remove();
    completeSub.remove();
    errorSub.remove();
    pendingDevices = [];
    rafScheduled = false;
  };
  
  startFullScan(ports).catch((error) => {
    cleanup();
    callbacks.onError(error);
  });
  
  return {
    cancel: async () => {
      await cancelScan();
    },
    flush: () => {
      const toAdd = [...pendingDevices];
      pendingDevices = [];
      rafScheduled = false;
      return toAdd;
    },
  };
}
