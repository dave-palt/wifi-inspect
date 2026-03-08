import { useState } from 'react';
import { View, Text, Switch, Alert, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Server, Scan, Bell, MapPin, Info, FileText, Trash2, ChevronRight } from 'lucide-react-native';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-5 mb-2 mt-6">
      {title}
    </Text>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  children,
  onPress,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const content = (
    <View className="flex-row items-center gap-4 py-3.5">
      <View className="w-9 h-9 rounded-lg bg-slate-700/50 items-center justify-center">
        {icon}
      </View>
      <View className="flex-1">
        <Text className={`font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{title}</Text>
        {subtitle && <Text className="text-slate-500 text-sm mt-0.5">{subtitle}</Text>}
      </View>
      {children}
      {onPress && !children && <ChevronRight size={20} color="#64748b" />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity className="px-5 active:bg-slate-800/50" onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View className="px-5">{content}</View>;
}

export default function SettingsScreen() {
  const {
    backendUrl,
    setBackendUrl,
    locationEnabled,
    setLocationEnabled,
    autoScanEnabled,
    setAutoScanEnabled,
    cameraAlertsEnabled,
    setCameraAlertsEnabled,
  } = useSettingsStore();

  const [editingUrl, setEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(backendUrl);

  const handleSaveUrl = () => {
    setBackendUrl(tempUrl);
    setEditingUrl(false);
    Alert.alert('Saved', 'Backend URL updated');
  };

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="px-5 py-4 border-b border-slate-800">
        <Text className="text-white text-2xl font-bold">Settings</Text>
        <Text className="text-slate-400 text-sm mt-1">Configure your preferences</Text>
      </View>

      <SectionHeader title="Connection" />
      <Card className="mx-5">
        {editingUrl ? (
          <View className="p-4">
            <Text className="text-white font-medium mb-2">Backend URL</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 border border-slate-700"
                value={tempUrl}
                onChangeText={setTempUrl}
                placeholder="http://localhost:3000"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button onPress={handleSaveUrl}>Save</Button>
            </View>
          </View>
        ) : (
          <SettingRow
            icon={<Server size={20} color="#3b82f6" />}
            title="Backend URL"
            subtitle={backendUrl}
            onPress={() => setEditingUrl(true)}
          />
        )}
      </Card>

      <SectionHeader title="Scanning" />
      <Card className="mx-5">
        <SettingRow
          icon={<Scan size={20} color="#3b82f6" />}
          title="Auto-scan on connect"
          subtitle="Automatically scan when joining a new network"
        >
          <Switch
            value={autoScanEnabled}
            onValueChange={setAutoScanEnabled}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#fff"
          />
        </SettingRow>
        <View className="h-px bg-slate-700/50 mx-5" />
        <SettingRow
          icon={<Bell size={20} color="#3b82f6" />}
          title="Camera alerts"
          subtitle="Show alerts when cameras are detected"
        >
          <Switch
            value={cameraAlertsEnabled}
            onValueChange={setCameraAlertsEnabled}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#fff"
          />
        </SettingRow>
      </Card>

      <SectionHeader title="Privacy" />
      <Card className="mx-5">
        <SettingRow
          icon={<MapPin size={20} color="#3b82f6" />}
          title="Location sharing"
          subtitle="Share location when reporting networks (optional)"
        >
          <Switch
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#fff"
          />
        </SettingRow>
      </Card>

      <SectionHeader title="About" />
      <Card className="mx-5">
        <SettingRow
          icon={<Info size={20} color="#3b82f6" />}
          title="CamDetect"
          subtitle="Version 1.0.0"
        />
        <View className="h-px bg-slate-700/50 mx-5" />
        <SettingRow
          icon={<FileText size={20} color="#3b82f6" />}
          title="Privacy Policy"
          onPress={() => Alert.alert('Privacy Policy', 'Privacy policy would open here')}
        />
        <View className="h-px bg-slate-700/50 mx-5" />
        <SettingRow
          icon={<FileText size={20} color="#3b82f6" />}
          title="Terms of Service"
          onPress={() => Alert.alert('Terms of Service', 'Terms of service would open here')}
        />
      </Card>

      <SectionHeader title="Data" />
      <Card className="mx-5 border-red-900/30">
        <SettingRow
          icon={<Trash2 size={20} color="#ef4444" />}
          title="Clear Local Data"
          subtitle="Delete all local scan history"
          danger
          onPress={() => Alert.alert(
            'Clear Data',
            'This will delete all local scan history. This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => {} },
            ]
          )}
        />
      </Card>

      <View className="h-8" />
    </ScrollView>
  );
}
