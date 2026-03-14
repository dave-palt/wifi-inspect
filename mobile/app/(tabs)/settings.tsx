import { useState, useEffect } from 'react';
import { View, Text, Switch, Alert, TextInput, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Server, Scan, Bell, MapPin, Info, FileText, Trash2, ChevronRight, Bug, Share2, Eye, Shield, Wifi, Plus, X } from 'lucide-react-native';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { perfLogger } from '../../src/utils/perfLogger';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { 
  hasRootBinary, 
  requestRootAccess, 
  hasRootPermission 
} from 'network-scanner';

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
    advancedMode,
    setAdvancedMode,
    customPorts,
    addCustomPort,
    removeCustomPort,
    scanAllSubnets,
    setScanAllSubnets,
  } = useSettingsStore();

  const [editingUrl, setEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(backendUrl);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logSummary, setLogSummary] = useState<ReturnType<typeof perfLogger.getSummary> | null>(null);
  const [newPortInput, setNewPortInput] = useState('');
  const [hasRoot, setHasRoot] = useState(false);
  const [checkingRoot, setCheckingRoot] = useState(false);

  useEffect(() => {
    checkRootStatus();
  }, []);

  const checkRootStatus = async () => {
    try {
      const rootAvailable = await hasRootBinary();
      setHasRoot(rootAvailable);
    } catch {
      setHasRoot(false);
    }
  };

  const handleAdvancedModeToggle = async (enabled: boolean) => {
    if (!enabled) {
      setAdvancedMode(false);
      return;
    }

    setCheckingRoot(true);
    try {
      const granted = await requestRootAccess();
      if (granted) {
        setAdvancedMode(true);
        Alert.alert('Root Access Granted', 'Advanced scanning features are now enabled.');
      } else {
        setAdvancedMode(false);
        Alert.alert('Root Access Denied', 'Root permission was not granted. Advanced features require root access.');
      }
    } catch (error) {
      setAdvancedMode(false);
      Alert.alert('Error', 'Failed to request root access.');
    } finally {
      setCheckingRoot(false);
    }
  };

  const handleAddPort = () => {
    const port = parseInt(newPortInput.trim(), 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      Alert.alert('Invalid Port', 'Please enter a valid port number (1-65535).');
      return;
    }
    if (customPorts.includes(port)) {
      Alert.alert('Duplicate Port', 'This port is already in the list.');
      return;
    }
    addCustomPort(port);
    setNewPortInput('');
  };

  const handleRemovePort = (port: number) => {
    removeCustomPort(port);
  };

  const handleSaveUrl = () => {
    setBackendUrl(tempUrl);
    setEditingUrl(false);
    Alert.alert('Saved', 'Backend URL updated');
  };

  const handleViewLogs = () => {
    const summary = perfLogger.getSummary();
    setLogSummary(summary);
    setShowLogModal(true);
  };

  const handleExportLogs = async () => {
    await perfLogger.shareLogs();
  };

  const handleClearLogs = () => {
    perfLogger.clearLogs();
    Alert.alert('Cleared', 'Performance logs have been cleared');
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
          icon={<Shield size={20} color={advancedMode ? '#22c55e' : '#64748b'} />}
          title="Advanced Scanning"
          subtitle={hasRoot ? "Requires root permission" : "Root not available on this device"}
        >
          <Switch
            value={advancedMode}
            onValueChange={handleAdvancedModeToggle}
            trackColor={{ false: '#334155', true: '#22c55e' }}
            thumbColor="#fff"
            disabled={!hasRoot || checkingRoot}
          />
        </SettingRow>
        <View className="h-px bg-slate-700/50 mx-5" />
        <SettingRow
          icon={<Wifi size={20} color="#3b82f6" />}
          title="Scan all interfaces"
          subtitle="Scan all network subnets, not just WiFi"
        >
          <Switch
            value={scanAllSubnets}
            onValueChange={setScanAllSubnets}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor="#fff"
          />
        </SettingRow>
        <View className="h-px bg-slate-700/50 mx-5" />
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

      <SectionHeader title="Custom Ports" />
      <Card className="mx-5">
        <View className="px-5 py-3">
          <View className="flex-row items-center gap-2 mb-3">
            <TextInput
              className="flex-1 bg-slate-900 text-white rounded-lg px-3 py-2 border border-slate-700 text-sm"
              value={newPortInput}
              onChangeText={setNewPortInput}
              placeholder="Enter port number"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={5}
            />
            <TouchableOpacity
              className="w-10 h-10 bg-blue-600 rounded-lg items-center justify-center"
              onPress={handleAddPort}
            >
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {customPorts.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {customPorts.map((port) => (
                <TouchableOpacity
                  key={port}
                  className="flex-row items-center bg-slate-700 rounded-full px-3 py-1.5"
                  onPress={() => handleRemovePort(port)}
                >
                  <Text className="text-white text-sm mr-1">{port}</Text>
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text className="text-slate-500 text-sm">No custom ports added. Default ports will be used.</Text>
          )}
          
          <Text className="text-slate-500 text-xs mt-3">
            Tap a port to remove it. These ports will be scanned in addition to the default camera detection ports.
          </Text>
        </View>
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

      <SectionHeader title="Debug" />
      <Card className="mx-5">
        <SettingRow
          icon={<Bug size={20} color="#f59e0b" />}
          title="Performance Logs"
          subtitle={`${perfLogger.getSummary().totalLogs} entries`}
          onPress={handleViewLogs}
        />
        <View className="h-px bg-slate-700/50 mx-5" />
        <SettingRow
          icon={<Eye size={20} color="#3b82f6" />}
          title="View Logs"
          onPress={handleViewLogs}
        />
        <View className="h-px bg-slate-700/50 mx-5" />
        <SettingRow
          icon={<Share2 size={20} color="#3b82f6" />}
          title="Export Logs"
          subtitle="Share log file for analysis"
          onPress={handleExportLogs}
        />
        <View className="h-px bg-slate-700/50 mx-5" />
        <SettingRow
          icon={<Trash2 size={20} color="#ef4444" />}
          title="Clear Logs"
          danger
          onPress={handleClearLogs}
        />
      </Card>

      <Modal
        visible={showLogModal}
        animationType="slide"
        onRequestClose={() => setShowLogModal(false)}
      >
        <View className="flex-1 bg-slate-950">
          <View className="px-5 py-4 border-b border-slate-800 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">Performance Logs</Text>
            <TouchableOpacity onPress={() => setShowLogModal(false)}>
              <Text className="text-blue-500 font-medium">Close</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView className="flex-1 p-5">
            {logSummary && (
              <View>
                <Text className="text-white font-semibold mb-2">Summary</Text>
                <Text className="text-slate-400 mb-4">
                  Total logs: {logSummary.totalLogs}
                </Text>
                
                <Text className="text-white font-semibold mb-2">Categories</Text>
                {Object.entries(logSummary.categories).map(([category, count]) => (
                  <Text key={category} className="text-slate-400">
                    {category}: {count}
                  </Text>
                ))}
                
                {logSummary.slowOperations.length > 0 && (
                  <>
                    <Text className="text-white font-semibold mt-4 mb-2">Slow Operations (&gt;100ms)</Text>
                    {logSummary.slowOperations.slice(0, 20).map((op, i) => (
                      <Text key={i} className="text-slate-400 text-sm">
                        [{op.category}] {op.event} ({op.duration?.toFixed(0)}ms)
                      </Text>
                    ))}
                  </>
                )}
              </View>
            )}
          </ScrollView>
          
          <View className="p-5 border-t border-slate-800">
            <Button onPress={handleExportLogs} fullWidth>
              Export Logs
            </Button>
          </View>
        </View>
      </Modal>

      <View className="h-8" />
    </ScrollView>
  );
}
