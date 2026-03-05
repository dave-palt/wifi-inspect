import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useNetworkScan } from '../../src/hooks/useNetworkScan';
import { useDeviceStore } from '../../src/stores/scanStore';
import { useAlertsStore } from '../../src/stores/alertsStore';
import { apiService } from '../../src/services/api';
import { hashBssid } from '../../src/utils/crypto';

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
      // Silently fail - network check is optional
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
          openPorts: d.openPorts?.map(p => p.number) || [],
          deviceType: d.deviceType || 'unknown',
        })),
        threatLevel: Math.max(...cameraDevices.map(d => d.threatLevel || 0), 0),
      });

      Alert.alert('Success', 'Network reported. Thank you for helping keep others safe!');
      
      // Refresh network check
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

  return (
    <ScrollView className="flex-1 bg-slate-900 px-4">
      <View className="py-6">
        {/* Network Info Card */}
        {currentNetwork ? (
          <View className="bg-slate-800 rounded-2xl p-4 mb-6 border border-slate-700">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-slate-400 text-sm mb-1">Connected to</Text>
                <Text className="text-white text-xl font-semibold">{currentNetwork.ssid}</Text>
              </View>
              {isCheckingNetwork && (
                <ActivityIndicator size="small" color="#3b82f6" />
              )}
            </View>
            
            <View className="flex-row mt-3 gap-4">
              <View>
                <Text className="text-slate-400 text-xs">IP Address</Text>
                <Text className="text-white">{currentNetwork.ip}</Text>
              </View>
              <View>
                <Text className="text-slate-400 text-xs">Gateway</Text>
                <Text className="text-white">{currentNetwork.gateway}</Text>
              </View>
              <View>
                <Text className="text-slate-400 text-xs">Signal</Text>
                <Text className="text-white">{currentNetwork.signalStrength} dBm</Text>
              </View>
            </View>
            
            {/* Reputation Badge */}
            <View className="mt-3 pt-3 border-t border-slate-700">
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-400 text-sm">Network Reputation</Text>
                <View className="flex-row items-center gap-2">
                  <View className={`px-2 py-1 rounded ${hasAlerts ? 'bg-red-900' : networkReputation < 0.8 ? 'bg-yellow-900' : 'bg-green-900'}`}>
                    <Text className={`text-sm font-semibold ${hasAlerts ? 'text-red-400' : networkRepputation < 0.8 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {hasAlerts ? 'Has Alerts' : networkReputation < 0.8 ? 'Unknown' : 'Safe'}
                    </Text>
                  </View>
                  {totalReports > 0 && (
                    <Text className="text-slate-400 text-sm">({totalReports} reports)</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View className="bg-slate-800 rounded-2xl p-4 mb-6 border border-slate-700">
            <Text className="text-yellow-400 text-center">Not connected to WiFi</Text>
          </View>
        )}

        {/* Security Alert Banner */}
        {hasAlerts && (
          <View className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6">
            <View className="flex-row items-start gap-3">
              <Text className="text-2xl">🚨</Text>
              <View className="flex-1">
                <Text className="text-red-400 font-semibold">Known Risky Network</Text>
                <Text className="text-red-300 text-sm mt-1">
                  This network has been reported by other users. Proceed with caution.
                </Text>
                {networkAlerts.map((alert, index) => (
                  <Text key={index} className="text-red-300 text-sm mt-1">
                    • {alert.description}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Scan Button */}
        <TouchableOpacity
          className={`rounded-full py-4 px-8 mb-6 ${isScanning || !currentNetwork ? 'bg-slate-600' : 'bg-blue-600'}`}
          onPress={handleScan}
          disabled={isScanning || !currentNetwork}
        >
          <Text className="text-white text-center text-lg font-semibold">
            {isScanning ? `Scanning... ${Math.round(scanProgress)}%` : 'Start Network Scan'}
          </Text>
        </TouchableOpacity>

        {/* Stats Cards */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <Text className="text-3xl font-bold text-white">{deviceCount}</Text>
            <Text className="text-slate-400 text-sm">Devices Found</Text>
          </View>
          <View className="flex-1 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <Text className="text-3xl font-bold text-red-400">{cameraCount}</Text>
            <Text className="text-slate-400 text-sm">Cameras</Text>
          </View>
          <View className="flex-1 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <Text className="text-3xl font-bold text-yellow-400">{threatCount}</Text>
            <Text className="text-slate-400 text-sm">Threats</Text>
          </View>
        </View>

        {/* Report Network Button - Show when cameras or threats found */}
        {(cameraCount > 0 || threatCount > 0) && lastScanTime && (
          <TouchableOpacity
            className={`bg-red-600 rounded-xl p-4 mb-6 ${isReporting ? 'opacity-50' : ''}`}
            onPress={handleReportNetwork}
            disabled={isReporting}
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-white font-semibold">
                {isReporting ? 'Reporting...' : '🚨 Report This Network'}
              </Text>
            </View>
            <Text className="text-red-200 text-sm text-center mt-1">
              Help warn other travelers about this network
            </Text>
          </TouchableOpacity>
        )}

        {/* Recent Scan Info */}
        {lastScanTime && (
          <View className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-6">
            <Text className="text-slate-400 text-sm">Last scan</Text>
            <Text className="text-white">
              {new Date(lastScanTime).toLocaleString()}
            </Text>
          </View>
        )}

        {/* Quick Actions */}
        <Text className="text-white text-lg font-semibold mb-3">Quick Actions</Text>
        <View className="gap-3">
          <TouchableOpacity
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex-row items-center justify-between"
            onPress={() => router.push('/(tabs)/devices')}
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl">📱</Text>
              <View>
                <Text className="text-white font-medium">View All Devices</Text>
                <Text className="text-slate-400 text-sm">See detailed device list</Text>
              </View>
            </View>
            <Text className="text-slate-500">›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex-row items-center justify-between"
            onPress={() => router.push('/(tabs)/alerts')}
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl">⚠️</Text>
              <View>
                <Text className="text-white font-medium">Network Alerts</Text>
                <Text className="text-slate-400 text-sm">Check reported networks</Text>
              </View>
            </View>
            {hasAlerts && (
              <View className="bg-red-600 px-2 py-1 rounded-full">
                <Text className="text-white text-xs font-bold">{networkAlerts.length}</Text>
              </View>
            )}
            <Text className="text-slate-500">›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
