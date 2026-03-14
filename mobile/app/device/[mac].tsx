import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { View, Text, ScrollView, Alert, Linking, TouchableOpacity, Image } from 'react-native';
import { Video, Router as RouterIcon, Smartphone, Copy, ExternalLink, Shield, AlertTriangle, Play, Lock } from 'lucide-react-native';
import { useDeviceStore } from '../../src/stores/scanStore';
import { useCallback, useState } from 'react';
import { Clipboard } from 'react-native';
import { apiService } from '../../src/services/api';
import { hashBssid } from '../../src/utils/crypto';
import { Badge } from '../../src/components/Badge';
import { ThreatMeter } from '../../src/components/ThreatMeter';
import { Button } from '../../src/components/Button';
import type { Device } from '@shared/src/types/device';

import type { Port } from '@shared/src/types/device';

const getThreatColor = (level?: number): string => {
  if (!level || level === 0) return '#64748b';
  if (level <= 1) return '#10b981';
  if (level <= 2) return '#f59e0b';
  if (level <= 3) return '#fb923c';
  return '#ef4444';
};

const getDeviceIcon = (type?: string) => {
  const iconProps = { size: 28, color: '#94a3b8' };
  switch (type) {
    case 'camera':
      return <Video {...iconProps} color="#ef4444" />;
    case 'router':
      return <RouterIcon {...iconProps} color="#3b82f6" />;
    default:
      return <Smartphone {...iconProps} />;
  }
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
          openPorts: device.openPorts?.map((p: Port) => p.number) || [],
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

  const handleViewStream = useCallback(() => {
    if (!device) return;
    
    const rtspPort = device.openPorts?.find((p: Port) => p.number === 554 || p.number === 8554)?.number || 554;
    const rtspPath = device.cameraEndpoints?.rtspPath || '/';
    const requiresAuth = device.cameraEndpoints?.requiresAuth ? 'true' : 'false';
    
    router.push({
      pathname: '/device/stream',
      params: {
        ip: device.ip,
        port: rtspPort.toString(),
        path: rtspPath,
        requiresAuth,
        vendor: device.vendor || 'Camera',
      },
    });
  }, [device, router]);

  if (!device) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-white text-lg font-semibold">Device not found</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-blue-500">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const threatLevel = device.threatLevel ?? 0;
  const isHighThreat = threatLevel >= 3 || device.deviceType === 'camera';
  const isCamera = device.deviceType === 'camera';
  const hasRtspPort = device.openPorts?.some((p: Port) => p.number === 554 || p.number === 8554);
  const canViewStream = isCamera || hasRtspPort;

  return (
    <>
      <Stack.Screen options={{ title: device.vendor || 'Device Details' }} />
      <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {isHighThreat && (
          <View className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center gap-3">
              <Shield size={24} color="#ef4444" />
              <View className="flex-1">
                <Text className="text-red-400 text-xl font-bold">
                  {isCamera ? 'Camera Detected' : 'High Threat Device'}
                </Text>
                <Text className="text-slate-400 text-sm">
                  {threatLevel >= 4 ? 'Critical risk - review immediately' : threatLevel >= 3 ? 'Immediate attention recommended' : 'Review recommended'}
                </Text>
              </View>
            </View>

            {canViewStream && (
              <View className="bg-slate-800 rounded-2xl p-4 mt-4">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-white text-base font-semibold">Camera Stream</Text>
                  {device.cameraEndpoints?.requiresAuth && (
                    <View className="flex-row items-center gap-1">
                      <Lock size={14} color="#f59e0b" />
                      <Text className="text-amber-500 text-xs">Auth Required</Text>
                    </View>
                  )}
                </View>
                
                {device.cameraEndpoints?.snapshotUrl ? (
                  <TouchableOpacity 
                    className="mb-4"
                    onPress={handleViewStream}
                  >
                    <Image
                      source={{ uri: device.cameraEndpoints.snapshotUrl }}
                      className="w-full h-44 rounded-xl bg-slate-950"
                      resizeMode="cover"
                    />
                    <View className="absolute top-1/2 left-1/2 mt-[-24px] ml-[-24px] w-12 h-12 rounded-full bg-black/60 items-center justify-center">
                      <Play size={24} color="#fff" fill="#fff" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View className="w-full h-28 rounded-xl bg-slate-950 items-center justify-center mb-4">
                    <Video size={40} color="#64748b" />
                    <Text className="text-slate-500 text-xs mt-3">
                      No preview available
                    </Text>
                  </View>
                )}
                
                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleViewStream}
                  icon={<Play size={18} color="#fff" />}
                >
                  View Live Stream
                </Button>
              </View>
            )}
          </View>
        )}

        <View className="bg-slate-800 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center gap-4">
            <View className={`w-14 h-14 rounded-2xl items-center justify-center ${
              isHighThreat ? 'bg-red-500/20' : device.deviceType === 'router' ? 'bg-blue-500/20' : 'bg-slate-700/50'
            }`}>
              {getDeviceIcon(device.deviceType)}
            </View>
            <View className="flex-1">
              <Text className="text-white text-xl font-semibold" numberOfLines={1}>
                {device.vendor || 'Unknown Device'}
              </Text>
              {device.hostname && (
                <Text className="text-slate-400 text-sm">{device.hostname}</Text>
              )}
            </View>
          </View>
        </View>

        <View className="bg-slate-800 rounded-2xl p-4 mb-4">
          <Text className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">Network Info</Text>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-slate-500 text-xs">IP Address</Text>
              <TouchableOpacity 
                className="flex-row items-center gap-1"
                onPress={() => handleCopy(device.ip, 'IP address')}
              >
                <Text className="text-white">{device.ip}</Text>
                <Copy size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View className="flex-1">
              <Text className="text-slate-500 text-xs">MAC Address</Text>
              <TouchableOpacity 
                className="flex-row items-center gap-1"
                onPress={() => handleCopy(device.mac, 'MAC address')}
              >
                <Text className="text-white text-xs">{device.mac.substring(0, 8)}...{device.mac.substring(8)}</Text>
                <Copy size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {device.signalStrength && (
          <View className="bg-slate-800 rounded-2xl p-4 mb-4">
            <Text className="text-slate-500 text-xs">Signal Strength</Text>
            <Text className="text-white">{device.signalStrength} dBm</Text>
          </View>
        )}

        <View className="bg-slate-800 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center gap-3">
            <Shield size={18} color={getThreatColor(threatLevel)} />
            <Text className="text-white text-base font-semibold">Security Analysis</Text>
          </View>
          <ThreatMeter level={threatLevel} size="lg" />
          {device.threatReasons && device.threatReasons.length > 0 && (
            <View className="mt-4 gap-3">
              {device.threatReasons.map((reason, index) => (
                <View key={index} className="flex-row items-start gap-2">
                  <AlertTriangle size={14} color="#ef4444" />
                  <Text className="text-slate-400 flex-1 text-[13px]">{reason}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {device.openPorts && device.openPorts.length > 0 && (
          <View className="bg-slate-800 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-white text-base font-semibold">Open Ports</Text>
              <Badge>{device.openPorts.length}</Badge>
            </View>
            <View className="gap-3">
              {device.openPorts.map((port: Port) => (
                <TouchableOpacity
                  key={port.number}
                  className="bg-slate-950 rounded-xl p-4 flex-row items-center justify-between"
                  onPress={() => handleOpenPort(device.ip, port.number, port.service)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-lg">{getServiceIcon(port.service)}</Text>
                    <View className="flex-1">
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
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-4 pb-6 pt-3">
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
