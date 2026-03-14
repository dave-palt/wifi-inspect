import type { ViewStyle, TextStyle, ImageStyle } from 'react-native';

type Style = ViewStyle | TextStyle | ImageStyle;

declare module 'react-native' {
  interface ViewProps {
    className?: string;
    style?: Style | Style[];
  }
  interface TextProps {
    className?: string;
    style?: Style | Style[];
  }
  interface TouchableOpacityProps {
    className?: string;
    style?: Style | Style[];
  }
  interface ScrollViewProps {
    className?: string;
    style?: Style | Style[];
  }
  interface TextInputProps {
    className?: string;
    style?: Style | Style[];
  }
  interface ImageProps {
    className?: string;
    style?: Style | Style[];
  }
  interface PressableProps {
    className?: string;
    style?: Style | Style[];
  }
}
