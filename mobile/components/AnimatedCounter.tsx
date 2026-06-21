import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

interface Props {
  value: number;
  style?: any;
  color: string;
}

export function AnimatedCounter({ value, style, color }: Props) {
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (value !== displayValue) {
      // Trigger a subtle pop animation when the value increments
      scale.value = withSequence(
        withSpring(1.2, { damping: 12, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      );

      // Flash the color briefly
      colorProgress.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 400 })
      );
      
      setDisplayValue(value);
    }
  }, [value, displayValue, scale, colorProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      // Interpolate from target color to bright white/yellow, then back to target color
      color: interpolateColor(
        colorProgress.value,
        [0, 1],
        [color, '#FFF8F0'] // Flash to cream/white
      ),
    };
  });

  // We need to render the Reanimated component as a Text node
  const AnimatedText = Animated.createAnimatedComponent(Text);

  return (
    <AnimatedText style={[style, animatedStyle]}>
      {displayValue}
    </AnimatedText>
  );
}


