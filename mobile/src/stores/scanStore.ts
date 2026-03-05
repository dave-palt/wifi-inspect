import { create } from 'zustand';
import type { Device, NetworkInfo, ScanResult } from '@shared/src/types/device';

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

  setCurrentNetwork: (network) => set({ currentNetwork: network }),
  
  setDevices: (devices) => set({ devices }),
  
  addDevice: (device) => set((state) => ({
    devices: [...state.devices, device],
  })),
  
  updateDevice: (mac, updates) => set((state) => ({
    devices: state.devices.map((d) =>
      d.mac === mac ? { ...d, ...updates } : d
    ),
  })),
  
  setLastScanTime: (time) => set({ lastScanTime: time }),
  
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  
  setScanProgress: (progress) => set({ scanProgress: progress }),
  
  clearScan: () => set({ devices: [], lastScanTime: null, scanProgress: 0 }),
}));
