import { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Video from 'react-native-video';
import { ArrowLeft, Play, RefreshCw, ExternalLink, Lock, Wifi, AlertTriangle } from 'lucide-react-native';
import { colors, spacing, borderRadius, shadows } from '../../src/utils/design';
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
        style={{ flex: 1, backgroundColor: colors.background }}
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
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
      }}>
        {status === 'loading' && (
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text.primary, fontSize: 16 }}>Connecting to stream...</Text>
            <Text style={{ color: colors.text.tertiary, fontSize: 12 }}>{ip}:{port}</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: `${colors.danger}20`,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle size={32} color={colors.danger} />
            </View>
            <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '600' }}>Connection Failed</Text>
            <Text style={{ color: colors.text.secondary, fontSize: 14, textAlign: 'center' }}>
              {errorMessage || 'Could not connect to the camera stream'}
            </Text>
            <Button variant="primary" onPress={handleRetry} icon={<RefreshCw size={18} color="#fff" />}>
              Retry
            </Button>
          </View>
        )}

        {status === 'auth_required' && (
          <View style={{ width: '100%', maxWidth: 320, gap: spacing.md }}>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: `${colors.warning}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Lock size={28} color={colors.warning} />
              </View>
              <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '600' }}>Authentication Required</Text>
              <Text style={{ color: colors.text.secondary, fontSize: 14, textAlign: 'center' }}>
                This camera requires login credentials
              </Text>
            </View>

            <View style={{ gap: spacing.sm }}>
              <TextInput
                style={{
                  backgroundColor: colors.elevated,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  color: colors.text.primary,
                  fontSize: 16,
                }}
                placeholder="Username"
                placeholderTextColor={colors.text.tertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={{
                  backgroundColor: colors.elevated,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  color: colors.text.primary,
                  fontSize: 16,
                }}
                placeholder="Password"
                placeholderTextColor={colors.text.tertiary}
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
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flex: 1 }}>
            {renderVideoPlayer()}
            {renderOverlay()}
          </View>

          <View style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border.subtle,
            padding: spacing.md,
            gap: spacing.md,
          }}>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.text.tertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                RTSP Path
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: colors.elevated,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    color: colors.text.primary,
                    fontSize: 14,
                  }}
                  value={customPath}
                  onChangeText={setCustomPath}
                  placeholder="/stream1"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Button variant="secondary" onPress={handleTryCustomPath}>
                  Try
                </Button>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                onPress={handleRetry}
                icon={<RefreshCw size={16} color={colors.text.primary} />}
              >
                Retry
              </Button>
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                onPress={handleOpenExternal}
                icon={<ExternalLink size={16} color={colors.text.primary} />}
              >
                Open External
              </Button>
            </View>

            <Text style={{ color: colors.text.tertiary, fontSize: 11, textAlign: 'center' }}>
              rtsp://{ip}:{port}{customPath}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
