import { useState, useEffect, useCallback } from 'react';
import { useDeviceStore } from '../stores/scanStore';
import { useSettingsStore } from '../stores/settingsStore';
import { 
  scanNetwork, 
  getNetworkInfoWithDebug, 
  isNativeModuleAvailable,
  NetworkInfoError 
} from '../services/networkScanner';
import { usePermissions } from './usePermissions';
import { perfLogger } from '../utils/perfLogger';
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
  scanMessage: string;
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
    scanMessage,
    setCurrentNetwork,
    addDevice,
    setLastScanTime,
    setIsScanning,
    setScanProgress,
    clearScan,
  } = useDeviceStore();

  const { customPorts, scanAllSubnets } = useSettingsStore();

  const permissions = usePermissions();
  
  const [blockReason, setBlockReason] = useState<ScanBlockReason | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<NetworkInfoError | null>(null);

  const checkNetworkStatus = useCallback(async () => {
    perfLogger.startTrace('checkNetworkStatus');
    
    if (permissions.isChecking) {
      setBlockReason('checking');
      setBlockMessage('Checking permissions...');
      perfLogger.log('checkNetworkStatus', 'blocked', { reason: 'permissions_checking' });
      return;
    }

    if (!isNativeModuleAvailable()) {
      setBlockReason('native_unavailable');
      setBlockMessage('Network scanner not available. Please rebuild the app.');
      perfLogger.log('checkNetworkStatus', 'blocked', { reason: 'native_unavailable' });
      return;
    }

    if (permissions.locationPermission === 'permanently_denied') {
      setBlockReason('permission_denied_permanent');
      setBlockMessage('Location permission denied. Please enable it in Settings.');
      perfLogger.log('checkNetworkStatus', 'blocked', { reason: 'permission_denied_permanent' });
      return;
    }

    if (permissions.locationPermission === 'denied' || permissions.locationPermission === 'can_ask_again') {
      setBlockReason('no_permission');
      setBlockMessage('Location permission is required to detect WiFi networks.');
      perfLogger.log('checkNetworkStatus', 'blocked', { reason: 'no_permission' });
      return;
    }

    if (!permissions.locationServicesEnabled) {
      setBlockReason('location_disabled');
      setBlockMessage('Location services are disabled. Please enable Location (GPS).');
      perfLogger.log('checkNetworkStatus', 'blocked', { reason: 'location_disabled' });
      return;
    }

    perfLogger.mark('getNetworkInfo:start');
    const result = await getNetworkInfoWithDebug();
    perfLogger.measure('getNetworkInfo', 'getNetworkInfo:start');
    
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
      perfLogger.endTrace('checkNetworkStatus', { success: false, error: result.error.type });
      return;
    }

    setNetworkError(null);
    setBlockReason(null);
    setBlockMessage(null);
    
    if (result.networkInfo) {
      setCurrentNetwork(result.networkInfo);
    }
    
    perfLogger.endTrace('checkNetworkStatus', { success: true, ssid: result.networkInfo?.ssid });
  }, [
    permissions.isChecking,
    permissions.locationPermission,
    permissions.locationServicesEnabled,
    setCurrentNetwork,
  ]);

  const startScan = useCallback(async () => {
    perfLogger.startTrace('startScan');
    perfLogger.log('scan', 'initiated');
    
    if (isScanning) {
      perfLogger.log('scan', 'skipped', { reason: 'already_scanning' });
      return;
    }

    perfLogger.mark('checkNetworkStatus:before');
    await checkNetworkStatus();
    perfLogger.measure('checkNetworkStatus', 'checkNetworkStatus:before');
    
    if (blockReason) {
      perfLogger.endTrace('startScan', { success: false, reason: blockReason });
      throw new Error(blockMessage || 'Cannot scan network');
    }

    perfLogger.log('scan', 'starting');
    setIsScanning(true);
    setScanProgress(0, 'Starting scan...');
    clearScan();

    let deviceCount = 0;
    let progressUpdates = 0;

    try {
      perfLogger.mark('scanNetwork:start');
      await scanNetwork({
        onDeviceFound: (device) => {
          deviceCount++;
          perfLogger.log('scan', 'device_found', { ip: device.ip, type: device.deviceType, count: deviceCount });
          addDevice(device);
        },
        onProgress: (progress, message) => {
          progressUpdates++;
          perfLogger.log('scan', 'progress', { progress, message, updateCount: progressUpdates });
          setScanProgress(progress, message);
        },
      }, { customPorts, scanAllSubnets });
      perfLogger.measure('scanNetwork', 'scanNetwork:start', { deviceCount, progressUpdates });
      
      setLastScanTime(Date.now());
      perfLogger.endTrace('startScan', { success: true, deviceCount });
    } catch (error) {
      console.error('Scan failed:', error);
      perfLogger.endTrace('startScan', { success: false, error: String(error) });
      throw error;
    } finally {
      perfLogger.log('scan', 'finishing');
      setIsScanning(false);
      setScanProgress(100, 'Scan complete');
      perfLogger.log('scan', 'finished');
    }
  }, [isScanning, blockReason, blockMessage, checkNetworkStatus, setIsScanning, setScanProgress, clearScan, addDevice, setLastScanTime, customPorts, scanAllSubnets]);

  const retry = useCallback(async () => {
    await permissions.checkPermissions();
    await checkNetworkStatus();
  }, [permissions.checkPermissions, checkNetworkStatus]);

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
    scanMessage,
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
