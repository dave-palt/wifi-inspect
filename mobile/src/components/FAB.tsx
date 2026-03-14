import { ReactNode } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

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
      className={`w-full h-full rounded-full items-center justify-center ${
        disabled ? 'bg-slate-600' : 'bg-blue-500'
      }`}
      style={[
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
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
        className="items-center"
      >
        {renderButton()}
        {label && (
          <Text className={`text-lg font-semibold mt-4 ${
            disabled ? 'text-slate-500' : 'text-white'
          }`}>
            {label}
          </Text>
        )}
        {sublabel && (
          <Text className="text-slate-400 text-sm mt-1">
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
