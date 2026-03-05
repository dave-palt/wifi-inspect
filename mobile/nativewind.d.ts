import 'nativewind';
import type { ViewStyle } from 'react-native';

declare module 'nativewind' {
  interface NativeWindStyles {
    style: ViewStyle;
  }
}
