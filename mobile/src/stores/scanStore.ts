import { create } from 'zustand';
import type { Device, NetworkInfo, ScanResult } from '@shared/src/types/device';
import { perfLogger } from '../utils/perfLogger';
import { getCachedScan, saveCachedScan, updateCachedDevices } from '../services/networkCache';

let deviceUpdateCount = 0;
let progressUpdateCount = 0;

interface ScanState {
  currentNetwork: NetworkInfo | null;
  devices: Device[];
  lastScanTime: number | null;
  isScanning: boolean;
  isCancelling: boolean;
  scanProgress: number;
  scanMessage: string;
  isRestoringFromCache: boolean;
  
  setCurrentNetwork: (network: NetworkInfo | null) => void;
  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  addDevices: (devices: Device[]) => void;
  updateDevice: (mac: string, updates: Partial<Device>) => void;
  setLastScanTime: (time: number) => void;
  setIsScanning: (scanning: boolean) => void;
  setIsCancelling: (cancelling: boolean) => void;
  setScanProgress: (progress: number, message?: string) => void;
  clearScan: () => void;
  restoreFromCache: (network: NetworkInfo) => Promise<boolean>;
  persistToCache: () => Promise<void>;
  mergeDevices: (newDevices: Device[]) => void;
  markAllDevicesPending: () => void;
  removePendingDevices: () => void;
}

export const useDeviceStore = create<ScanState>((set, get) => ({
  currentNetwork: null,
  devices: [],
  lastScanTime: null,
  isScanning: false,
  isCancelling: false,
  scanProgress: 0,
  scanMessage: '',
  isRestoringFromCache: false,

  setCurrentNetwork: async (network) => {
    perfLogger.log('store', 'setCurrentNetwork', { ssid: network?.ssid });
    set({ currentNetwork: network });
    
    if (network) {
      const cached = await getCachedScan(network);
      if (cached && cached.devices.length > 0) {
        perfLogger.log('store', 'restoredFromCache', { 
          deviceCount: cached.devices.length,
          lastScan: cached.lastScanTime 
        });
        set({ 
          devices: cached.devices,
          lastScanTime: cached.lastScanTime,
          isRestoringFromCache: true,
        });
      }
    }
  },
  
  setDevices: (devices) => {
    perfLogger.log('store', 'setDevices', { count: devices.length });
    set({ devices });
  },
  
  addDevice: (device) => {
    deviceUpdateCount++;
    const state = get();
    perfLogger.log('store', 'addDevice', { 
      ip: device.ip, 
      totalDevices: state.devices.length + 1,
      updateCount: deviceUpdateCount 
    });
    set((state) => {
      const existingIndex = state.devices.findIndex(d => d.mac === device.mac);
      if (existingIndex >= 0) {
        const updated = [...state.devices];
        updated[existingIndex] = { 
          ...updated[existingIndex], 
          ...device, 
          firstSeen: updated[existingIndex].firstSeen,
          stale: false 
        };
        return { devices: updated };
      }
      return { devices: [...state.devices, device] };
    });
  },
  
  addDevices: (devices) => {
    perfLogger.log('store', 'addDevices', { count: devices.length });
    set((state) => {
      const deviceMap = new Map<string, Device>();
      state.devices.forEach(d => deviceMap.set(d.mac, d));
      devices.forEach(d => {
        const existing = deviceMap.get(d.mac);
        if (existing) {
          deviceMap.set(d.mac, { 
            ...existing, 
            ...d, 
            firstSeen: existing.firstSeen,
            stale: false 
          });
        } else {
          deviceMap.set(d.mac, { ...d, stale: false });
        }
      });
      return { devices: Array.from(deviceMap.values()) };
    });
  },
  
  updateDevice: (mac, updates) => {
    perfLogger.log('store', 'updateDevice', { mac });
    set((state) => ({
      devices: state.devices.map((d) =>
        d.mac === mac ? { ...d, ...updates } : d
      ),
    }));
  },
  
  setLastScanTime: (time) => {
    perfLogger.log('store', 'setLastScanTime', { time });
    set({ lastScanTime: time });
  },
  
  setIsScanning: (scanning) => {
    perfLogger.log('store', 'setIsScanning', { scanning });
    if (scanning) {
      deviceUpdateCount = 0;
      progressUpdateCount = 0;
    }
    set({ isScanning: scanning, isRestoringFromCache: false });
  },
  
  setIsCancelling: (cancelling) => {
    perfLogger.log('store', 'setIsCancelling', { cancelling });
    set({ isCancelling: cancelling });
  },
  
  setScanProgress: (progress, message) => {
    progressUpdateCount++;
    perfLogger.log('store', 'setScanProgress', { 
      progress, 
      message,
      updateCount: progressUpdateCount 
    });
    set({ scanProgress: progress, scanMessage: message ?? '' });
  },
  
  clearScan: () => {
    perfLogger.log('store', 'clearScan');
    set({ devices: [], lastScanTime: null, scanProgress: 0, scanMessage: '', isRestoringFromCache: false });
  },
  
  restoreFromCache: async (network) => {
    const cached = await getCachedScan(network);
    if (cached && cached.devices.length > 0) {
      perfLogger.log('store', 'restoreFromCache', { deviceCount: cached.devices.length });
      set({ 
        devices: cached.devices, 
        lastScanTime: cached.lastScanTime,
        isRestoringFromCache: true,
      });
      return true;
    }
    return false;
  },
  
  persistToCache: async () => {
    const state = get();
    if (state.currentNetwork && state.devices.length > 0) {
      perfLogger.log('store', 'persistToCache', { deviceCount: state.devices.length });
      await saveCachedScan(state.currentNetwork, state.devices);
    }
  },
  
  mergeDevices: (newDevices) => {
    perfLogger.log('store', 'mergeDevices', { incoming: newDevices.length });
    set((state) => {
      const deviceMap = new Map<string, Device>();
      
      state.devices.forEach(d => {
        deviceMap.set(d.mac, { ...d, stale: true });
      });
      
      newDevices.forEach(d => {
        const existing = deviceMap.get(d.mac);
        if (existing) {
          deviceMap.set(d.mac, { 
            ...existing, 
            ...d, 
            firstSeen: existing.firstSeen,
            stale: false 
          });
        } else {
          deviceMap.set(d.mac, { ...d, stale: false });
        }
      });
      
      const merged = Array.from(deviceMap.values()).filter(d => !d.stale);
      return { devices: merged };
    });
  },
  
  markAllDevicesPending: () => {
    perfLogger.log('store', 'markAllDevicesPending');
    set((state) => ({
      devices: state.devices.map(d => ({ ...d, stale: true })),
    }));
  },
  
  removePendingDevices: () => {
    perfLogger.log('store', 'removePendingDevices');
    set((state) => {
      const activeDevices = state.devices.filter(d => !d.stale);
      perfLogger.log('store', 'removedStaleDevices', { 
        before: state.devices.length, 
        after: activeDevices.length 
      });
      return { devices: activeDevices };
    });
  },
}));
