import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import * as Location from 'expo-location';

export type PermissionStatus = 
  | 'checking'
  | 'granted'
  | 'denied'
  | 'can_ask_again'
  | 'permanently_denied';

export interface PermissionsState {
  locationPermission: PermissionStatus;
  locationServicesEnabled: boolean;
  isChecking: boolean;
  canScan: boolean;
  errorMessage: string | null;
}

export function usePermissions() {
  const [state, setState] = useState<PermissionsState>({
    locationPermission: 'checking',
    locationServicesEnabled: false,
    isChecking: true,
    canScan: false,
    errorMessage: null,
  });

  const checkPermissions = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      const locationEnabled = await Location.hasServicesEnabledAsync();

      let permissionStatus: PermissionStatus;
      let errorMessage: string | null = null;
      let canScan = false;

      if (status === 'granted') {
        permissionStatus = 'granted';
        if (!locationEnabled) {
          errorMessage = 'Location services are disabled. Please enable Location (GPS) in your device settings.';
        } else {
          canScan = true;
        }
      } else if (status === 'denied') {
        if (canAskAgain) {
          permissionStatus = 'can_ask_again';
          errorMessage = 'Location permission is required to detect WiFi networks.';
        } else {
          permissionStatus = 'permanently_denied';
          errorMessage = 'Location permission was denied. Please enable it in Settings.';
        }
      } else {
        permissionStatus = 'denied';
        errorMessage = 'Location permission is required to detect WiFi networks.';
      }

      setState({
        locationPermission: permissionStatus,
        locationServicesEnabled: locationEnabled,
        isChecking: false,
        canScan,
        errorMessage,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      setState({
        locationPermission: 'denied',
        locationServicesEnabled: false,
        isChecking: false,
        canScan: false,
        errorMessage: 'Failed to check permissions. Please try again.',
      });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      const locationEnabled = await Location.hasServicesEnabledAsync();

      let permissionStatus: PermissionStatus;
      let errorMessage: string | null = null;
      let canScan = false;

      if (status === 'granted') {
        permissionStatus = 'granted';
        if (!locationEnabled) {
          errorMessage = 'Location services are disabled. Please enable Location (GPS) in your device settings.';
        } else {
          canScan = true;
        }
      } else if (status === 'denied') {
        if (canAskAgain) {
          permissionStatus = 'can_ask_again';
          errorMessage = 'Location permission is required to detect WiFi networks.';
        } else {
          permissionStatus = 'permanently_denied';
          errorMessage = 'Location permission was denied. Please enable it in Settings.';
        }
      } else {
        permissionStatus = 'denied';
        errorMessage = 'Location permission is required to detect WiFi networks.';
      }

      setState({
        locationPermission: permissionStatus,
        locationServicesEnabled: locationEnabled,
        isChecking: false,
        canScan,
        errorMessage,
      });

      return status === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      setState(prev => ({
        ...prev,
        isChecking: false,
        errorMessage: 'Failed to request permission. Please try again.',
      }));
      return false;
    }
  }, []);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'android') {
      Linking.openSettings();
    } else {
      Linking.openSettings();
    }
  }, []);

  const promptEnableLocation = useCallback(() => {
    Alert.alert(
      'Location Services Disabled',
      'Location services must be enabled to detect WiFi networks. Would you like to open Location Settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
            } else {
              Linking.openSettings();
            }
          }
        },
      ]
    );
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    ...state,
    checkPermissions,
    requestPermission,
    openSettings,
    promptEnableLocation,
  };
}
