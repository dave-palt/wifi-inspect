import { View, Text } from 'react-native';
import { AlertTriangle, Shield, X } from 'lucide-react-native';
import { colors, borderRadius, spacing } from '../utils/design';

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
    <View
      style={{
        backgroundColor: `${colors.danger}15`,
        borderWidth: 1,
        borderColor: `${colors.danger}40`,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${colors.danger}25`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertTriangle size={22} color={colors.danger} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 4,
            }}
          >
            {totalThreats} Potential Threat{totalThreats > 1 ? 's' : ''} Detected
          </Text>
          
          {hasCameras && (
            <Text style={{ color: colors.text.secondary, fontSize: 14, marginBottom: 4 }}>
              {cameraCount} camera{cameraCount > 1 ? 's' : ''} found on this network
            </Text>
          )}
          
          <Text style={{ color: colors.text.tertiary, fontSize: 13 }}>
            Tap on a threat below for details
          </Text>
        </View>
      </View>
    </View>
  );
}
