import { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, Laptop, Smartphone, Tv, Router as RouterIcon, Home, HelpCircle, Shield, AlertTriangle } from 'lucide-react-native';
import { useDeviceStore } from '../../src/stores/scanStore';
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
    case 'router': return <RouterIcon {...iconProps} />;
    case 'iot_device': return <Home {...iconProps} />;
    default: return <HelpCircle {...iconProps} />;
  }
};

export default function ThreatsScreen() {
  const router = useRouter();
  const { devices } = useDeviceStore();

  const threatDevices = devices
    .filter(d => (d.threatLevel ?? 0) >= 3 || d.deviceType === 'camera')
    .sort((a, b) => (b.threatLevel ?? 0) - (a.threatLevel ?? 0));

  const handleDevicePress = useCallback((mac: string) => {
    router.push(`/device/${mac}`);
  }, [router]);

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity
      className="mx-4 mb-3 bg-slate-800 rounded-2xl border border-red-500/40"
      onPress={() => handleDevicePress(item.mac)}
      activeOpacity={0.7}
    >
      <View className="p-4 flex-row items-center gap-4">
        <View className="w-12 h-12 rounded-xl bg-red-500/20 items-center justify-center">
          {getDeviceIcon(item.deviceType)}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-white font-semibold text-base flex-1">
              {item.vendor || 'Unknown Device'}
            </Text>
            {item.deviceType === 'camera' && (
              <Badge variant="danger">Camera</Badge>
            )}
          </View>
          <Text className="text-slate-400 text-sm">{item.ip}</Text>
        </View>
        <View className="items-end">
          <Text className="text-slate-500 text-xs mb-1">Threat Level</Text>
          <View className="w-20">
            <ThreatMeter level={item.threatLevel ?? 0} size="sm" />
          </View>
        </View>
      </View>
      {item.threatReasons && item.threatReasons.length > 0 && (
        <View className="px-4 pb-4">
          <View className="pt-3 border-t border-slate-700">
            <View className="flex-row items-center gap-2">
              <Shield size={14} color="#ef4444" />
              <Text className="text-red-400 text-[13px] flex-1">
                {item.threatReasons[0]}
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-5 py-4 border-b border-slate-800">
        <Text className="text-white text-2xl font-bold">Threats</Text>
        <Text className="text-slate-400 text-sm mt-1">
          {threatDevices.length} high-risk device{threatDevices.length !== 1 ? 's' : ''} detected
        </Text>
      </View>

      <FlatList
        data={threatDevices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.mac}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20 px-5">
            <View className="w-16 h-16 rounded-full bg-emerald-500/20 items-center justify-center mb-4">
              <Shield size={32} color="#10b981" />
            </View>
            <Text className="text-white text-xl font-semibold mb-2">No Threats Found</Text>
            <Text className="text-slate-400 text-center">
              Your network appears safe. Run a scan from the home screen to check for devices.
            </Text>
          </View>
        }
      />
    </View>
  );
}
