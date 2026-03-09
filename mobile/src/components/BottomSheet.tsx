import { ReactNode } from 'react';
import { View, Text, Modal, Pressable, Dimensions, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { colors, borderRadius, spacing } from '../utils/design';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: number[];
  showHandle?: boolean;
  showCloseButton?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  showHandle = true,
  showCloseButton = true,
}: BottomSheetProps) {
  const translateY = useSharedValue(MAX_SHEET_HEIGHT);
  const context = useSharedValue({ y: 0 });

  const scrollTo = (destination: number) => {
    'worklet';
    translateY.value = withSpring(destination, { damping: 50 });
  };

  const closeSheet = () => {
    scrollTo(MAX_SHEET_HEIGHT);
    setTimeout(onClose, 200);
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(0, context.value.y + event.translationY);
    })
    .onEnd(() => {
      if (translateY.value > 100) {
        runOnJS(closeSheet)();
      } else {
        scrollTo(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(visible ? 1 : 0),
    };
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeSheet}
    >
      <View style={{ flex: 1 }}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
          onPress={closeSheet}
        />
        
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: colors.surface,
                borderTopLeftRadius: borderRadius.xl,
                borderTopRightRadius: borderRadius.xl,
                maxHeight: MAX_SHEET_HEIGHT,
              },
              animatedStyle,
            ]}
          >
            {showHandle && (
              <View
                style={{
                  width: 36,
                  height: 5,
                  backgroundColor: colors.border.default,
                  borderRadius: borderRadius.full,
                  alignSelf: 'center',
                  marginTop: 12,
                  marginBottom: 8,
                }}
              />
            )}

            {(title || showCloseButton) && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.subtle,
                }}
              >
                <Text
                  style={{
                    color: colors.text.primary,
                    fontSize: 18,
                    fontWeight: '600',
                    flex: 1,
                  }}
                >
                  {title}
                </Text>
                {showCloseButton && (
                  <Pressable
                    onPress={closeSheet}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.elevated,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} color={colors.text.secondary} />
                  </Pressable>
                )}
              </View>
            )}

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: spacing.lg }}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}
