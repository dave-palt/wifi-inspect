import { TouchableOpacity, View, Text, ActivityIndicator } from 'react-native';
import { Wifi, ChevronUp, Shield, AlertTriangle } from 'lucide-react-native';
import { colors, borderRadius, spacing } from '../utils/design';

interface NetworkStatusBarProps {
  ssid: string;
  isConnected: boolean;
  isChecking?: boolean;
  reputation?: 'safe' | 'unknown' | 'warning' | 'danger';
  alertCount?: number;
  onPress: () => void;
}

const reputationConfig = {
  safe: { color: colors.success, label: 'Safe', icon: Shield },
  unknown: { color: colors.text.tertiary, label: 'Unknown', icon: Wifi },
  warning: { color: colors.warning, label: 'Caution', icon: AlertTriangle },
  danger: { color: colors.danger, label: 'Risk Detected', icon: AlertTriangle },
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
        style={{
          backgroundColor: colors.elevated,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: borderRadius.lg,
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
        }}
      >
        <Wifi size={18} color={colors.warning} />
        <Text style={{ color: colors.warning, fontWeight: '500' }}>
          Not connected to WiFi
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: colors.elevated,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: `${config.color}20`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Wifi size={16} color={config.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{ color: colors.text.primary, fontWeight: '600', fontSize: 14 }}
          numberOfLines={1}
        >
          {ssid}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconComponent size={12} color={config.color} />
          <Text style={{ color: config.color, fontSize: 12 }}>
            {config.label}
          </Text>
          {alertCount > 0 && (
            <View
              style={{
                backgroundColor: colors.danger,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                {alertCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {isChecking ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <ChevronUp size={18} color={colors.text.tertiary} />
      )}
    </TouchableOpacity>
  );
}
