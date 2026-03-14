import { create } from 'zustand';
import type { Device, NetworkInfo, ScanResult } from '@shared/src/types/device';
import { perfLogger } from '../utils/perfLogger';

let deviceUpdateCount = 0;
let progressUpdateCount = 0;

interface ScanState {
  currentNetwork: NetworkInfo | null;
  devices: Device[];
  lastScanTime: number | null;
  isScanning: boolean;
  scanProgress: number;
  
  setCurrentNetwork: (network: NetworkInfo | null) => void;
  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  updateDevice: (mac: string, updates: Partial<Device>) => void;
  setLastScanTime: (time: number) => void;
  setIsScanning: (scanning: boolean) => void;
  setScanProgress: (progress: number) => void;
  clearScan: () => void;
}

export const useDeviceStore = create<ScanState>((set, get) => ({
  currentNetwork: null,
  devices: [],
  lastScanTime: null,
  isScanning: false,
  scanProgress: 0,

  setCurrentNetwork: (network) => {
    perfLogger.log('store', 'setCurrentNetwork', { ssid: network?.ssid });
    set({ currentNetwork: network });
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
    set((state) => ({
      devices: [...state.devices, device],
    }));
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
    set({ isScanning: scanning });
  },
  
  setScanProgress: (progress) => {
    progressUpdateCount++;
    perfLogger.log('store', 'setScanProgress', { 
      progress, 
      updateCount: progressUpdateCount 
    });
    set({ scanProgress: progress });
  },
  
  clearScan: () => {
    perfLogger.log('store', 'clearScan');
    set({ devices: [], lastScanTime: null, scanProgress: 0 });
  },
}));
