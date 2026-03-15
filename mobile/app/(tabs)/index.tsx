import { useState, useCallback, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Radio, Shield, AlertTriangle, MapPin } from 'lucide-react-native';
import { useNetworkScan, ScanBlockReason } from '../../src/hooks/useNetworkScan';
import { useDeviceStore } from '../../src/stores/scanStore';
import { useAlertsStore } from '../../src/stores/alertsStore';
import { apiService } from '../../src/services/api';
import { hashBssid } from '../../src/utils/crypto';
import { FAB } from '../../src/components/FAB';
import { NetworkStatusBar } from '../../src/components/NetworkStatusBar';
import { ThreatAlert } from '../../src/components/ThreatAlert';
import { BottomSheet } from '../../src/components/BottomSheet';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';

function getBlockReasonIcon(reason: ScanBlockReason) {
  switch (reason) {
    case 'no_permission':
    case 'permission_denied_permanent':
      return <MapPin size={24} color="#f59e0b" />;
    case 'location_disabled':
      return <MapPin size={24} color="#f59e0b" />;
    default:
      return <AlertTriangle size={24} color="#f59e0b" />;
  }
}

function getBlockReasonAction(
  reason: ScanBlockReason, 
  onRequestPermission: () => void,
  onOpenSettings: () => void,
  onEnableLocation: () => void,
  onRetry: () => void
): { label: string; onPress: () => void } | null {
  switch (reason) {
    case 'no_permission':
      return { label: 'Grant Permission', onPress: onRequestPermission };
    case 'permission_denied_permanent':
      return { label: 'Open Settings', onPress: onOpenSettings };
    case 'location_disabled':
      return { label: 'Enable Location', onPress: onEnableLocation };
    case 'native_unavailable':
      return { label: 'Retry', onPress: onRetry };
    default:
      return { label: 'Retry', onPress: onRetry };
  }
}

export default function ScanScreen() {
  const router = useRouter();
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showNetworkSheet, setShowNetworkSheet] = useState(false);
  
  const { 
    startScan, 
    currentNetwork, 
    blockReason, 
    blockMessage,
    canScan,
    retry,
    permissions,
    isScanning,
    scanProgress,
    scanMessage,
  } = useNetworkScan();
  
  const { devices, lastScanTime } = useDeviceStore();
  const { networkAlerts, networkReputation, totalReports, setNetworkAlerts, setNetworkReputation, setTotalReports, setIsLoading } = useAlertsStore();

  const checkNetworkAgainstBackend = useCallback(async () => {
    if (!currentNetwork?.ssid || currentNetwork.ssid === 'Unknown Network') return;
    
    setIsCheckingNetwork(true);
    setIsLoading(true);
    
    try {
      const bssidHash = hashBssid(currentNetwork.bssid);
      const result = await apiService.checkNetwork(currentNetwork.ssid, bssidHash);
      
      if (result.alerts && result.alerts.length > 0) {
        setNetworkAlerts(result.alerts);
      }
      setNetworkReputation(result.reputation);
      setTotalReports(result.totalReports);
    } catch (error) {
      console.error('Failed to check network:', error);
    } finally {
      setIsLoading(false);
      setIsCheckingNetwork(false);
    }
  }, [currentNetwork, setNetworkAlerts, setNetworkReputation, setTotalReports, setIsLoading]);

  useEffect(() => {
    if (currentNetwork?.ssid && currentNetwork.ssid !== 'Unknown Network') {
      checkNetworkAgainstBackend();
    }
  }, [currentNetwork?.ssid]);

  const handleScan = useCallback(async () => {
    if (!canScan) return;
    
    try {
      await startScan();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scan network. Please try again.';
      Alert.alert('Scan Error', message);
    }
  }, [canScan, startScan]);

  const handleRequestPermission = useCallback(async () => {
    const granted = await permissions.requestPermission();
    if (!granted && permissions.locationPermission === 'permanently_denied') {
      Alert.alert(
        'Permission Required',
        'Location permission is permanently denied. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => permissions.openSettings() },
        ]
      );
    }
  }, [permissions]);

  const handleOpenSettings = useCallback(() => {
    permissions.openSettings();
  }, [permissions]);

  const handleEnableLocation = useCallback(() => {
    permissions.promptEnableLocation();
  }, [permissions]);

  const handleRetry = useCallback(async () => {
    await retry();
  }, [retry]);

  const handleReportNetwork = useCallback(async () => {
    if (!currentNetwork || devices.length === 0) return;

    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Report Network',
        `This will report "${currentNetwork.ssid}" as a network with potential camera threats. This helps keep other travelers safe. Continue?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Report', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirmed) return;

    setIsReporting(true);
    try {
      const bssidHash = hashBssid(currentNetwork.bssid);
      const cameraDevices = devices.filter(d => d.deviceType === 'camera' || (d.threatLevel ?? 0) >= 3);

      await apiService.reportNetwork({
        ssid: currentNetwork.ssid,
        bssidHash,
        securityType: currentNetwork.securityType,
        devicesFound: cameraDevices.map(d => ({
          ip: d.ip,
          mac: d.mac,
          openPorts: d.openPorts?.map((p: { number: number }) => p.number) || [],
          deviceType: d.deviceType || 'unknown',
        })),
        threatLevel: Math.max(...cameraDevices.map(d => d.threatLevel || 0), 0),
      });

      Alert.alert('Success', 'Network reported. Thank you for helping keep others safe!');
      checkNetworkAgainstBackend();
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert('Error', 'Failed to report network. Please try again.');
    } finally {
      setIsReporting(false);
    }
  }, [currentNetwork, devices, checkNetworkAgainstBackend]);

  const deviceCount = devices.length;
  const cameraCount = devices.filter(d => d.deviceType === 'camera').length;
  const threatCount = devices.filter(d => (d.threatLevel ?? 0) >= 3).length;

  const getReputationStatus = (): 'safe' | 'unknown' | 'warning' | 'danger' => {
    if (networkAlerts.length > 0) return 'danger';
    if (networkReputation < 0.5) return 'warning';
    if (networkReputation < 0.8) return 'unknown';
    return 'safe';
  };

  const blockAction = blockReason 
    ? getBlockReasonAction(
        blockReason, 
        handleRequestPermission, 
        handleOpenSettings, 
        handleEnableLocation,
        handleRetry
      )
    : null;

  return (
    <View className="flex-1 bg-slate-950">
      <NetworkStatusBar
        ssid={currentNetwork?.ssid || 'Unknown Network'}
        isConnected={!!currentNetwork}
        isChecking={isCheckingNetwork}
        reputation={getReputationStatus()}
        alertCount={networkAlerts.length}
        onPress={() => setShowNetworkSheet(true)}
      />

      {(threatCount > 0 || cameraCount > 0) && !blockReason && (
        <ThreatAlert threatCount={threatCount} cameraCount={cameraCount} />
      )}

      <View className="flex-1 justify-center items-center px-8">
        {blockReason ? (
          <View className="items-center gap-6">
            <View className="w-20 h-20 rounded-full bg-slate-800 items-center justify-center">
              {getBlockReasonIcon(blockReason)}
            </View>
            
            <View className="items-center gap-3">
              <Text className="text-white text-lg font-semibold text-center">
                {blockReason === 'not_connected' ? 'Not Connected to WiFi' : 
                 blockReason === 'no_permission' ? 'Permission Required' :
                 blockReason === 'permission_denied_permanent' ? 'Permission Denied' :
                 blockReason === 'location_disabled' ? 'Location Disabled' :
                 'Unable to Scan'}
              </Text>
              <Text className="text-slate-400 text-sm text-center max-w-[280px]">
                {blockMessage}
              </Text>
            </View>

            {blockAction && (
              <Button
                variant="primary"
                onPress={blockAction.onPress}
                style={{ minWidth: 160 }}
              >
                {blockAction.label}
              </Button>
            )}

            {blockReason === 'permission_denied_permanent' && (
              <Text className="text-slate-500 text-xs text-center mt-3">
                Go to: Settings {'>'} Apps {'>'} CamDetect {'>'} Permissions
              </Text>
            )}
          </View>
        ) : (
          <>
            <FAB
              size="xl"
              onPress={handleScan}
              loading={isScanning}
              disabled={!canScan}
              icon={<Radio size={52} color="#fff" />}
              label={'Scan Network'}
              sublabel={!currentNetwork ? 'Checking connection...' : deviceCount > 0 ? `${deviceCount} devices found` : 'Tap to detect devices'}
              progress={scanProgress}
              progressMessage={scanMessage}
            />

            {lastScanTime && (
              <Text className="text-slate-500 text-xs mt-6">
                Last scan: {new Date(lastScanTime).toLocaleTimeString()}
              </Text>
            )}
          </>
        )}
      </View>

      {deviceCount > 0 && !blockReason && (
        <View className="px-6 pb-6">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-slate-800 p-4 rounded-2xl items-center">
              <Text className="text-white text-2xl font-bold">{deviceCount}</Text>
              <Text className="text-slate-400 text-xs">Devices</Text>
            </View>
            <View className={`flex-1 p-4 rounded-2xl items-center ${cameraCount > 0 ? 'bg-red-500/20' : 'bg-slate-800'}`}>
              <Text className={`text-2xl font-bold ${cameraCount > 0 ? 'text-red-500' : 'text-white'}`}>{cameraCount}</Text>
              <Text className="text-slate-400 text-xs">Cameras</Text>
            </View>
            <View className={`flex-1 p-4 rounded-2xl items-center ${threatCount > 0 ? 'bg-amber-500/20' : 'bg-slate-800'}`}>
              <Text className={`text-2xl font-bold ${threatCount > 0 ? 'text-amber-500' : 'text-white'}`}>{threatCount}</Text>
              <Text className="text-slate-400 text-xs">Threats</Text>
            </View>
          </View>
        </View>
      )}

      <BottomSheet
        visible={showNetworkSheet}
        onClose={() => setShowNetworkSheet(false)}
        title="Network Details"
      >
        {currentNetwork ? (
          <View className="gap-4">
            <View className="bg-slate-800 p-4 rounded-2xl">
              <Text className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">Network Name</Text>
              <Text className="text-white text-lg font-semibold">{currentNetwork.ssid}</Text>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 bg-slate-800 p-4 rounded-2xl">
                <Text className="text-slate-500 text-[11px] mb-1">IP Address</Text>
                <Text className="text-white font-medium">{currentNetwork.ip}</Text>
              </View>
              <View className="flex-1 bg-slate-800 p-4 rounded-2xl">
                <Text className="text-slate-500 text-[11px] mb-1">Gateway</Text>
                <Text className="text-white font-medium">{currentNetwork.gateway}</Text>
              </View>
            </View>

            <View className="bg-slate-800 p-4 rounded-2xl">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-slate-500 text-[11px] uppercase tracking-wider">Reputation</Text>
                <Badge variant={getReputationStatus() === 'safe' ? 'success' : getReputationStatus() === 'danger' ? 'danger' : 'warning'}>
                  {getReputationStatus() === 'safe' ? 'Safe' : getReputationStatus() === 'danger' ? 'Risk' : 'Unknown'}
                </Badge>
              </View>
              {totalReports > 0 && (
                <Text className="text-slate-500 text-xs">{totalReports} community reports</Text>
              )}
            </View>

            {networkAlerts.length > 0 && (
              <View className="bg-red-500/10 p-4 rounded-2xl border border-red-500/40">
                <View className="flex-row items-center gap-3 mb-3">
                  <AlertTriangle size={18} color="#ef4444" />
                  <Text className="text-red-400 font-semibold">Alerts</Text>
                </View>
                {networkAlerts.map((alert, index) => (
                  <Text key={index} className="text-slate-400 text-[13px] mb-1">
                    {'\u2022'} {alert.description}
                  </Text>
                ))}
              </View>
            )}

            {(cameraCount > 0 || threatCount > 0) && (
              <Button
                variant="danger"
                fullWidth
                loading={isReporting}
                onPress={handleReportNetwork}
                icon={<AlertTriangle size={18} color="#fff" />}
              >
                Report This Network
              </Button>
            )}
          </View>
        ) : (
          <View className="items-center py-8">
            <Text className="text-slate-400 text-center">
              Not connected to a WiFi network
            </Text>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}
