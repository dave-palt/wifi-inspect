import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDeviceStore } from '../stores/scanStore';
import { useSettingsStore } from '../stores/settingsStore';
import { 
  scanNetwork, 
  getNetworkInfoWithDebug, 
  isNativeModuleAvailable,
  NetworkInfoError,
  startBackgroundScan,
  type BackgroundScanController,
} from '../services/networkScanner';
import { updateCachedDevices } from '../services/networkCache';
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
    isCancelling,
    scanProgress,
    scanMessage,
    setCurrentNetwork,
    addDevice,
    addDevices,
    setLastScanTime,
    setIsScanning,
    setIsCancelling,
    setScanProgress,
    persistToCache,
    markAllDevicesPending,
    removePendingDevices,
  } = useDeviceStore();

  const { customPorts, scanAllSubnets } = useSettingsStore();
  const scanRef = useRef<BackgroundScanController | null>(null);
  const appStateRef = useRef<AppStateStatus>('active');

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
    markAllDevicesPending();
    setIsScanning(true);
    setScanProgress(0, 'Starting scan...');

    scanRef.current = startBackgroundScan({
      onDeviceFound: (device) => {
        perfLogger.log('scan', 'device_found', { ip: device.ip, type: device.deviceType });
        addDevice(device);
      },
      onProgress: (progress, message) => {
        perfLogger.log('scan', 'progress', { progress, message });
        setScanProgress(progress, message);
      },
      onComplete: async (totalDevices, cancelled) => {
        setIsScanning(false);
        setIsCancelling(false);
        
        if (!cancelled) {
          removePendingDevices();
          setLastScanTime(Date.now());
          await persistToCache();
        }
        
        setScanProgress(100, cancelled ? 'Scan cancelled' : 'Scan complete');
        perfLogger.endTrace('startScan', { success: true, totalDevices, cancelled });
      },
      onError: (error) => {
        setIsScanning(false);
        setIsCancelling(false);
        console.error('Scan error:', error);
        perfLogger.endTrace('startScan', { success: false, error: error.message });
      },
    }, { customPorts });
  }, [isScanning, blockReason, blockMessage, checkNetworkStatus, setIsScanning, setIsCancelling, setScanProgress, addDevice, setLastScanTime, persistToCache, markAllDevicesPending, removePendingDevices, customPorts]);

  const cancelScan = useCallback(async () => {
    if (scanRef.current && isScanning) {
      setIsCancelling(true);
      scanRef.current.cancel();
    }
  }, [isScanning, setIsCancelling]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      if (previousState !== 'active' && nextAppState === 'active') {
        perfLogger.log('appState', 'foreground', { wasScanning: isScanning });
        
        if (scanRef.current && isScanning) {
          const pendingDevices = scanRef.current.flush();
          if (pendingDevices.length > 0) {
            perfLogger.log('appState', 'flushed_pending_devices', { count: pendingDevices.length });
            addDevices(pendingDevices);
          }
        }
        
        if (currentNetwork && devices.length > 0) {
          persistToCache();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isScanning, currentNetwork, devices.length, addDevices, persistToCache]);

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
    isCancelling,
    scanProgress,
    scanMessage,
    blockReason,
    blockMessage,
    networkError,
    canScan: !blockReason && !isScanning,
    startScan,
    cancelScan,
    checkNetworkStatus,
    retry,
    setCurrentNetwork,
    permissions,
  };
}
