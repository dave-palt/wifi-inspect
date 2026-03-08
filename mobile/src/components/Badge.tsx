import { ReactNode } from 'react';
import { View, Text } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: {
    bg: 'bg-slate-700',
    text: 'text-slate-300',
  },
  success: {
    bg: 'bg-emerald-900/60',
    text: 'text-emerald-400',
  },
  warning: {
    bg: 'bg-amber-900/60',
    text: 'text-amber-400',
  },
  danger: {
    bg: 'bg-red-900/60',
    text: 'text-red-400',
  },
  info: {
    bg: 'bg-blue-900/60',
    text: 'text-blue-400',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <View className={`${variantStyles[variant].bg} rounded-full ${sizeStyles[size].split(' ').slice(0, 2).join(' ')}`}>
      <Text className={`${variantStyles[variant].text} font-medium ${sizeStyles[size].split(' ').slice(2).join(' ')}`}>
        {children}
      </Text>
    </View>
  );
}
