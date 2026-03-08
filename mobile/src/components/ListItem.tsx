import { ReactNode, ReactElement } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  danger?: boolean;
}

export function ListItem({
  title,
  subtitle,
  icon,
  trailing,
  showChevron = true,
  onPress,
  danger = false,
}: ListItemProps) {
  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const content = (
    <View className="flex-row items-center gap-4">
      {icon && <View className="w-10 h-10 items-center justify-center">{icon}</View>}
      <View className="flex-1">
        <Text className={`text-base font-medium ${danger ? 'text-red-400' : 'text-white'}`}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-slate-400 text-sm mt-0.5">{subtitle}</Text>
        )}
      </View>
      {trailing}
      {showChevron && onPress && (
        <ChevronRight size={20} color="#64748b" />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        className="bg-slate-800 px-4 py-3.5 active:bg-slate-700"
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View className="bg-slate-800 px-4 py-3.5">{content}</View>;
}
