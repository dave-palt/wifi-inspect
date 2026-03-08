import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { NetworkAlert } from '@shared/src/types/api';

export function useAlerts() {
  const [alerts, setAlerts] = useState<NetworkAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async (geohash?: string) => {
    setLoading(true);
    setError(null);

    try {
      const fetchedAlerts = await apiService.getNearbyAlerts(geohash);
      
      // Transform API alerts to NetworkAlert format
      const transformedAlerts: NetworkAlert[] = fetchedAlerts.map(a => ({
        id: parseInt(a.ssid.charCodeAt(0).toString()) || 0,
        type: a.alertType,
        severity: a.severity,
        description: `${a.alertType.replace(/_/g, ' ')} detected on network "${a.ssid}"`,
        createdAt: a.reportedAt,
      }));
      
      setAlerts(transformedAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const refreshAlerts = useCallback(async (geohash?: string) => {
    await fetchAlerts(geohash);
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    error,
    refreshAlerts,
  };
}
