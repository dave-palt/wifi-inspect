import { ReactNode } from 'react';
import { View, Text } from 'react-native';

type AlertVariant = 'warning' | 'danger' | 'info' | 'success';

interface AlertBannerProps {
  variant?: AlertVariant;
  title?: string;
  message: string | ReactNode;
  icon?: ReactNode;
}

const variantStyles: Record<AlertVariant, { container: string; border: string; title: string; text: string }> = {
  warning: {
    container: 'bg-amber-900/30',
    border: 'border-amber-700/50',
    title: 'text-amber-400',
    text: 'text-amber-200',
  },
  danger: {
    container: 'bg-red-900/30',
    border: 'border-red-700/50',
    title: 'text-red-400',
    text: 'text-red-200',
  },
  info: {
    container: 'bg-blue-900/30',
    border: 'border-blue-700/50',
    title: 'text-blue-400',
    text: 'text-blue-200',
  },
  success: {
    container: 'bg-emerald-900/30',
    border: 'border-emerald-700/50',
    title: 'text-emerald-400',
    text: 'text-emerald-200',
  },
};

export function AlertBanner({ variant = 'info', title, message, icon }: AlertBannerProps) {
  const styles = variantStyles[variant];

  return (
    <View className={`${styles.container} border ${styles.border} rounded-xl p-4`}>
      <View className="flex-row items-start gap-3">
        {icon && <View className="mt-0.5">{icon}</View>}
        <View className="flex-1">
          {title && (
            <Text className={`${styles.title} font-semibold mb-1`}>{title}</Text>
          )}
          {typeof message === 'string' ? (
            <Text className={`${styles.text} text-sm leading-5`}>{message}</Text>
          ) : (
            message
          )}
        </View>
      </View>
    </View>
  );
}
