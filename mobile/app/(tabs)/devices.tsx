import { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useDeviceStore } from '../../src/stores/scanStore';
import type { Device } from '@shared/src/types/device';

const getDeviceIcon = (type?: string) => {
  switch (type) {
    case 'camera': return '📹';
    case 'phone': return '📱';
    case 'laptop': return '💻';
    case 'tablet': return '📱';
    case 'smart_tv': return '📺';
    case 'router': return '📡';
    case 'iot_device': return '🏠';
    default: return '❓';
  }
};

const getThreatColor = (level?: number) => {
  if (!level || level === 0) return 'text-slate-400';
  if (level <= 1) return 'text-green-400';
  if (level <= 2) return 'text-yellow-400';
  if (level <= 3) return 'text-orange-400';
  return 'text-red-500';
};

export default function DevicesScreen() {
  const router = useRouter();
  const { devices } = useDeviceStore();

  const handleDevicePress = useCallback((mac: string) => {
    router.push(`/device/${mac}`);
  }, [router]);

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity
      className="bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700"
      onPress={() => handleDevicePress(item.mac)}
    >
      <View className="flex-row items-center gap-3">
        <Text className="text-3xl">{getDeviceIcon(item.deviceType)}</Text>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-white font-semibold text-lg">
              {item.vendor || 'Unknown Device'}
            </Text>
            {item.isGateway && (
              <Text className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                Gateway
              </Text>
            )}
          </View>
          <Text className="text-slate-400 text-sm">{item.ip}</Text>
          <Text className="text-slate-500 text-xs">{item.mac}</Text>
        </View>
        <View className="items-end">
          <Text className={`font-bold ${getThreatColor(item.threatLevel)}`}>
            {item.threatLevel ? `${item.threatLevel}/5` : 'Unknown'}
          </Text>
          {item.openPorts && item.openPorts.length > 0 && (
            <Text className="text-slate-400 text-sm">
              {item.openPorts.length} port{item.openPorts.length > 1 ? 's' : ''} open
            </Text>
          )}
        </View>
      </View>
      {item.threatReasons && item.threatReasons.length > 0 && (
        <View className="mt-3 pt-3 border-t border-slate-700">
          <Text className="text-red-400 text-sm">{item.threatReasons[0]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-slate-900">
      <View className="px-4 py-3 border-b border-slate-700">
        <Text className="text-white">
          {devices.length} device{devices.length !== 1 ? 's' : ''} found
        </Text>
      </View>
      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.mac}
        contentContainerClassName="p-4"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-4xl mb-4">📡</Text>
            <Text className="text-white text-lg mb-2">No devices found</Text>
            <Text className="text-slate-400 text-center">
              Run a network scan to discover devices
            </Text>
          </View>
        }
      />
    </View>
  );
}
