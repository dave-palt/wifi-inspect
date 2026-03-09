import { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, Laptop, Smartphone, Tv, Router, Home, HelpCircle, Shield, AlertTriangle, Wifi } from 'lucide-react-native';
import { useDeviceStore } from '../../src/stores/scanStore';
import { colors, borderRadius, spacing } from '../../src/utils/design';
import { Badge } from '../../src/components/Badge';
import { ThreatMeter } from '../../src/components/ThreatMeter';
import type { Device } from '@shared/src/types/device';

const getDeviceIcon = (type?: string) => {
  const iconProps = { size: 24, color: colors.text.secondary };
  switch (type) {
    case 'camera': return <Video {...iconProps} color={colors.danger} />;
    case 'phone': return <Smartphone {...iconProps} />;
    case 'laptop': return <Laptop {...iconProps} />;
    case 'tablet': return <Smartphone {...iconProps} />;
    case 'smart_tv': return <Tv {...iconProps} />;
    case 'router': return <Router {...iconProps} />;
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
      style={{
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        backgroundColor: colors.elevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: `${colors.danger}40`,
      }}
      onPress={() => handleDevicePress(item.mac)}
      activeOpacity={0.7}
    >
      <View style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: borderRadius.md,
          backgroundColor: `${colors.danger}20`,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {getDeviceIcon(item.deviceType)}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.text.primary, fontWeight: '600', fontSize: 16, flex: 1 }}>
              {item.vendor || 'Unknown Device'}
            </Text>
            {item.deviceType === 'camera' && (
              <Badge variant="danger">Camera</Badge>
            )}
          </View>
          <Text style={{ color: colors.text.secondary, fontSize: 14 }}>{item.ip}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: colors.text.tertiary, fontSize: 12, marginBottom: 4 }}>
            Threat Level
          </Text>
          <View style={{ width: 80 }}>
            <ThreatMeter level={item.threatLevel ?? 0} size="sm" />
          </View>
        </View>
      </View>
      {item.threatReasons && item.threatReasons.length > 0 && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          <View style={{ paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.subtle }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Shield size={14} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: 13, flex: 1 }}>{item.threatReasons[0]}</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
        <Text style={{ color: colors.text.primary, fontSize: 24, fontWeight: '700' }}>Threats</Text>
        <Text style={{ color: colors.text.secondary, fontSize: 14, marginTop: 4 }}>
          {threatDevices.length} high-risk device{threatDevices.length !== 1 ? 's' : ''} detected
        </Text>
      </View>

      <FlatList
        data={threatDevices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.mac}
        contentContainerStyle={{ paddingVertical: spacing.md }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: spacing.lg }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: `${colors.success}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}>
              <Shield size={32} color={colors.success} />
            </View>
            <Text style={{ color: colors.text.primary, fontSize: 20, fontWeight: '600', marginBottom: 8 }}>No Threats Found</Text>
            <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
              Your network appears safe. Run a scan from the home screen to check for devices.
            </Text>
          </View>
        }
      />
    </View>
  );
}
