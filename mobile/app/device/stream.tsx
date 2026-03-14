import { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Video from 'react-native-video';
import { Play, RefreshCw, ExternalLink, Lock, AlertTriangle } from 'lucide-react-native';
import { Button } from '../../src/components/Button';
import { buildRtspUrl } from '../../src/services/cameraDiscovery';

type StreamStatus = 'loading' | 'playing' | 'error' | 'auth_required';

export default function StreamScreen() {
  const params = useLocalSearchParams<{
    ip: string;
    port: string;
    path: string;
    requiresAuth: string;
    vendor: string;
  }>();
  const router = useRouter();

  const [status, setStatus] = useState<StreamStatus>('loading');
  const [customPath, setCustomPath] = useState(params.path || '/');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ip = params.ip;
  const port = parseInt(params.port || '554', 10);
  const requiresAuth = params.requiresAuth === 'true';
  const vendor = params.vendor || 'Camera';

  useEffect(() => {
    if (requiresAuth) {
      setStatus('auth_required');
    } else {
      startStream(customPath);
    }
  }, []);

  const startStream = useCallback((path: string, credentials?: { username: string; password: string }) => {
    setStatus('loading');
    setErrorMessage(null);
    
    const url = buildRtspUrl(ip, port, path, credentials);
    setCurrentUrl(url);
  }, [ip, port]);

  const handleConnect = useCallback(() => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }
    startStream(customPath, { username, password });
  }, [username, password, customPath, startStream]);

  const handleRetry = useCallback(() => {
    if (requiresAuth && username && password) {
      startStream(customPath, { username, password });
    } else if (requiresAuth) {
      setStatus('auth_required');
    } else {
      startStream(customPath);
    }
  }, [requiresAuth, username, password, customPath, startStream]);

  const handleTryCustomPath = useCallback(() => {
    if (requiresAuth && username && password) {
      startStream(customPath, { username, password });
    } else if (requiresAuth) {
      setStatus('auth_required');
    } else {
      startStream(customPath);
    }
  }, [requiresAuth, username, password, customPath, startStream]);

  const handleOpenExternal = useCallback(async () => {
    let url = currentUrl || buildRtspUrl(ip, port, customPath);
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot Open', 'No app available to handle RTSP streams. Please install a video player app like VLC.');
    }
  }, [currentUrl, ip, port, customPath]);

  const handleVideoLoad = useCallback(() => {
    setStatus('playing');
    setErrorMessage(null);
  }, []);

  const handleVideoError = useCallback((error: any) => {
    console.error('Video error:', error);
    setStatus('error');
    
    const message = error?.errorString || error?.message || 'Failed to connect to stream';
    if (message.includes('401') || message.includes('Unauthorized') || message.includes('auth')) {
      setStatus('auth_required');
      setErrorMessage('Authentication required. Please enter credentials.');
    } else {
      setErrorMessage(message);
    }
  }, []);

  const renderVideoPlayer = () => {
    if (!currentUrl || status === 'auth_required') {
      return null;
    }

    return (
      <Video
        source={{ uri: currentUrl }}
        style={{ flex: 1, backgroundColor: '#0a0a0f' }}
        resizeMode="contain"
        onLoad={handleVideoLoad}
        onError={handleVideoError}
        paused={false}
        repeat={false}
        playInBackground={false}
        playWhenInactive={false}
      />
    );
  };

  const renderOverlay = () => {
    if (status === 'playing') {
      return null;
    }

    return (
      <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/80 justify-center items-center px-8">
        {status === 'loading' && (
          <View className="items-center gap-4">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-white text-base">Connecting to stream...</Text>
            <Text className="text-slate-500 text-xs">{ip}:{port}</Text>
          </View>
        )}

        {status === 'error' && (
          <View className="items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center">
              <AlertTriangle size={32} color="#ef4444" />
            </View>
            <Text className="text-white text-lg font-semibold">Connection Failed</Text>
            <Text className="text-slate-400 text-sm text-center">
              {errorMessage || 'Could not connect to the camera stream'}
            </Text>
            <Button variant="primary" onPress={handleRetry} icon={<RefreshCw size={18} color="#fff" />}>
              Retry
            </Button>
          </View>
        )}

        {status === 'auth_required' && (
          <View className="w-full max-w-[320px] gap-4">
            <View className="items-center gap-3">
              <View className="w-14 h-14 rounded-full bg-amber-500/20 items-center justify-center">
                <Lock size={28} color="#f59e0b" />
              </View>
              <Text className="text-white text-lg font-semibold">Authentication Required</Text>
              <Text className="text-slate-400 text-sm text-center">
                This camera requires login credentials
              </Text>
            </View>

            <View className="gap-3">
              <TextInput
                className="bg-slate-800 rounded-xl p-4 text-white text-base"
                placeholder="Username"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                className="bg-slate-800 rounded-xl p-4 text-white text-base"
                placeholder="Password"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Button variant="primary" fullWidth onPress={handleConnect} icon={<Play size={18} color="#fff" />}>
              Connect
            </Button>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: vendor,
          headerBackTitle: 'Back',
        }} 
      />
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 bg-slate-950">
          <View className="flex-1">
            {renderVideoPlayer()}
            {renderOverlay()}
          </View>

          <View className="bg-slate-900 border-t border-slate-800 p-4 gap-4">
            <View className="gap-3">
              <Text className="text-slate-500 text-[11px] uppercase tracking-wider">
                RTSP Path
              </Text>
              <View className="flex-row gap-3">
                <TextInput
                  className="flex-1 bg-slate-800 rounded-xl p-4 text-white text-sm"
                  value={customPath}
                  onChangeText={setCustomPath}
                  placeholder="/stream1"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Button variant="secondary" onPress={handleTryCustomPath}>
                  Try
                </Button>
              </View>
            </View>

            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                onPress={handleRetry}
                icon={<RefreshCw size={16} color="#f8fafc" />}
              >
                Retry
              </Button>
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                onPress={handleOpenExternal}
                icon={<ExternalLink size={16} color="#f8fafc" />}
              >
                Open External
              </Button>
            </View>

            <Text className="text-slate-500 text-xs text-center">
              rtsp://{ip}:{port}{customPath}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
