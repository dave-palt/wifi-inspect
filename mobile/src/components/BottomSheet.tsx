import { ReactNode } from 'react';
import { View, Text, Modal, Pressable, Dimensions, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';

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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeSheet}
    >
      <View className="flex-1">
        <Pressable
          className="flex-1 bg-black/60"
          onPress={closeSheet}
        />
        
        <GestureDetector gesture={gesture}>
          <Animated.View
            className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl"
            style={{ maxHeight: MAX_SHEET_HEIGHT, ...animatedStyle }}
          >
            {showHandle && (
              <View className="w-9 h-[5px] bg-slate-600 rounded-full self-center mt-3 mb-2" />
            )}

            {(title || showCloseButton) && (
              <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-800">
                <Text className="text-white text-lg font-semibold flex-1">
                  {title}
                </Text>
                {showCloseButton && (
                  <Pressable
                    onPress={closeSheet}
                    className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center"
                  >
                    <X size={18} color="#94a3b8" />
                  </Pressable>
                )}
              </View>
            )}

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 24 }}
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
