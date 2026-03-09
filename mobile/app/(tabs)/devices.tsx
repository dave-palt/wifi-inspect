import { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, Laptop, Smartphone, Tv, Router, Home, HelpCircle, Shield, Wifi } from 'lucide-react-native';
import { useDeviceStore } from '../../src/stores/scanStore';
import { colors, borderRadius, spacing } from '../../src/utils/design';
import { Badge } from '../../src/components/Badge';
import { ThreatMeter } from '../../src/components/ThreatMeter';
import type { Device } from '@shared/src/types/device';

const getDeviceIcon = (type?: string, isHighThreat?: boolean) => {
  const iconProps = { size: 24, color: isHighThreat ? colors.danger : colors.text.secondary };
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

export default function DevicesScreen() {
  const router = useRouter();
  const { devices } = useDeviceStore();

  const sortedDevices = [...devices].sort((a, b) => {
    if (a.deviceType === 'camera' && b.deviceType !== 'camera') return -1;
    if (b.deviceType === 'camera' && a.deviceType !== 'camera') return 1;
    const aThreat = a.threatLevel ?? 0;
    const bThreat = b.threatLevel ?? 0;
    return bThreat - aThreat;
  });

  const handleDevicePress = useCallback((mac: string) => {
    router.push(`/device/${mac}`);
  }, [router]);

  const renderDevice = ({ item }: { item: Device }) => {
    const isHighThreat = (item.threatLevel ?? 0) >= 3 || item.deviceType === 'camera';
    
    return (
      <TouchableOpacity
        style={{
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
          backgroundColor: colors.elevated,
          borderRadius: borderRadius.lg,
          borderWidth: isHighThreat ? 1 : 0,
          borderColor: isHighThreat ? `${colors.danger}40` : 'transparent',
        }}
        onPress={() => handleDevicePress(item.mac)}
        activeOpacity={0.7}
      >
        <View style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: borderRadius.md,
            backgroundColor: isHighThreat ? `${colors.danger}20` : `${colors.border.subtle}`,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {getDeviceIcon(item.deviceType, isHighThreat)}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: colors.text.primary, fontWeight: '600', fontSize: 16, flex: 1 }} numberOfLines={1}>
                {item.vendor || 'Unknown Device'}
              </Text>
              {item.isGateway && (
                <Badge variant="info">Gateway</Badge>
              )}
            </View>
            <Text style={{ color: colors.text.secondary, fontSize: 14 }}>{item.ip}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.text.tertiary, fontSize: 12, marginBottom: 4 }}>
              Threat
            </Text>
            <View style={{ width: 80 }}>
              <ThreatMeter level={item.threatLevel ?? 0} size="sm" />
            </View>
            {item.openPorts && item.openPorts.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Wifi size={12} color={colors.text.tertiary} />
                <Text style={{ color: colors.text.tertiary, fontSize: 11 }}>
                  {item.openPorts.length} port{item.openPorts.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
        {item.threatReasons && item.threatReasons.length > 0 && (
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
            <View style={{ paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.subtle }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Shield size={14} color={colors.danger} />
                <Text style={{ color: colors.danger, fontSize: 13, flex: 1 }} numberOfLines={1}>{item.threatReasons[0]}</Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
        <Text style={{ color: colors.text.primary, fontSize: 24, fontWeight: '700' }}>Devices</Text>
        <Text style={{ color: colors.text.secondary, fontSize: 14, marginTop: 4 }}>
          {devices.length} device{devices.length !== 1 ? 's' : ''} on network
        </Text>
      </View>

      <FlatList
        data={sortedDevices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.mac}
        contentContainerStyle={{ paddingVertical: spacing.md }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: spacing.lg }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.elevated,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}>
              <Router size={32} color={colors.text.tertiary} />
            </View>
            <Text style={{ color: colors.text.primary, fontSize: 20, fontWeight: '600', marginBottom: 8 }}>No devices found</Text>
            <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
              Run a network scan from the home screen to discover devices
            </Text>
          </View>
        }
      />
    </View>
  );
}
