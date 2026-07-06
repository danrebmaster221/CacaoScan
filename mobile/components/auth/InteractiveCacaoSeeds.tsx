import React, { useEffect } from 'react';
import {
  Image,
  StyleSheet,
  View,
  Text,
  Dimensions,
  type ImageSourcePropType,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Typography } from '@/constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HEADER_ZONE_H = Math.max(300, SCREEN_H * 0.4);

type SeedType = 'seed1' | 'seed2' | 'seed3';

const SEED_IMAGES: Record<SeedType, ImageSourcePropType> = {
  seed1: require('@/assets/images/seed1.png'),
  seed2: require('@/assets/images/seed2.png'),
  seed3: require('@/assets/images/seed3.png'),
};

/** Six seeds — upper + lower bands, mixed sizes, one per variety per row */
const SEED_DEFS: Array<{
  id: string;
  type: SeedType;
  name: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  durY: number;
  durX: number;
  delay: number;
}> = [
  // Upper band
  {
    id: 'upper-criollo',
    type: 'seed1',
    name: 'Criollo',
    x: 0.08,
    y: 0.20,
    size: 54,
    rotate: -12,
    durY: 9400,
    durX: 11200,
    delay: 120,
  },
  {
    id: 'upper-forastero',
    type: 'seed2',
    name: 'Forastero',
    x: 0.74,
    y: 0.18,
    size: 60,
    rotate: 14,
    durY: 10800,
    durX: 9000,
    delay: 480,
  },
  {
    id: 'upper-trinitario',
    type: 'seed3',
    name: 'Trinitario',
    x: 0.40,
    y: 0.30,
    size: 48,
    rotate: 5,
    durY: 8600,
    durX: 10400,
    delay: 760,
  },
  // Lower band
  {
    id: 'lower-criollo',
    type: 'seed1',
    name: 'Criollo',
    x: 0.10,
    y: 0.60,
    size: 56,
    rotate: -16,
    durY: 9200,
    durX: 11800,
    delay: 0,
  },
  {
    id: 'lower-forastero',
    type: 'seed2',
    name: 'Forastero',
    x: 0.72,
    y: 0.58,
    size: 50,
    rotate: 10,
    durY: 10500,
    durX: 8600,
    delay: 320,
  },
  {
    id: 'lower-trinitario',
    type: 'seed3',
    name: 'Trinitario',
    x: 0.38,
    y: 0.80,
    size: 58,
    rotate: 8,
    durY: 8800,
    durX: 10200,
    delay: 640,
  },
];

function InteractiveSeed({
  type,
  name,
  x,
  y,
  size,
  rotate,
  durY,
  durX,
  delay,
}: Omit<(typeof SEED_DEFS)[number], 'id'>) {
  const height = size * 1.35;
  const baseX = x * SCREEN_W;
  const baseY = y * HEADER_ZONE_H;

  const driftY = useSharedValue(0);
  const driftX = useSharedValue(0);
  const labelVisible = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    driftY.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: durY, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    driftX.value = withDelay(
      delay + 240,
      withRepeat(
        withTiming(1, { duration: durX, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [driftY, driftX, durY, durX, delay]);

  const longPress = Gesture.LongPress()
    .minDuration(380)
    .onStart(() => {
      labelVisible.value = withTiming(1, { duration: 160 });
      pressScale.value = withTiming(1.06, { duration: 160 });
    })
    .onFinalize(() => {
      labelVisible.value = withTiming(0, { duration: 140 });
      pressScale.value = withTiming(1, { duration: 140 });
    });

  const seedStyle = useAnimatedStyle(() => {
    const floatY = interpolate(driftY.value, [0, 0.5, 1], [0, -10, 0]);
    const floatX = interpolate(driftX.value, [0, 0.5, 1], [-7, 7, -7]);
    const wobble = interpolate(driftY.value, [0, 1], [-3, 3]);

    return {
      transform: [
        { translateX: baseX + floatX },
        { translateY: baseY + floatY },
        { rotate: `${rotate + wobble}deg` },
        { scale: pressScale.value },
      ],
      opacity: interpolate(labelVisible.value, [0, 1], [0.52, 0.88]),
    };
  });

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelVisible.value,
    transform: [
      { translateY: interpolate(labelVisible.value, [0, 1], [6, 0]) },
      { scale: interpolate(labelVisible.value, [0, 1], [0.92, 1]) },
    ],
  }));

  return (
    <GestureDetector gesture={longPress}>
      <Animated.View style={[styles.seedWrap, seedStyle]}>
        <Animated.View style={[styles.labelAnchor, labelStyle]} pointerEvents="none">
          <View style={styles.label}>
            <Text style={styles.labelText}>{name}</Text>
          </View>
        </Animated.View>
        <View style={[styles.shadowWrap, { width: size, height }]}>
          <Image
            source={SEED_IMAGES[type]}
            style={{ width: size, height }}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Option B — 6 interactive seeds (upper + lower), name on long-press only */
export function InteractiveCacaoSeeds() {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {SEED_DEFS.map(({ id, ...seed }) => (
        <InteractiveSeed key={id} {...seed} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 1,
  },
  seedWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
  },
  labelAnchor: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 6,
    left: -88,
    right: -88,
    alignItems: 'center',
  },
  label: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 248, 240, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(161, 136, 127, 0.35)',
    flexShrink: 0,
    alignSelf: 'center',
  },
  labelText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: '#3E2723',
    letterSpacing: 0.3,
    textAlign: 'center',
    flexShrink: 0,
  },
  shadowWrap: {
    shadowColor: '#0A0604',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
});
