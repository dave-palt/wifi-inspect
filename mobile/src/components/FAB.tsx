import { ReactNode } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';

interface FABProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg' | 'xl';
  icon?: ReactNode;
  label?: string;
  sublabel?: string;
  style?: ViewStyle;
  progress?: number;
  progressMessage?: string;
}

const sizeConfig = {
  md: { diameter: 80, iconSize: 28, strokeWidth: 4 },
  lg: { diameter: 120, iconSize: 40, strokeWidth: 5 },
  xl: { diameter: 160, iconSize: 52, strokeWidth: 6 },
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
  progress = 0,
  progressMessage,
}: FABProps) {
  const { diameter, iconSize, strokeWidth } = sizeConfig[size];
  const radius = (diameter + strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const showProgress = loading && progress > 0;

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const renderProgressRing = () => {
    if (!showProgress) return null;
    
    return (
      <View 
        style={{ 
          position: 'absolute', 
          width: diameter + strokeWidth * 4, 
          height: diameter + strokeWidth * 4 
        }}
        className="items-center justify-center"
      >
        <Svg 
          width={diameter + strokeWidth * 4} 
          height={diameter + strokeWidth * 4}
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          <Circle
            cx={(diameter + strokeWidth * 4) / 2}
            cy={(diameter + strokeWidth * 4) / 2}
            r={radius}
            stroke="#334155"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={(diameter + strokeWidth * 4) / 2}
            cy={(diameter + strokeWidth * 4) / 2}
            r={radius}
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
      </View>
    );
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
      {loading && !showProgress ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.5 : 1 }}>
          {icon}
        </View>
      )}
    </View>
  );

  if (label || sublabel || showProgress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        className="items-center"
      >
        <View style={{ width: diameter + strokeWidth * 4, height: diameter + strokeWidth * 4 }} className="items-center justify-center">
          {renderProgressRing()}
          {renderButton()}
        </View>
        {label && (
          <Text className={`text-lg font-semibold mt-4 ${
            disabled ? 'text-slate-500' : 'text-white'
          }`}>
            {label}
          </Text>
        )}
        {showProgress && progressMessage ? (
          <Text className="text-blue-400 text-sm mt-1 text-center max-w-[200px]">
            {progressMessage}
          </Text>
        ) : sublabel ? (
          <Text className="text-slate-400 text-sm mt-1">
            {sublabel}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      <View style={{ width: diameter + strokeWidth * 4, height: diameter + strokeWidth * 4 }} className="items-center justify-center">
        {renderProgressRing()}
        {renderButton()}
      </View>
    </TouchableOpacity>
  );
}
