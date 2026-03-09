import { useState, useEffect, useCallback } from 'react';
import { useDeviceStore } from '../stores/scanStore';
import { 
  scanNetwork, 
  getNetworkInfoWithDebug, 
  isNativeModuleAvailable,
  NetworkInfoError 
} from '../services/networkScanner';
import { usePermissions } from './usePermissions';
import type { Device, NetworkInfo } from '@shared/src/types/device';

export type ScanBlockReason = 
  | 'checking'
  | 'no_permission'
  | 'permission_denied_permanent'
  | 'location_disabled'
  | 'not_connected'
  | 'no_ip'
  | 'native_unavailable'
  | 'unknown';

export interface ScanState {
  currentNetwork: NetworkInfo | null;
  devices: Device[];
  lastScanTime: number | null;
  isScanning: boolean;
  scanProgress: number;
  blockReason: ScanBlockReason | null;
  blockMessage: string | null;
  networkError: NetworkInfoError | null;
}

export function useNetworkScan() {
  const {
    currentNetwork,
    devices,
    lastScanTime,
    isScanning,
    scanProgress,
    setCurrentNetwork,
    setDevices,
    setLastScanTime,
    setIsScanning,
    setScanProgress,
    clearScan,
  } = useDeviceStore();

  const permissions = usePermissions();
  
  const [blockReason, setBlockReason] = useState<ScanBlockReason | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<NetworkInfoError | null>(null);

  const checkNetworkStatus = useCallback(async () => {
    if (permissions.isChecking) {
      setBlockReason('checking');
      setBlockMessage('Checking permissions...');
      return;
    }

    if (!isNativeModuleAvailable()) {
      setBlockReason('native_unavailable');
      setBlockMessage('Network scanner not available. Please rebuild the app.');
      return;
    }

    if (permissions.locationPermission === 'permanently_denied') {
      setBlockReason('permission_denied_permanent');
      setBlockMessage('Location permission denied. Please enable it in Settings.');
      return;
    }

    if (permissions.locationPermission === 'denied' || permissions.locationPermission === 'can_ask_again') {
      setBlockReason('no_permission');
      setBlockMessage('Location permission is required to detect WiFi networks.');
      return;
    }

    if (!permissions.locationServicesEnabled) {
      setBlockReason('location_disabled');
      setBlockMessage('Location services are disabled. Please enable Location (GPS).');
      return;
    }

    const result = await getNetworkInfoWithDebug();
    
    if (result.error) {
      setNetworkError(result.error);
      setCurrentNetwork(null);
      
      switch (result.error.type) {
        case 'permission':
          setBlockReason('no_permission');
          break;
        case 'not_connected':
          setBlockReason('not_connected');
          break;
        case 'no_ip':
          setBlockReason('no_ip');
          break;
        case 'native_unavailable':
          setBlockReason('native_unavailable');
          break;
        default:
          setBlockReason('unknown');
      }
      setBlockMessage(result.error.message);
      return;
    }

    setNetworkError(null);
    setBlockReason(null);
    setBlockMessage(null);
    
    if (result.networkInfo) {
      setCurrentNetwork(result.networkInfo);
    }
  }, [permissions, setCurrentNetwork]);

  const startScan = useCallback(async () => {
    if (isScanning) return;

    await checkNetworkStatus();
    
    if (blockReason) {
      throw new Error(blockMessage || 'Cannot scan network');
    }

    setIsScanning(true);
    setScanProgress(0);
    clearScan();

    try {
      const discoveredDevices = await scanNetwork((progress) => {
        setScanProgress(progress);
      });
      
      setDevices(discoveredDevices);
      setLastScanTime(Date.now());
    } catch (error) {
      console.error('Scan failed:', error);
      throw error;
    } finally {
      setIsScanning(false);
      setScanProgress(100);
    }
  }, [isScanning, blockReason, blockMessage, checkNetworkStatus, setIsScanning, setScanProgress, clearScan, setDevices, setLastScanTime]);

  const retry = useCallback(async () => {
    await permissions.checkPermissions();
    await checkNetworkStatus();
  }, [permissions, checkNetworkStatus]);

  useEffect(() => {
    checkNetworkStatus();
  }, [checkNetworkStatus]);

  useEffect(() => {
    if (!permissions.isChecking) {
      checkNetworkStatus();
    }
  }, [permissions.locationPermission, permissions.locationServicesEnabled]);

  return {
    currentNetwork,
    devices,
    lastScanTime,
    isScanning,
    scanProgress,
    blockReason,
    blockMessage,
    networkError,
    canScan: !blockReason && !isScanning,
    startScan,
    checkNetworkStatus,
    retry,
    setCurrentNetwork,
    permissions,
  };
}
