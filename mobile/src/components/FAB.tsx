import { ReactNode } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, shadows } from '../utils/design';

interface FABProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg' | 'xl';
  icon?: ReactNode;
  label?: string;
  sublabel?: string;
  style?: ViewStyle;
}

const sizeConfig = {
  md: { diameter: 80, iconSize: 28 },
  lg: { diameter: 120, iconSize: 40 },
  xl: { diameter: 160, iconSize: 52 },
};

export function FAB({
  onPress,
  loading = false,
  disabled = false,
  size = 'lg',
  icon,
  label,
  sublabel,
  style,
}: FABProps) {
  const { diameter, iconSize } = sizeConfig[size];

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const renderButton = () => (
    <View
      style={[
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: disabled ? colors.border.default : colors.primary,
          ...shadows.lg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
      )}
    </View>
  );

  if (label || sublabel) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={{ alignItems: 'center' }}
      >
        {renderButton()}
        {label && (
          <Text
            style={{
              color: disabled ? colors.text.tertiary : colors.text.primary,
              fontSize: 18,
              fontWeight: '600',
              marginTop: 16,
            }}
          >
            {label}
          </Text>
        )}
        {sublabel && (
          <Text
            style={{
              color: colors.text.secondary,
              fontSize: 14,
              marginTop: 4,
            }}
          >
            {sublabel}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {renderButton()}
    </TouchableOpacity>
  );
}
