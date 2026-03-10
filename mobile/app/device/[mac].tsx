import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { View, Text, ScrollView, Alert, Linking, TouchableOpacity, Image } from 'react-native';
import { Video, Router as RouterIcon, Smartphone, Copy, ExternalLink, Shield, AlertTriangle, Play, Lock } from 'lucide-react-native';
import { useDeviceStore } from '../../src/stores/scanStore';
import { useCallback, useState } from 'react';
import { Clipboard } from 'react-native';
import { apiService } from '../../src/services/api';
import { hashBssid } from '../../src/utils/crypto';
import { colors, borderRadius, spacing, shadows } from '../../src/utils/design';
import { Badge } from '../../src/components/Badge';
import { ThreatMeter } from '../../src/components/ThreatMeter';
import { Button } from '../../src/components/Button';
import type { Device } from '@shared/src/types/device';

const getThreatColor = (level?: number): string => {
  if (!level || level === 0) return colors.text.tertiary;
  if (level <= 1) return colors.success;
  if (level <= 2) return colors.warning;
  if (level <= 3) return '#fb923c';
  return colors.danger;
};

const getDeviceIcon = (type?: string) => {
  const iconProps = { size: 28, color: colors.text.secondary };
  switch (type) {
    case 'camera':
      return <Video {...iconProps} color={colors.danger} />;
    case 'router':
      return <RouterIcon {...iconProps} color={colors.primary} />;
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

    const handleViewStream = useCallback(() => {
        if (!device) return;
        
        const rtspPort = device.openPorts?.find(p => p.number === 554 || p.number === 8554)?.number || 554;
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
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '600' }}>Device not found</Text>
                <TouchableOpacity style={{ marginTop: spacing.md }} onPress={() => router.back()}>
                    <Text style={{ color: colors.primary }}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const threatLevel = device.threatLevel ?? 0;
    const isHighThreat = threatLevel >= 3 || device.deviceType === 'camera';
    const isCamera = device.deviceType === 'camera'
    const hasRtspPort = device.openPorts?.some(p => p.number === 554 || p.number === 8554);
    const canViewStream = isCamera || hasRtspPort;

    return (
        <>
            <Stack.Screen options={{ title: device.vendor || 'Device Details' }} />
            <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
                {isHighThreat && (
                    <View style={{
                        backgroundColor: `${colors.danger}15`,
                        borderWidth: 1,
                        borderColor: `${colors.danger}40`,
                        borderRadius: borderRadius.lg,
                        padding: spacing.md,
                        marginBottom: spacing.md,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <Shield size={24} color={colors.danger} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.danger, fontSize: 20, fontWeight: '700' }}>
                                    {isCamera ? 'Camera Detected' : 'High Threat Device'}
                                </Text>
                                <Text style={{ color: colors.text.secondary, fontSize: 14 }}>
                                    {threatLevel >= 4 ? 'Critical risk - review immediately' : threatLevel >= 3 ? 'Immediate attention recommended' : 'Review recommended'}
                                </Text>
                    </View>
                </View>

                {canViewStream && (
                    <View style={{ backgroundColor: colors.elevated, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                            <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600' }}>Camera Stream</Text>
                            {device.cameraEndpoints?.requiresAuth && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Lock size={14} color={colors.warning} />
                                    <Text style={{ color: colors.warning, fontSize: 12 }}>Auth Required</Text>
                                </View>
                            )}
                        </View>
                        
                        {device.cameraEndpoints?.snapshotUrl ? (
                            <TouchableOpacity 
                                style={{ marginBottom: spacing.md }}
                                onPress={handleViewStream}
                            >
                                <Image
                                    source={{ uri: device.cameraEndpoints.snapshotUrl }}
                                    style={{
                                        width: '100%',
                                        height: 180,
                                        borderRadius: borderRadius.md,
                                        backgroundColor: colors.background,
                                    }}
                                    resizeMode="cover"
                                />
                                <View style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    marginTop: -24,
                                    marginLeft: -24,
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Play size={24} color="#fff" fill="#fff" />
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={{
                                width: '100%',
                                height: 120,
                                borderRadius: borderRadius.md,
                                backgroundColor: colors.background,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: spacing.md,
                            }}>
                                <Video size={40} color={colors.text.tertiary} />
                                <Text style={{ color: colors.text.tertiary, fontSize: 12, marginTop: spacing.sm }}>
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

                <View style={{ backgroundColor: colors.elevated, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <View style={{
                            width: 56,
                            height: 56,
                            borderRadius: borderRadius.lg,
                            backgroundColor: isHighThreat ? `${colors.danger}20` : device.deviceType === 'router' ? `${colors.primary}20` : colors.border.subtle,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {getDeviceIcon(device.deviceType)}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text.primary, fontSize: 20, fontWeight: '600' }} numberOfLines={1}>
                                {device.vendor || 'Unknown Device'}
                            </Text>
                            {device.hostname && (
                                <Text style={{ color: colors.text.secondary, fontSize: 14 }}>{device.hostname}</Text>
                            )}
                        </View>
                    </View>
                </View>

                <View style={{ backgroundColor: colors.elevated, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                    <Text style={{ color: colors.text.tertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Network Info</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text.tertiary, fontSize: 12 }}>IP Address</Text>
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                onPress={() => handleCopy(device.ip, 'IP address')}
                            >
                                <Text style={{ color: colors.text.primary }}>{device.ip}</Text>
                                <Copy size={14} color={colors.text.tertiary} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text.tertiary, fontSize: 12 }}>MAC Address</Text>
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                onPress={() => handleCopy(device.mac, 'MAC address')}
                            >
                                <Text style={{ color: colors.text.primary, fontSize: 12 }}>{device.mac.substring(0, 8)}...{device.mac.substring(8)}</Text>
                                <Copy size={14} color={colors.text.tertiary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {device.signalStrength && (
                    <View style={{ backgroundColor: colors.elevated, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                        <Text style={{ color: colors.text.tertiary, fontSize: 12 }}>Signal Strength</Text>
                        <Text style={{ color: colors.text.primary }}>{device.signalStrength} dBm</Text>
                    </View>
                )}

                <View style={{ backgroundColor: colors.elevated, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <Shield size={18} color={getThreatColor(threatLevel)} />
                        <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600' }}>Security Analysis</Text>
                    </View>
                    <ThreatMeter level={threatLevel} size="lg" />
                    {device.threatReasons && device.threatReasons.length > 0 && (
                        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                            {device.threatReasons.map((reason, index) => (
                                <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                                    <AlertTriangle size={14} color={colors.danger} />
                                    <Text style={{ color: colors.text.secondary, flex: 1, fontSize: 13 }}>{reason}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {device.openPorts && device.openPorts.length > 0 && (
                    <View style={{ backgroundColor: colors.elevated, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600' }}>Open Ports</Text>
                            <Badge>{device.openPorts.length}</Badge>
                        </View>
                        <View style={{ gap: spacing.sm }}>
                            {device.openPorts.map((port) => (
                                <TouchableOpacity
                                    key={port.number}
                                    style={{
                                        backgroundColor: colors.background,
                                        borderRadius: borderRadius.md,
                                        padding: spacing.md,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                    onPress={() => handleOpenPort(device.ip, port.number, port.service)}
                                    activeOpacity={1.7}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                        <Text style={{ fontSize: 18 }}>{getServiceIcon(port.service)}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.text.primary, fontWeight: '500' }}>{port.service || 'Unknown'}</Text>
                                            <Text style={{ color: colors.text.tertiary, fontSize: 12 }}>Port {port.number}</Text>
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

                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 1,
                    backgroundColor: colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: colors.border.subtle,
                    paddingHorizontal: spacing.md,
                    paddingBottom: spacing.lg,
                }}>
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