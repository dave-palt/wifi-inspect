import { View, Text } from 'react-native';
import { ReactNode } from 'react';

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md';
}

const variantStyles = {
  default: {
    value: 'text-white',
    icon: 'text-slate-400',
  },
  danger: {
    value: 'text-red-400',
    icon: 'text-red-400',
  },
  warning: {
    value: 'text-amber-400',
    icon: 'text-amber-400',
  },
  success: {
    value: 'text-emerald-400',
    icon: 'text-emerald-400',
  },
};

const sizeStyles = {
  sm: {
    container: 'p-3',
    value: 'text-2xl',
    label: 'text-xs',
  },
  md: {
    container: 'p-4',
    value: 'text-3xl',
    label: 'text-sm',
  },
};

export function StatCard({ 
  value, 
  label, 
  icon, 
  variant = 'default',
  size = 'md' 
}: StatCardProps) {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  return (
    <View 
      className={`
        flex-1 bg-slate-800 rounded-xl border border-slate-700/50
        ${sizes.container}
      `}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      {icon && <View className="mb-2">{icon}</View>}
      <Text className={`${styles.value} ${sizes.value} font-bold`}>{value}</Text>
      <Text className={`text-slate-400 ${sizes.label} mt-1`}>{label}</Text>
    </View>
  );
}
