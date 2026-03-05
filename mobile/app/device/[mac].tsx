import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useDeviceStore } from '../../src/stores/scanStore';
import { useCallback, useState } from 'react';
import { Clipboard } from 'react-native';
import { apiService } from '../../src/services/api';
import { hashBssid } from '../../src/utils/crypto';

const getThreatColor = (level?: number) => {
  if (!level || level === 0) return '#94a3b8';
  if (level <= 1) return '#4ade80';
  if (level <= 2) return '#facc15';
  if (level <= 3) return '#fb923c';
  return '#ef4444';
};

const getServiceIcon = (service?: string) => {
  switch (service?.toLowerCase()) {
    case 'http': return '🌐';
    case 'https': return '🔒';
    case 'rtsp': return '📹';
    case 'ssh': return '🔑';
    case 'ftp': return '📁';
    case 'telnet': return '📟';
    default: return '🔌';
  }
};

const getDeepLink = (ip: string, port: number, service?: string) => {
  const scheme = service?.toLowerCase() === 'https' ? 'https' : 'http';
  if (service?.toLowerCase() === 'rtsp') return `rtsp://${ip}:${port}/`;
  if (service?.toLowerCase() === 'ssh') return `ssh://${ip}:${port}`;
  if (service?.toLowerCase() === 'ftp') return `ftp://${ip}:${port}`;
  if (port === 80) return `${scheme}://${ip}`;
  if (port === 443) return `${scheme}://${ip}`;
  return `${scheme}://${ip}:${port}`;
};

export default function DeviceDetailScreen() {
  const { mac } = useLocalSearchParams<{ mac: string }>();
  const router = useRouter();
  const { devices, currentNetwork } = useDeviceStore();
  const [isReporting, setIsReporting] = useState(false);
  
  const device = devices.find(d => d.mac === mac);

  const handleCopy = useCallback((text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  }, []);

  const handleReport = useCallback(async () => {
    if (!currentNetwork) {
      Alert.alert('Error', 'No network information available');
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Report Suspicious Device',
        `This will report "${device?.vendor || 'this device'}" as suspicious to help other users. Continue?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Report', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirmed || !device) return;

    setIsReporting(true);
    try {
      const bssidHash = hashBssid(currentNetwork.bssid);
      
      await apiService.reportNetwork({
        ssid: currentNetwork.ssid,
        bssidHash,
        securityType: currentNetwork.securityType,
        devicesFound: [{
          ip: device.ip,
          mac: device.mac,
          openPorts: device.openPorts?.map(p => p.number) || [],
          deviceType: device.deviceType || 'unknown',
        }],
        threatLevel: device.threatLevel || 0,
      });

      Alert.alert('Success', 'Device reported. Thank you for helping keep others safe!');
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert('Error', 'Failed to report device. Please try again.');
    } finally {
      setIsReporting(false);
    }
  }, [device, currentNetwork]);

  const handleOpenPort = useCallback(async (ip: string, port: number, service?: string) => {
    const url = getDeepLink(ip, port, service);
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot Open', `No app available to handle ${service || 'this protocol'}`);
    }
  }, []);

  if (!device) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <Text className="text-white text-lg">Device not found</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-blue-400">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const threatLevel = device.threatLevel ?? 0;

  return (
    <>
      <Stack.Screen options={{ title: device.vendor || 'Device Details' }} />
      <ScrollView className="flex-1 bg-slate-900 px-4">
        <View className="py-6">
          {/* Header Card */}
          <View className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-4">
            <View className="flex-row items-center gap-3 mb-4">
              <Text className="text-4xl">
                {device.deviceType === 'camera' ? '📹' : 
                 device.deviceType === 'router' ? '📡' : '📱'}
              </Text>
              <View>
                <Text className="text-white text-xl font-semibold">
                  {device.vendor || 'Unknown Device'}
                </Text>
                {device.hostname && (
                  <Text className="text-slate-400">{device.hostname}</Text>
                )}
              </View>
            </View>

            {/* IP & MAC */}
            <TouchableOpacity
              className="flex-row justify-between items-center py-2"
              onPress={() => handleCopy(device.ip, 'IP address')}
            >
              <Text className="text-slate-400">IP Address</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-white">{device.ip}</Text>
                <Text className="text-slate-500">📋</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row justify-between items-center py-2"
              onPress={() => handleCopy(device.mac, 'MAC address')}
            >
              <Text className="text-slate-400">MAC Address</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-white">{device.mac}</Text>
                <Text className="text-slate-500">📋</Text>
              </View>
            </TouchableOpacity>
            {device.signalStrength && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-slate-400">Signal Strength</Text>
                <Text className="text-white">{device.signalStrength} dBm</Text>
              </View>
            )}
          </View>

          {/* Threat Analysis */}
          {threatLevel > 0 && (
            <View className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-4">
              <Text className="text-white font-semibold mb-3">Security Analysis</Text>
              
              <View className="flex-row items-center gap-3 mb-3">
                <View className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${(threatLevel / 5) * 100}%`,
                      backgroundColor: getThreatColor(threatLevel),
                    }}
                  />
                </View>
                <Text
                  className="font-bold"
                  style={{ color: getThreatColor(threatLevel) }}
                >
                  {threatLevel}/5
                </Text>
              </View>

              {device.threatReasons && device.threatReasons.length > 0 && (
                <View className="gap-2">
                  {device.threatReasons.map((reason, index) => (
                    <View key={index} className="flex-row items-start gap-2">
                      <Text className="text-red-400">⚠️</Text>
                      <Text className="text-slate-300 flex-1">{reason}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Open Ports */}
          {device.openPorts && device.openPorts.length > 0 && (
            <View className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-4">
              <Text className="text-white font-semibold mb-3">
                Open Ports ({device.openPorts.length})
              </Text>
              <View className="gap-3">
                {device.openPorts.map((port) => (
                  <View key={port.number} className="bg-slate-900 rounded-lg p-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xl">{getServiceIcon(port.service)}</Text>
                        <Text className="text-white font-medium">
                          {port.service || 'Unknown'} ({port.number})
                        </Text>
                      </View>
                      <TouchableOpacity
                        className="bg-blue-600 px-3 py-1 rounded"
                        onPress={() => handleOpenPort(device.ip, port.number, port.service)}
                      >
                        <Text className="text-white text-sm">Open</Text>
                      </TouchableOpacity>
                    </View>
                    <Text className="text-slate-400 text-sm">{port.description}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-4">
            <Text className="text-white font-semibold mb-3">Quick Actions</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="flex-1 bg-slate-700 py-2 rounded-lg"
                onPress={() => handleCopy(device.ip, 'IP address')}
              >
                <Text className="text-white text-center text-sm">Copy IP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-slate-700 py-2 rounded-lg"
                onPress={() => handleCopy(device.mac, 'MAC address')}
              >
                <Text className="text-white text-center text-sm">Copy MAC</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-slate-700 py-2 rounded-lg"
                onPress={() => {}}
              >
                <Text className="text-white text-center text-sm">Ping</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Report */}
          <TouchableOpacity
            className={`bg-red-900/50 border border-red-800 rounded-xl p-4 ${isReporting ? 'opacity-50' : ''}`}
            onPress={handleReport}
            disabled={isReporting}
          >
            <Text className="text-red-400 text-center font-medium">
              {isReporting ? 'Reporting...' : 'Report Suspicious Device'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}
