import { ReactNode, ReactElement } from 'react';
import { View, Text, ViewStyle } from 'react-native';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: ViewStyle;
  variant?: 'default' | 'danger' | 'warning';
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactElement;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
}

function Card({ children, className = '', style, variant = 'default' }: CardProps) {
  const variantStyles = {
    default: 'bg-slate-800 border-slate-700/50',
    danger: 'bg-red-950/30 border-red-500/40',
    warning: 'bg-amber-950/30 border-amber-500/40',
  };

  return (
    <View
      className={`
        rounded-2xl
        border
        ${variantStyles[variant]}
        ${className}
      `}
      style={[
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <View className="flex-row items-center justify-between p-4 border-b border-slate-700/50">
      <View className="flex-1">
        <Text className="text-white text-lg font-semibold">{title}</Text>
        {subtitle && <Text className="text-slate-400 text-sm mt-0.5">{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

function CardContent({ children, className = '' }: CardContentProps) {
  return <View className={`p-4 ${className}`}>{children}</View>;
}

function CardFooter({ children }: CardFooterProps) {
  return (
    <View className="flex-row items-center justify-end gap-2 p-4 border-t border-slate-700/50">
      {children}
    </View>
  );
}

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export { Card };
