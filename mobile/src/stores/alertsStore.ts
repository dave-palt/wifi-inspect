import { create } from 'zustand';
import type { NetworkAlert } from '@shared/src/types/api';

interface AlertsState {
  networkAlerts: NetworkAlert[];
  networkReputation: number;
  totalReports: number;
  isLoading: boolean;
  lastChecked: number | null;
  
  setNetworkAlerts: (alerts: NetworkAlert[]) => void;
  setNetworkReputation: (reputation: number) => void;
  setTotalReports: (count: number) => void;
  setIsLoading: (loading: boolean) => void;
  setLastChecked: (time: number) => void;
  clearAlerts: () => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  networkAlerts: [],
  networkReputation: 1.0,
  totalReports: 0,
  isLoading: false,
  lastChecked: null,

  setNetworkAlerts: (alerts) => set({ networkAlerts: alerts }),
  setNetworkReputation: (reputation) => set({ networkReputation: reputation }),
  setTotalReports: (count) => set({ totalReports: count }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setLastChecked: (time) => set({ lastChecked: time }),
  clearAlerts: () => set({ networkAlerts: [], networkReputation: 1.0, totalReports: 0 }),
}));
