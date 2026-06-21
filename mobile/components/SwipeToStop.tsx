import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Radius, Typography } from '@/constants/theme';

interface Props {
  onStop: () => void;
  width?: number;
}

const SLIDER_WIDTH = 300;
const KNOB_WIDTH = 64;
const MAX_TRANSLATE = SLIDER_WIDTH - KNOB_WIDTH - 8; // 8px padding

export function SwipeToStop({ onStop, width = SLIDER_WIDTH }: Props) {
  const translateX = useSharedValue(0);
  const isTriggered = useSharedValue(false);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (isTriggered.value) return;

      let newValue = event.translationX;
      newValue = Math.max(0, Math.min(newValue, MAX_TRANSLATE));
      translateX.value = newValue;

      if (newValue >= MAX_TRANSLATE * 0.95 && !isTriggered.value) {
        isTriggered.value = true;
        runOnJS(onStop)();
      }
    })
    .onEnd(() => {
      if (!isTriggered.value) {
        translateX.value = withSpring(0, { damping: 15, stiffness: 100 });
      } else {
        translateX.value = withSpring(MAX_TRANSLATE, { damping: 15, stiffness: 100 });
      }
    });

  const knobStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: Math.max(0, 1 - (translateX.value / (MAX_TRANSLATE * 0.6))),
    };
  });

  return (
    <View style={[styles.container, { width }]}>
      <Animated.Text style={[styles.text, textStyle]}>
        Swipe right to End Session
      </Animated.Text>
      
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.knob, knobStyle]}>
          <Text style={styles.knobIcon}>⏹</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    backgroundColor: '#3E2723',
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: '#A1887F',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    position: 'absolute',
    left: KNOB_WIDTH + 20,
  },
  knob: {
    width: KNOB_WIDTH,
    height: 56,
    backgroundColor: '#E53935',
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  knobIcon: {
    fontSize: 24,
    color: '#FFF8F0',
  },
});
