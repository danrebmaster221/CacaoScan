import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  Text,
  Dimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  useFrameCallback,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const BELT_H = 86;
const SEED_W = 54;
const SEED_H = 72;
const LONG_PRESS_MS = 500;
const IDLE_SCROLL_PX_S = 22;

const SLOT_X = [SCREEN_W * 0.17, SCREEN_W * 0.5, SCREEN_W * 0.83] as const;

type SeedType = 'seed1' | 'seed2' | 'seed3';

const SEED_IMAGES: Record<SeedType, ImageSourcePropType> = {
  seed1: require('@/assets/images/seed1.png'),
  seed2: require('@/assets/images/seed2.png'),
  seed3: require('@/assets/images/seed3.png'),
};

const SEEDS = [
  { id: 'criollo', type: 'seed1' as SeedType, name: 'Criollo' },
  { id: 'forastero', type: 'seed2' as SeedType, name: 'Forastero' },
  { id: 'trinitario', type: 'seed3' as SeedType, name: 'Trinitario' },
] as const;

function slotLeft(slot: number) {
  return SLOT_X[slot] - SEED_W / 2;
}

function BeltTread({ scrollSpeed }: { scrollSpeed: SharedValue<number> }) {
  const offset = useSharedValue(0);
  const LINE_GAP = 9;
  const LINE_COUNT = Math.ceil(SCREEN_W / LINE_GAP) + 8;

  useFrameCallback((frame) => {
    const dt = (frame.timeSincePreviousFrame ?? 16) / 1000;
    offset.value = (offset.value + scrollSpeed.value * dt) % LINE_GAP;
  });

  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -offset.value }],
  }));

  const lines = Array.from({ length: LINE_COUNT }, (_, i) => (
    <View
      key={`tread-${i}`}
      style={[
        styles.treadLine,
        { left: i * LINE_GAP, opacity: 0.07 + (i % 3) * 0.025 },
      ]}
    />
  ));

  return (
    <View style={styles.treadClip} pointerEvents="none">
      <Animated.View style={[styles.treadBand, bandStyle]}>{lines}</Animated.View>
      <Animated.View style={[styles.treadBand, styles.treadBandOffset, bandStyle]}>
        {lines}
      </Animated.View>
    </View>
  );
}

function CloudTag({
  name,
  visible,
}: {
  name: string;
  visible: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [
      { translateY: interpolate(visible.value, [0, 1], [8, 0]) },
      { scale: interpolate(visible.value, [0, 1], [0.88, 1]) },
    ],
  }));

  return (
    <Animated.View style={[styles.cloudWrap, style]} pointerEvents="none">
      <View style={styles.cloudCenter}>
        <Text style={styles.cloudText} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.cloudTail} />
    </Animated.View>
  );
}

function StaticBeltSeed({
  index,
  slot,
}: {
  index: number;
  slot: number;
}) {
  const seed = SEEDS[index];
  const labelVisible = useSharedValue(0);
  const pressScale = useSharedValue(1);

  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_MS)
    .onBegin(() => {
      pressScale.value = withTiming(0.92, { duration: 120 });
    })
    .onStart(() => {
      labelVisible.value = withTiming(1, { duration: 160 });
      pressScale.value = withTiming(1.04, { duration: 160 });
    })
    .onFinalize(() => {
      labelVisible.value = withTiming(0, { duration: 140 });
      pressScale.value = withTiming(1, { duration: 140 });
    });

  const seedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <GestureDetector gesture={longPress}>
      <Animated.View
        style={[styles.seedAnchor, { left: slotLeft(slot) }, seedStyle]}
      >
        <View style={styles.labelAnchor} pointerEvents="none">
          <CloudTag name={seed.name} visible={labelVisible} />
        </View>
        <Image
          source={SEED_IMAGES[seed.type]}
          style={styles.seedImage}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

type Props = {
  style?: StyleProp<ViewStyle>;
};

/** Static conveyor belt — 3 fixed seeds, cloud name on long-press only */
export function CacaoSeedConveyorBelt({ style }: Props) {
  const scrollSpeed = useSharedValue(IDLE_SCROLL_PX_S);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.rail}>
        <LinearGradient
          colors={['#14100E', '#1E1814', '#252018', '#1A1512']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.04)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.beltSheen}
          pointerEvents="none"
        />
        <BeltTread scrollSpeed={scrollSpeed} />

        <View style={styles.sideRailLeft} pointerEvents="none" />
        <View style={styles.sideRailRight} pointerEvents="none" />

        {SEEDS.map((seed, i) => (
          <StaticBeltSeed key={seed.id} index={i} slot={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SCREEN_W,
    height: BELT_H,
    alignSelf: 'center',
    overflow: 'visible',
    zIndex: 2,
  },
  rail: {
    flex: 1,
    overflow: 'visible',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#0A0806',
    justifyContent: 'center',
  },
  beltSheen: {
    ...StyleSheet.absoluteFillObject,
    top: '38%',
    height: '24%',
  },
  treadClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  treadBand: {
    position: 'absolute',
    top: '30%',
    height: '40%',
    width: SCREEN_W + 80,
  },
  treadBandOffset: {
    top: '58%',
    opacity: 0.75,
  },
  treadLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#3A322C',
  },
  sideRailLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#0C0A08',
    borderRightWidth: 1,
    borderRightColor: '#2A2420',
  },
  sideRailRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#0C0A08',
    borderLeftWidth: 1,
    borderLeftColor: '#2A2420',
  },
  seedAnchor: {
    position: 'absolute',
    top: (BELT_H - SEED_H) / 2 - 2,
    width: SEED_W,
    height: SEED_H,
    zIndex: 4,
    alignItems: 'center',
    overflow: 'visible',
  },
  labelAnchor: {
    position: 'absolute',
    bottom: SEED_H - 4,
    left: -72,
    right: -72,
    alignItems: 'center',
    zIndex: 5,
  },
  seedImage: {
    width: SEED_W,
    height: SEED_H,
  },
  cloudWrap: {
    alignItems: 'center',
  },
  cloudCenter: {
    borderRadius: 999,
    backgroundColor: 'rgba(255, 252, 248, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(200, 185, 175, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexShrink: 0,
    alignSelf: 'center',
    shadowColor: '#1A1008',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 4,
  },
  cloudTail: {
    width: 12,
    height: 12,
    backgroundColor: 'rgba(255, 252, 248, 0.96)',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(200, 185, 175, 0.45)',
    transform: [{ rotate: '45deg' }],
    marginTop: -7,
    borderRadius: 2,
  },
  cloudText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: '#3E2723',
    letterSpacing: 0.3,
    textAlign: 'center',
    flexShrink: 0,
  },
});
