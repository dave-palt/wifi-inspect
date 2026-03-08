import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Wifi, Shield, AlertTriangle, Radio, Smartphone, Bell } from 'lucide-react-native';
import { useNetworkScan } from '../../src/hooks/useNetworkScan';
import { useDeviceStore } from '../../src/stores/scanStore';
import { useAlertsStore } from '../../src/stores/alertsStore';
import { apiService } from '../../src/services/api';
import { hashBssid } from '../../src/utils/crypto';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { StatCard } from '../../src/components/StatCard';
import { ListItem } from '../../src/components/ListItem';
import { AlertBanner } from '../../src/components/AlertBanner';

export default function ScanScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const { startScan, scanProgress, currentNetwork } = useNetworkScan();
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
    if (isScanning) return;
    
    setIsScanning(true);
    try {
      await startScan();
    } catch (error) {
      Alert.alert('Scan Error', 'Failed to scan network. Please try again.');
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, startScan]);

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

  const hasAlerts = networkAlerts.length > 0;
  const isHighRisk = networkReputation < 0.5 || threatCount > 0;

  const getReputationBadge = () => {
    if (hasAlerts) return { variant: 'danger' as const, label: 'Has Alerts' };
    if (networkReputation < 0.8) return { variant: 'warning' as const, label: 'Unknown' };
    return { variant: 'success' as const, label: 'Safe' };
  };

  const reputationBadge = getReputationBadge();

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="px-5 py-6">
        <Text className="text-3xl font-bold text-white mb-1">Network Scan</Text>
        <Text className="text-slate-400 text-base">Detect hidden cameras and threats</Text>
      </View>

      {currentNetwork ? (
        <View className="px-5 mb-5">
          <Card className="overflow-hidden">
            <View className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-5">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center">
                    <Wifi size={20} color="#3b82f6" />
                  </View>
                  <View>
                    <Text className="text-slate-400 text-xs uppercase tracking-wider">Connected to</Text>
                    <Text className="text-white text-lg font-semibold">{currentNetwork.ssid}</Text>
                  </View>
                </View>
                {isCheckingNetwork && <ActivityIndicator size="small" color="#3b82f6" />}
              </View>
              
              <View className="flex-row gap-6">
                <View>
                  <Text className="text-slate-500 text-xs">IP Address</Text>
                  <Text className="text-white font-medium">{currentNetwork.ip}</Text>
                </View>
                <View>
                  <Text className="text-slate-500 text-xs">Gateway</Text>
                  <Text className="text-white font-medium">{currentNetwork.gateway}</Text>
                </View>
                <View>
                  <Text className="text-slate-500 text-xs">Signal</Text>
                  <Text className="text-white font-medium">{currentNetwork.signalStrength} dBm</Text>
                </View>
              </View>
            </View>

            <View className="px-5 py-3 bg-slate-800/50 flex-row items-center justify-between">
              <Text className="text-slate-400 text-sm">Network Reputation</Text>
              <View className="flex-row items-center gap-2">
                <Badge variant={reputationBadge.variant}>{reputationBadge.label}</Badge>
                {totalReports > 0 && (
                  <Text className="text-slate-500 text-sm">({totalReports} reports)</Text>
                )}
              </View>
            </View>
          </Card>
        </View>
      ) : (
        <View className="px-5 mb-5">
          <Card>
            <View className="p-4 items-center">
              <Wifi size={32} color="#f59e0b" />
              <Text className="text-amber-400 font-medium mt-2">Not connected to WiFi</Text>
            </View>
          </Card>
        </View>
      )}

      {hasAlerts && (
        <View className="px-5 mb-5">
          <AlertBanner
            variant="danger"
            title="Known Risky Network"
            message={
              <View>
                <Text className="text-red-200 text-sm leading-5">
                  This network has been reported by other users. Proceed with caution.
                </Text>
                {networkAlerts.map((alert, index) => (
                  <Text key={index} className="text-red-300 text-sm mt-1">
                    {'\u2022'} {alert.description}
                  </Text>
                ))}
              </View>
            }
            icon={<AlertTriangle size={24} color="#f87171" />}
          />
        </View>
      )}

      <View className="px-5 mb-6">
        <Button
          size="lg"
          fullWidth
          disabled={isScanning || !currentNetwork}
          loading={isScanning}
          onPress={handleScan}
          icon={<Radio size={20} color="#fff" />}
        >
          {isScanning ? `Scanning... ${Math.round(scanProgress)}%` : 'Start Network Scan'}
        </Button>
      </View>

      <View className="px-5 mb-6">
        <View className="flex-row gap-3">
          <StatCard
            value={deviceCount}
            label="Devices"
            icon={<Smartphone size={18} color="#94a3b8" />}
          />
          <StatCard
            value={cameraCount}
            label="Cameras"
            variant="danger"
            icon={<Shield size={18} color="#f87171" />}
          />
          <StatCard
            value={threatCount}
            label="Threats"
            variant="warning"
            icon={<AlertTriangle size={18} color="#fbbf24" />}
          />
        </View>
      </View>

      {(cameraCount > 0 || threatCount > 0) && lastScanTime && (
        <View className="px-5 mb-6">
          <Card className="border-red-900/50 bg-red-950/30">
            <View className="p-4">
              <View className="flex-row items-center gap-3 mb-2">
                <AlertTriangle size={20} color="#ef4444" />
                <Text className="text-white font-semibold text-lg">
                  {cameraCount + threatCount} Potential Threat{cameraCount + threatCount > 1 ? 's' : ''} Detected
                </Text>
              </View>
              <Text className="text-slate-400 text-sm mb-4">
                Help warn other travelers by reporting this network
              </Text>
              <Button
                variant="danger"
                fullWidth
                loading={isReporting}
                onPress={handleReportNetwork}
              >
                Report This Network
              </Button>
            </View>
          </Card>
        </View>
      )}

      {lastScanTime && (
        <View className="px-5 mb-6">
          <Card>
            <Card.Content className="py-3">
              <Text className="text-slate-500 text-xs uppercase tracking-wider">Last scan</Text>
              <Text className="text-white font-medium mt-1">
                {new Date(lastScanTime).toLocaleString()}
              </Text>
            </Card.Content>
          </Card>
        </View>
      )}

      <View className="px-5 mb-8">
        <Text className="text-white text-lg font-semibold mb-3">Quick Actions</Text>
        <Card>
          <ListItem
            title="View All Devices"
            subtitle="See detailed device list"
            icon={<Smartphone size={22} color="#3b82f6" />}
            onPress={() => router.push('/(tabs)/devices')}
          />
          <View className="h-px bg-slate-700/50" />
          <ListItem
            title="Network Alerts"
            subtitle="Check reported networks"
            icon={<Bell size={22} color="#3b82f6" />}
            onPress={() => router.push('/(tabs)/alerts')}
            trailing={
              hasAlerts ? (
                <View className="bg-red-500 px-2 py-0.5 rounded-full">
                  <Text className="text-white text-xs font-bold">{networkAlerts.length}</Text>
                </View>
              ) : undefined
            }
          />
        </Card>
      </View>
    </ScrollView>
  );
}
