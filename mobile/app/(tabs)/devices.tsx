import { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, Laptop, Smartphone, Tv, Router, Home, HelpCircle, Shield, Wifi } from 'lucide-react-native';
import { useDeviceStore } from '../../src/stores/scanStore';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { ThreatMeter } from '../../src/components/ThreatMeter';
import type { Device } from '@shared/src/types/device';

const getDeviceIcon = (type?: string) => {
  const iconProps = { size: 24, color: '#94a3b8' };
  switch (type) {
    case 'camera': return <Video {...iconProps} color="#ef4444" />;
    case 'phone': return <Smartphone {...iconProps} />;
    case 'laptop': return <Laptop {...iconProps} />;
    case 'tablet': return <Smartphone {...iconProps} />;
    case 'smart_tv': return <Tv {...iconProps} />;
    case 'router': return <Router {...iconProps} />;
    case 'iot_device': return <Home {...iconProps} />;
    default: return <HelpCircle {...iconProps} />;
  }
};

const getThreatVariant = (level?: number): 'success' | 'warning' | 'danger' | 'default' => {
  if (!level || level === 0) return 'default';
  if (level <= 1) return 'success';
  if (level <= 2) return 'warning';
  return 'danger';
};

export default function DevicesScreen() {
  const router = useRouter();
  const { devices } = useDeviceStore();

  const handleDevicePress = useCallback((mac: string) => {
    router.push(`/device/${mac}`);
  }, [router]);

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity
      className="mx-5 mb-3 active:opacity-70"
      onPress={() => handleDevicePress(item.mac)}
      activeOpacity={0.7}
    >
      <Card>
        <View className="p-4 flex-row items-center gap-4">
          <View className="w-12 h-12 rounded-xl bg-slate-700/50 items-center justify-center">
            {getDeviceIcon(item.deviceType)}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-semibold text-lg flex-1">
                {item.vendor || 'Unknown Device'}
              </Text>
              {item.isGateway && (
                <Badge variant="info">Gateway</Badge>
              )}
            </View>
            <Text className="text-slate-400 text-sm">{item.ip}</Text>
            <Text className="text-slate-500 text-xs mt-0.5">{item.mac}</Text>
          </View>
          <View className="items-end">
            <Text className="text-slate-400 text-sm mb-1">
              Threat Level
            </Text>
            <View className="w-20">
              <ThreatMeter level={item.threatLevel ?? 0} size="sm" />
            </View>
            {item.openPorts && item.openPorts.length > 0 && (
              <View className="flex-row items-center gap-1 mt-1">
                <Wifi size={12} color="#64748b" />
                <Text className="text-slate-500 text-xs">
                  {item.openPorts.length} port{item.openPorts.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
        {item.threatReasons && item.threatReasons.length > 0 && (
          <View className="px-4 pb-4 pt-0">
            <View className="pt-3 border-t border-slate-700/50">
              <View className="flex-row items-center gap-2">
                <Shield size={14} color="#f87171" />
                <Text className="text-red-400 text-sm flex-1">{item.threatReasons[0]}</Text>
              </View>
            </View>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-5 py-4 border-b border-slate-800">
        <Text className="text-white text-2xl font-bold">Devices</Text>
        <Text className="text-slate-400 text-sm mt-1">
          {devices.length} device{devices.length !== 1 ? 's' : ''} found on network
        </Text>
      </View>
      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.mac}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20 px-5">
            <View className="w-16 h-16 rounded-full bg-slate-800 items-center justify-center mb-4">
              <Router size={32} color="#64748b" />
            </View>
            <Text className="text-white text-xl font-semibold mb-2">No devices found</Text>
            <Text className="text-slate-400 text-center">
              Run a network scan from the home screen to discover devices
            </Text>
          </View>
        }
      />
    </View>
  );
}
