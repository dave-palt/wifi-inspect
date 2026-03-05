import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface SettingsState {
  backendUrl: string;
  locationEnabled: boolean;
  autoScanEnabled: boolean;
  cameraAlertsEnabled: boolean;
  deviceId: string | null;
  
  setBackendUrl: (url: string) => void;
  setLocationEnabled: (enabled: boolean) => void;
  setAutoScanEnabled: (enabled: boolean) => void;
  setCameraAlertsEnabled: (enabled: boolean) => void;
  initializeSettings: () => Promise<void>;
}

const DEFAULT_BACKEND_URL = 'http://10.0.2.2:3000';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  backendUrl: DEFAULT_BACKEND_URL,
  locationEnabled: false,
  autoScanEnabled: true,
  cameraAlertsEnabled: true,
  deviceId: null,

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
      
      set({ deviceId });
    } catch (error) {
      console.error('Failed to initialize settings:', error);
    }
  },
}));
