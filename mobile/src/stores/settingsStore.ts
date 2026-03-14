import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface SettingsState {
  backendUrl: string;
  locationEnabled: boolean;
  autoScanEnabled: boolean;
  cameraAlertsEnabled: boolean;
  deviceId: string | null;
  advancedMode: boolean;
  customPorts: number[];
  scanAllSubnets: boolean;
  
  setBackendUrl: (url: string) => void;
  setLocationEnabled: (enabled: boolean) => void;
  setAutoScanEnabled: (enabled: boolean) => void;
  setCameraAlertsEnabled: (enabled: boolean) => void;
  setAdvancedMode: (enabled: boolean) => void;
  setCustomPorts: (ports: number[]) => void;
  addCustomPort: (port: number) => void;
  removeCustomPort: (port: number) => void;
  setScanAllSubnets: (enabled: boolean) => void;
  initializeSettings: () => Promise<void>;
}

const DEFAULT_BACKEND_URL = 'http://10.0.2.2:3000';

const SETTINGS_KEYS = {
  advancedMode: 'settings_advanced_mode',
  customPorts: 'settings_custom_ports',
  scanAllSubnets: 'settings_scan_all_subnets',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  backendUrl: DEFAULT_BACKEND_URL,
  locationEnabled: false,
  autoScanEnabled: true,
  cameraAlertsEnabled: true,
  deviceId: null,
  advancedMode: false,
  customPorts: [],
  scanAllSubnets: false,

  setBackendUrl: (url) => {
    set({ backendUrl: url });
  },

  setLocationEnabled: (enabled) => {
    set({ locationEnabled: enabled });
  },

  setAutoScanEnabled: (enabled) => {
    set({ autoScanEnabled: enabled });
  },

  setCameraAlertsEnabled: (enabled) => {
    set({ cameraAlertsEnabled: enabled });
  },

  setAdvancedMode: async (enabled) => {
    set({ advancedMode: enabled });
    try {
      await SecureStore.setItemAsync(SETTINGS_KEYS.advancedMode, enabled.toString());
    } catch (error) {
      console.error('Failed to save advanced mode setting:', error);
    }
  },

  setCustomPorts: async (ports) => {
    set({ customPorts: ports });
    try {
      await SecureStore.setItemAsync(SETTINGS_KEYS.customPorts, JSON.stringify(ports));
    } catch (error) {
      console.error('Failed to save custom ports:', error);
    }
  },

  addCustomPort: (port) => {
    const { customPorts } = get();
    if (!customPorts.includes(port) && port >= 1 && port <= 65535) {
      const newPorts = [...customPorts, port].sort((a, b) => a - b);
      set({ customPorts: newPorts });
      SecureStore.setItemAsync(SETTINGS_KEYS.customPorts, JSON.stringify(newPorts)).catch(() => {});
    }
  },

  removeCustomPort: (port) => {
    const { customPorts } = get();
    const newPorts = customPorts.filter(p => p !== port);
    set({ customPorts: newPorts });
    SecureStore.setItemAsync(SETTINGS_KEYS.customPorts, JSON.stringify(newPorts)).catch(() => {});
  },

  setScanAllSubnets: async (enabled) => {
    set({ scanAllSubnets: enabled });
    try {
      await SecureStore.setItemAsync(SETTINGS_KEYS.scanAllSubnets, enabled.toString());
    } catch (error) {
      console.error('Failed to save scan all subnets setting:', error);
    }
  },

  initializeSettings: async () => {
    try {
      let deviceId = await SecureStore.getItemAsync('device_id');
      
      if (!deviceId) {
        deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        await SecureStore.setItemAsync('device_id', deviceId);
      }

      const advancedModeStr = await SecureStore.getItemAsync(SETTINGS_KEYS.advancedMode);
      const advancedMode = advancedModeStr === 'true';

      const customPortsStr = await SecureStore.getItemAsync(SETTINGS_KEYS.customPorts);
      let customPorts: number[] = [];
      if (customPortsStr) {
        try {
          const parsed = JSON.parse(customPortsStr);
          if (Array.isArray(parsed)) {
            customPorts = parsed.filter((p: unknown) => typeof p === 'number' && p >= 1 && p <= 65535);
          }
        } catch {
          customPorts = [];
        }
      }

      const scanAllSubnetsStr = await SecureStore.getItemAsync(SETTINGS_KEYS.scanAllSubnets);
      const scanAllSubnets = scanAllSubnetsStr === 'true';
      
      set({ deviceId, advancedMode, customPorts, scanAllSubnets });
    } catch (error) {
      console.error('Failed to initialize settings:', error);
    }
  },
}));
