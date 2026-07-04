import React, { useEffect } from 'react';
import { ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeContext } from '@/context/ThemeContext';
import { Colors, Radius } from '@/constants/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

export function Skeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = Radius.sm, 
  style 
}: SkeletonProps) {
  const { activeTheme } = useThemeContext();
  const theme = activeTheme === 'dark' ? Colors.dark : Colors.light;

  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
