import { View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface ThreatAlertProps {
  threatCount: number;
  cameraCount?: number;
  onDismiss?: () => void;
}

export function ThreatAlert({ threatCount, cameraCount = 0, onDismiss }: ThreatAlertProps) {
  if (threatCount === 0 && cameraCount === 0) return null;

  const totalThreats = threatCount + cameraCount;
  const hasCameras = cameraCount > 0;

  return (
    <View className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 mx-4 mb-4">
      <View className="flex-row items-start gap-3">
        <View className="w-10 h-10 rounded-full bg-red-500/25 items-center justify-center">
          <AlertTriangle size={22} color="#ef4444" />
        </View>

        <View className="flex-1">
          <Text className="text-white text-base font-bold mb-1">
            {totalThreats} Potential Threat{totalThreats > 1 ? 's' : ''} Detected
          </Text>
          
          {hasCameras && (
            <Text className="text-slate-400 text-sm mb-1">
              {cameraCount} camera{cameraCount > 1 ? 's' : ''} found on this network
            </Text>
          )}
          
          <Text className="text-slate-500 text-[13px]">
            Tap on a threat below for details
          </Text>
        </View>
      </View>
    </View>
  );
}
