import { useState, useEffect, useCallback } from 'react';
import { useDeviceStore } from '../stores/scanStore';
import { scanNetwork, getNetworkInfo } from '../services/networkScanner';
import type { Device, NetworkInfo } from '@shared/src/types/device';

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

  const initializeNetwork = useCallback(async () => {
    try {
      const networkInfo = await getNetworkInfo();
      if (networkInfo) {
        setCurrentNetwork(networkInfo);
      }
    } catch (error) {
      console.error('Failed to get network info:', error);
    }
  }, [setCurrentNetwork]);

  const startScan = useCallback(async () => {
    if (isScanning) return;

    // Get fresh network info before scanning
    await initializeNetwork();
    
    if (!currentNetwork && !await getNetworkInfo()) {
      throw new Error('Not connected to WiFi');
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
  }, [isScanning, currentNetwork, setIsScanning, setScanProgress, clearScan, setDevices, setLastScanTime, initializeNetwork]);

  useEffect(() => {
    initializeNetwork();
  }, [initializeNetwork]);

  return {
    currentNetwork,
    devices,
    lastScanTime,
    isScanning,
    scanProgress,
    startScan,
    initializeNetwork,
    setCurrentNetwork,
  };
}
