import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Radio, Shield, AlertTriangle, MapPin, Settings, RefreshCw } from 'lucide-react-native';
import { useNetworkScan, ScanBlockReason } from '../../src/hooks/useNetworkScan';
import { useDeviceStore } from '../../src/stores/scanStore';
import { useAlertsStore } from '../../src/stores/alertsStore';
import { apiService } from '../../src/services/api';
import { hashBssid } from '../../src/utils/crypto';
import { colors, spacing, borderRadius } from '../../src/utils/design';
import { FAB } from '../../src/components/FAB';
import { NetworkStatusBar } from '../../src/components/NetworkStatusBar';
import { ThreatAlert } from '../../src/components/ThreatAlert';
import { BottomSheet } from '../../src/components/BottomSheet';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';

function getBlockReasonIcon(reason: ScanBlockReason) {
  switch (reason) {
    case 'no_permission':
    case 'permission_denied_permanent':
      return <MapPin size={24} color={colors.warning} />;
    case 'location_disabled':
      return <MapPin size={24} color={colors.warning} />;
    case 'not_connected':
      return <Radio size={24} color={colors.text.tertiary} />;
    default:
      return <AlertTriangle size={24} color={colors.warning} />;
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
    scanProgress, 
    currentNetwork, 
    blockReason, 
    blockMessage,
    canScan,
    retry,
    permissions,
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl }}>
        {blockReason ? (
          <View style={{ alignItems: 'center', gap: spacing.lg }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.elevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {getBlockReasonIcon(blockReason)}
            </View>
            
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
                {blockReason === 'not_connected' ? 'Not Connected to WiFi' : 
                 blockReason === 'no_permission' ? 'Permission Required' :
                 blockReason === 'permission_denied_permanent' ? 'Permission Denied' :
                 blockReason === 'location_disabled' ? 'Location Disabled' :
                 'Unable to Scan'}
              </Text>
              <Text style={{ color: colors.text.secondary, fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
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
              <Text style={{ color: colors.text.tertiary, fontSize: 12, textAlign: 'center', marginTop: spacing.sm }}>
                Go to: Settings {'>'} Apps {'>'} CamDetect {'>'} Permissions
              </Text>
            )}
          </View>
        ) : (
          <>
            <FAB
              size="xl"
              onPress={handleScan}
              loading={false}
              disabled={!canScan}
              icon={<Radio size={52} color="#fff" />}
              label={'Scan Network'}
              sublabel={!currentNetwork ? 'Checking connection...' : deviceCount > 0 ? `${deviceCount} devices found` : 'Tap to detect devices'}
            />

            {lastScanTime && (
              <Text style={{ color: colors.text.tertiary, fontSize: 12, marginTop: spacing.lg }}>
                Last scan: {new Date(lastScanTime).toLocaleTimeString()}
              </Text>
            )}
          </>
        )}
      </View>

      {deviceCount > 0 && !blockReason && (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1, backgroundColor: colors.elevated, padding: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' }}>
              <Text style={{ color: colors.text.primary, fontSize: 24, fontWeight: '700' }}>{deviceCount}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Devices</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: cameraCount > 0 ? `${colors.danger}20` : colors.elevated, padding: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' }}>
              <Text style={{ color: cameraCount > 0 ? colors.danger : colors.text.primary, fontSize: 24, fontWeight: '700' }}>{cameraCount}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Cameras</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: threatCount > 0 ? `${colors.warning}20` : colors.elevated, padding: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' }}>
              <Text style={{ color: threatCount > 0 ? colors.warning : colors.text.primary, fontSize: 24, fontWeight: '700' }}>{threatCount}</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Threats</Text>
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
          <View style={{ gap: spacing.md }}>
            <View style={{ backgroundColor: colors.elevated, padding: spacing.md, borderRadius: borderRadius.lg }}>
              <Text style={{ color: colors.text.tertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Network Name</Text>
              <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '600' }}>{currentNetwork.ssid}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, backgroundColor: colors.elevated, padding: spacing.md, borderRadius: borderRadius.lg }}>
                <Text style={{ color: colors.text.tertiary, fontSize: 11, marginBottom: 4 }}>IP Address</Text>
                <Text style={{ color: colors.text.primary, fontWeight: '500' }}>{currentNetwork.ip}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.elevated, padding: spacing.md, borderRadius: borderRadius.lg }}>
                <Text style={{ color: colors.text.tertiary, fontSize: 11, marginBottom: 4 }}>Gateway</Text>
                <Text style={{ color: colors.text.primary, fontWeight: '500' }}>{currentNetwork.gateway}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: colors.elevated, padding: spacing.md, borderRadius: borderRadius.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={{ color: colors.text.tertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Reputation</Text>
                <Badge variant={getReputationStatus() === 'safe' ? 'success' : getReputationStatus() === 'danger' ? 'danger' : 'warning'}>
                  {getReputationStatus() === 'safe' ? 'Safe' : getReputationStatus() === 'danger' ? 'Risk' : 'Unknown'}
                </Badge>
              </View>
              {totalReports > 0 && (
                <Text style={{ color: colors.text.tertiary, fontSize: 12 }}>{totalReports} community reports</Text>
              )}
            </View>

            {networkAlerts.length > 0 && (
              <View style={{ backgroundColor: `${colors.danger}15`, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: `${colors.danger}40` }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                  <AlertTriangle size={18} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Alerts</Text>
                </View>
                {networkAlerts.map((alert, index) => (
                  <Text key={index} style={{ color: colors.text.secondary, fontSize: 13, marginBottom: 4 }}>
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
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
              Not connected to a WiFi network
            </Text>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}
