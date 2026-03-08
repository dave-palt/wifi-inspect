import { View, Text } from 'react-native';

interface ThreatMeterProps {
  level: number;
  maxLevel?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const getThreatColor = (level: number): string => {
  if (level === 0) return '#94a3b8';
  if (level <= 1) return '#4ade80';
  if (level <= 2) return '#facc15';
  if (level <= 3) return '#fb923c';
  return '#ef4444';
};

const getThreatLabel = (level: number): string => {
  if (level === 0) return 'Unknown';
  if (level <= 1) return 'Low';
  if (level <= 2) return 'Medium';
  if (level <= 3) return 'High';
  return 'Critical';
};

const sizeStyles = {
  sm: { height: 6, text: 'text-xs', gap: 2 },
  md: { height: 8, text: 'text-sm', gap: 3 },
  lg: { height: 12, text: 'text-base', gap: 4 },
};

export function ThreatMeter({ level, maxLevel = 5, showLabel = true, size = 'md' }: ThreatMeterProps) {
  const percentage = (level / maxLevel) * 100;
  const color = getThreatColor(level);
  const styles = sizeStyles[size];

  return (
    <View className={`flex-row items-center gap-${styles.gap}`}>
      <View 
        className="flex-1 bg-slate-700 rounded-full overflow-hidden"
        style={{ height: styles.height }}
      >
        <View
          className="h-full rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </View>
      {showLabel && (
        <Text className={`${styles.text} font-semibold`} style={{ color }}>
          {level}/{maxLevel}
        </Text>
      )}
    </View>
  );
}
