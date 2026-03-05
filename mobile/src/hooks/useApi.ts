import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useSettingsStore } from '../stores/settingsStore';

export function useApi() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const { backendUrl } = useSettingsStore();

  useEffect(() => {
    const init = async () => {
      await apiService.initialize();
      setIsInitialized(true);
    };
    init();
  }, []);

  useEffect(() => {
    apiService.setBaseUrl(backendUrl);
  }, [backendUrl]);

  const checkHealth = useCallback(async () => {
    try {
      const health = await apiService.getHealth();
      setIsOnline(health.status === 'healthy');
      return health;
    } catch {
      setIsOnline(false);
      return null;
    }
  }, []);

  return {
    isInitialized,
    isOnline,
    checkHealth,
    api: apiService,
  };
}
