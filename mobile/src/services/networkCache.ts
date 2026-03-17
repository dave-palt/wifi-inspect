import * as FileSystem from 'expo-file-system';
import type { Device, NetworkInfo } from '@shared/src/types/device';
import { hashBssid } from '../utils/crypto';

const CACHE_DIR = `${FileSystem.documentDirectory}network-cache/`;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CachedNetworkScan {
  networkKey: string;
  ssid: string;
  bssidHash: string;
  devices: Device[];
  lastScanTime: number;
  gatewayIp: string;
}

function getNetworkKey(network: NetworkInfo): string {
  const bssidHash = hashBssid(network.bssid || 'unknown');
  const ssidSafe = (network.ssid || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
  return `${ssidSafe}_${bssidHash.slice(0, 8)}`;
}

async function ensureCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

export async function getCachedScan(network: NetworkInfo): Promise<CachedNetworkScan | null> {
  try {
    const networkKey = getNetworkKey(network);
    const filePath = `${CACHE_DIR}${networkKey}.json`;
    
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      return null;
    }
    
    const content = await FileSystem.readAsStringAsync(filePath);
    const cached: CachedNetworkScan = JSON.parse(content);
    
    if (Date.now() - cached.lastScanTime > CACHE_EXPIRY_MS) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      return null;
    }
    
    return cached;
  } catch (error) {
    console.error('[NetworkCache] Error reading cache:', error);
    return null;
  }
}

export async function saveCachedScan(
  network: NetworkInfo, 
  devices: Device[]
): Promise<void> {
  try {
    await ensureCacheDir();
    
    const networkKey = getNetworkKey(network);
    const bssidHash = hashBssid(network.bssid || 'unknown');
    const filePath = `${CACHE_DIR}${networkKey}.json`;
    
    const cached: CachedNetworkScan = {
      networkKey,
      ssid: network.ssid,
      bssidHash,
      devices,
      lastScanTime: Date.now(),
      gatewayIp: network.gateway,
    };
    
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(cached));
  } catch (error) {
    console.error('[NetworkCache] Error saving cache:', error);
  }
}

export async function updateCachedDevices(
  network: NetworkInfo,
  devices: Device[]
): Promise<void> {
  const existingCache = await getCachedScan(network);
  
  const mergedDevices = mergeDevices(
    existingCache?.devices || [],
    devices
  );
  
  await saveCachedScan(network, mergedDevices);
  return;
}

function mergeDevices(existing: Device[], incoming: Device[]): Device[] {
  const deviceMap = new Map<string, Device>();
  
  existing.forEach(d => {
    deviceMap.set(d.mac, { ...d, stale: true });
  });
  
  incoming.forEach(d => {
    const existingDevice = deviceMap.get(d.mac);
    if (existingDevice) {
      deviceMap.set(d.mac, {
        ...d,
        firstSeen: existingDevice.firstSeen,
        stale: false,
      });
    } else {
      deviceMap.set(d.mac, { ...d, stale: false });
    }
  });
  
  return Array.from(deviceMap.values()).filter(d => !d.stale || Date.now() - d.lastSeen < 5 * 60 * 1000);
}

export async function clearCachedScan(network: NetworkInfo): Promise<void> {
  try {
    const networkKey = getNetworkKey(network);
    const filePath = `${CACHE_DIR}${networkKey}.json`;
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  } catch (error) {
    console.error('[NetworkCache] Error clearing cache:', error);
  }
}

export async function clearAllCaches(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch (error) {
    console.error('[NetworkCache] Error clearing all caches:', error);
  }
}

export async function getAllCachedNetworks(): Promise<CachedNetworkScan[]> {
  try {
    await ensureCacheDir();
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const caches: CachedNetworkScan[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await FileSystem.readAsStringAsync(`${CACHE_DIR}${file}`);
          const cached: CachedNetworkScan = JSON.parse(content);
          
          if (Date.now() - cached.lastScanTime <= CACHE_EXPIRY_MS) {
            caches.push(cached);
          } else {
            await FileSystem.deleteAsync(`${CACHE_DIR}${file}`, { idempotent: true });
          }
        } catch {
          // Skip invalid files
        }
      }
    }
    
    return caches;
  } catch (error) {
    console.error('[NetworkCache] Error getting all caches:', error);
    return [];
  }
}
