import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ScalePressableProps extends PressableProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ScalePressable({
  children,
  className,
  style,
  scaleTo = 0.975,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: ScalePressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      className={className}
      style={[animatedStyle, style]}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          scale.value = withSpring(scaleTo, {
            damping: 20,
            stiffness: 350,
          });
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, {
          damping: 20,
          stiffness: 350,
        });
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
