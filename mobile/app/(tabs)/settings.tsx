import { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { useSettingsStore } from '../../src/stores/settingsStore';

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
    <ScrollView className="flex-1 bg-slate-900 px-4">
      <View className="py-6">
        {/* Connection Section */}
        <Text className="text-slate-400 text-sm font-semibold mb-3 uppercase">Connection</Text>
        <View className="bg-slate-800 rounded-xl border border-slate-700 mb-6">
          <View className="p-4 border-b border-slate-700">
            <Text className="text-white font-medium mb-2">Backend URL</Text>
            {editingUrl ? (
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 bg-slate-900 text-white rounded-lg px-3 py-2"
                  value={tempUrl}
                  onChangeText={setTempUrl}
                  placeholder="http://localhost:3000"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  className="bg-blue-600 px-4 rounded-lg justify-center"
                  onPress={handleSaveUrl}
                >
                  <Text className="text-white font-medium">Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingUrl(true)}>
                <Text className="text-slate-400">{backendUrl}</Text>
                <Text className="text-blue-400 text-sm mt-1">Tap to edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Scanning Section */}
        <Text className="text-slate-400 text-sm font-semibold mb-3 uppercase">Scanning</Text>
        <View className="bg-slate-800 rounded-xl border border-slate-700 mb-6">
          <View className="p-4 flex-row items-center justify-between border-b border-slate-700">
            <View className="flex-1">
              <Text className="text-white font-medium">Auto-scan on connect</Text>
              <Text className="text-slate-400 text-sm">Automatically scan when joining a new network</Text>
            </View>
            <Switch
              value={autoScanEnabled}
              onValueChange={setAutoScanEnabled}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>
          <View className="p-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white font-medium">Camera alerts</Text>
              <Text className="text-slate-400 text-sm">Show alerts when cameras are detected</Text>
            </View>
            <Switch
              value={cameraAlertsEnabled}
              onValueChange={setCameraAlertsEnabled}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Privacy Section */}
        <Text className="text-slate-400 text-sm font-semibold mb-3 uppercase">Privacy</Text>
        <View className="bg-slate-800 rounded-xl border border-slate-700 mb-6">
          <View className="p-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white font-medium">Location sharing</Text>
              <Text className="text-slate-400 text-sm">Share location when reporting networks (optional)</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* About Section */}
        <Text className="text-slate-400 text-sm font-semibold mb-3 uppercase">About</Text>
        <View className="bg-slate-800 rounded-xl border border-slate-700 mb-6">
          <View className="p-4 border-b border-slate-700">
            <Text className="text-white font-medium">CamDetect</Text>
            <Text className="text-slate-400 text-sm">Version 1.0.0</Text>
          </View>
          <TouchableOpacity
            className="p-4 border-b border-slate-700"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy would open here')}
          >
            <Text className="text-white">Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-4"
            onPress={() => Alert.alert('Terms of Service', 'Terms of service would open here')}
          >
            <Text className="text-white">Terms of Service</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text className="text-slate-400 text-sm font-semibold mb-3 uppercase">Data</Text>
        <View className="bg-slate-800 rounded-xl border border-red-900 mb-6">
          <TouchableOpacity
            className="p-4"
            onPress={() => Alert.alert(
              'Clear Data',
              'This will delete all local scan history. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => {} },
              ]
            )}
          >
            <Text className="text-red-400">Clear Local Data</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
