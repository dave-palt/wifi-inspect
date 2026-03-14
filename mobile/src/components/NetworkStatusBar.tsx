import { TouchableOpacity, View, Text, ActivityIndicator } from 'react-native';
import { Wifi, ChevronUp, Shield, AlertTriangle } from 'lucide-react-native';

interface NetworkStatusBarProps {
  ssid: string;
  isConnected: boolean;
  isChecking?: boolean;
  reputation?: 'safe' | 'unknown' | 'warning' | 'danger';
  alertCount?: number;
  onPress: () => void;
}

const reputationConfig = {
  safe: { color: '#10b981', label: 'Safe', icon: Shield, tw: 'text-emerald-500 bg-emerald-500' },
  unknown: { color: '#64748b', label: 'Unknown', icon: Wifi, tw: 'text-slate-500 bg-slate-500' },
  warning: { color: '#f59e0b', label: 'Caution', icon: AlertTriangle, tw: 'text-amber-500 bg-amber-500' },
  danger: { color: '#ef4444', label: 'Risk Detected', icon: AlertTriangle, tw: 'text-red-500 bg-red-500' },
};

export function NetworkStatusBar({
  ssid,
  isConnected,
  isChecking = false,
  reputation = 'unknown',
  alertCount = 0,
  onPress,
}: NetworkStatusBarProps) {
  const config = reputationConfig[reputation];
  const IconComponent = config.icon;

  if (!isConnected) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className="bg-slate-800 py-3 px-4 rounded-2xl mx-4 mb-4 flex-row items-center justify-center gap-3"
      >
        <Wifi size={18} color="#f59e0b" />
        <Text className="text-amber-500 font-medium">Not connected to WiFi</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-slate-800 py-3.5 px-4 rounded-2xl mx-4 mb-4 flex-row items-center gap-3"
    >
      <View className={`w-8 h-8 rounded-full items-center justify-center ${config.tw.split(' ')[1]}-20`}>
        <Wifi size={16} color={config.color} />
      </View>

      <View className="flex-1">
        <Text className="text-white font-semibold text-sm" numberOfLines={1}>
          {ssid}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <IconComponent size={12} color={config.color} />
          <Text className={`text-xs ${config.tw.split(' ')[0]}`}>
            {config.label}
          </Text>
          {alertCount > 0 && (
            <View className="bg-red-500 px-1.5 py-0.5 rounded-full">
              <Text className="text-white text-[10px] font-bold">
                {alertCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {isChecking ? (
        <ActivityIndicator size="small" color="#3b82f6" />
      ) : (
        <ChevronUp size={18} color="#64748b" />
      )}
    </TouchableOpacity>
  );
}
