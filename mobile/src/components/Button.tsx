import { ReactNode } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  onPress?: () => void;
  style?: ViewStyle;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-blue-600 active:bg-blue-700',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-slate-700 active:bg-slate-600',
    text: 'text-white',
  },
  danger: {
    container: 'bg-red-600 active:bg-red-700',
    text: 'text-white',
  },
  ghost: {
    container: 'bg-transparent active:bg-slate-800',
    text: 'text-blue-400',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: {
    container: 'py-2 px-4 rounded-lg',
    text: 'text-sm font-medium',
  },
  md: {
    container: 'py-3 px-6 rounded-xl',
    text: 'text-base font-semibold',
  },
  lg: {
    container: 'py-4 px-8 rounded-2xl',
    text: 'text-lg font-semibold',
  },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  onPress,
  style,
}: ButtonProps) {
  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.();
    }
  };

  return (
    <TouchableOpacity
      className={`
        flex-row items-center justify-center gap-2
        ${variantStyles[variant].container}
        ${sizeStyles[size].container}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50' : ''}
      `}
      style={style}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'ghost' ? '#60a5fa' : '#fff'} />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text className={`${variantStyles[variant].text} ${sizeStyles[size].text}`}>
            {children}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
}
