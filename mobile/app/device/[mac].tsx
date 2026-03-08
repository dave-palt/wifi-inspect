import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { View, Text, ScrollView, Alert, Linking, TouchableOpacity } from 'react-native';
import { Video, Router as RouterIcon, Smartphone, Copy, ExternalLink, Shield, AlertTriangle } from 'lucide-react-native';
import { useDeviceStore } from '../../src/stores/scanStore';
import { useCallback, useState } from 'react';
import { Clipboard } from 'react-native';
import { apiService } from '../../src/services/api';
import { hashBssid } from '../../src/utils/crypto';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { ThreatMeter } from '../../src/components/ThreatMeter';

const getThreatColor = (level?: number): string => {
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
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-white text-lg">Device not found</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-blue-400">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const threatLevel = device.threatLevel ?? 0;
  const isCamera = device.deviceType === 'camera';

  return (
    <>
      <Stack.Screen options={{ title: device.vendor || 'Device Details' }} />
      <ScrollView className="flex-1 bg-slate-950">
        <View className="p-5">
          <Card className="mb-4">
            <View className="p-5 flex-row items-center gap-4">
              <View className={`w-14 h-14 rounded-2xl items-center justify-center ${isCamera ? 'bg-red-900/30' : 'bg-slate-700/50'}`}>
                {isCamera ? (
                  <Video size={28} color="#ef4444" />
                ) : device.deviceType === 'router' ? (
                  <RouterIcon size={28} color="#3b82f6" />
                ) : (
                  <Smartphone size={28} color="#94a3b8" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white text-xl font-semibold">
                  {device.vendor || 'Unknown Device'}
                </Text>
                {device.hostname && (
                  <Text className="text-slate-400 text-sm">{device.hostname}</Text>
                )}
                {isCamera && (
                  <Badge variant="danger" size="md">Camera Detected</Badge>
                )}
              </View>
            </View>
          </Card>

          <Card className="mb-4">
            <View className="p-4">
              <TouchableOpacity
                className="flex-row justify-between items-center py-2"
                onPress={() => handleCopy(device.ip, 'IP address')}
              >
                <Text className="text-slate-400">IP Address</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-medium">{device.ip}</Text>
                  <Copy size={16} color="#64748b" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row justify-between items-center py-2"
                onPress={() => handleCopy(device.mac, 'MAC address')}
              >
                <Text className="text-slate-400">MAC Address</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-medium">{device.mac}</Text>
                  <Copy size={16} color="#64748b" />
                </View>
              </TouchableOpacity>
              {device.signalStrength && (
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-slate-400">Signal Strength</Text>
                  <Text className="text-white font-medium">{device.signalStrength} dBm</Text>
                </View>
              )}
            </View>
          </Card>

          {threatLevel > 0 && (
            <Card className="mb-4">
              <View className="p-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Shield size={18} color={getThreatColor(threatLevel)} />
                  <Text className="text-white font-semibold">Security Analysis</Text>
                </View>
                <ThreatMeter level={threatLevel} size="lg" />
                {device.threatReasons && device.threatReasons.length > 0 && (
                  <View className="mt-4 gap-2">
                    {device.threatReasons.map((reason, index) => (
                      <View key={index} className="flex-row items-start gap-2">
                        <AlertTriangle size={14} color="#f87171" />
                        <Text className="text-slate-300 flex-1 text-sm">{reason}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Card>
          )}

          {device.openPorts && device.openPorts.length > 0 && (
            <Card className="mb-4">
              <View className="p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-semibold">Open Ports</Text>
                  <Badge>{device.openPorts.length}</Badge>
                </View>
                <View className="gap-3">
                  {device.openPorts.map((port) => (
                    <View key={port.number} className="bg-slate-900 rounded-xl p-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-lg">{getServiceIcon(port.service)}</Text>
                          <View>
                            <Text className="text-white font-medium">{port.service || 'Unknown'}</Text>
                            <Text className="text-slate-500 text-xs">Port {port.number}</Text>
                          </View>
                        </View>
                        <Button
                          size="sm"
                          icon={<ExternalLink size={14} color="#fff" />}
                          onPress={() => handleOpenPort(device.ip, port.number, port.service)}
                        >
                          Open
                        </Button>
                      </View>
                      <Text className="text-slate-400 text-sm">{port.description}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          )}

          <Card className="mb-4">
            <View className="p-4">
              <Text className="text-white font-semibold mb-3">Quick Actions</Text>
              <View className="flex-row gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onPress={() => handleCopy(device.ip, 'IP address')}
                >
                  Copy IP
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onPress={() => handleCopy(device.mac, 'MAC address')}
                >
                  Copy MAC
                </Button>
              </View>
            </View>
          </Card>

          <Button
            variant="danger"
            fullWidth
            loading={isReporting}
            onPress={handleReport}
            icon={<AlertTriangle size={18} color="#fff" />}
          >
            Report Suspicious Device
          </Button>
        </View>
      </ScrollView>
    </>
  );
}
