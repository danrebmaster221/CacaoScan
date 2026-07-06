import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  Dimensions,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useFrameCallback,
  type SharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HEADER_ZONE_H = Math.max(300, SCREEN_H * 0.4);

const WAVE_COUNT = 2;
const PATH_PAD = 72;
const PATH_LEFT = -PATH_PAD;
const PATH_RIGHT = SCREEN_W + PATH_PAD;
const VISIBLE_INSET = SCREEN_W * 0.03;

const CYCLE_MS = 34000;
const SEED_COUNT = 8;

/** Upper band above logo · lower band below logo */
const WAVE_LANES = [
  {
    id: 'upper',
    baseY: HEADER_ZONE_H * 0.30,
    amp: HEADER_ZONE_H * 0.028,
    direction: -1,
    phaseOffset: 0.35,
    opacityScale: 0.52,
  },
  {
    id: 'lower',
    baseY: HEADER_ZONE_H * 0.79,
    amp: HEADER_ZONE_H * 0.042,
    direction: 1,
    phaseOffset: 0,
    opacityScale: 0.58,
  },
] as const;

type SeedType = 'seed1' | 'seed2' | 'seed3';

const SEED_IMAGES: Record<SeedType, ImageSourcePropType> = {
  seed1: require('@/assets/images/seed1.png'),
  seed2: require('@/assets/images/seed2.png'),
  seed3: require('@/assets/images/seed3.png'),
};

const SEED_DEFS: Array<{ type: SeedType; size: number; tilt: number }> = [
  { type: 'seed1', size: 40, tilt: -10 },
  { type: 'seed2', size: 46, tilt: -6 },
  { type: 'seed3', size: 36, tilt: 4 },
  { type: 'seed2', size: 42, tilt: 6 },
  { type: 'seed2', size: 42, tilt: -3 },
  { type: 'seed1', size: 40, tilt: 8 },
  { type: 'seed3', size: 34, tilt: -8 },
  { type: 'seed1', size: 38, tilt: 10 },
];

type LaneConfig = (typeof WAVE_LANES)[number];

function pointOnWave(
  pathPos: number,
  size: number,
  height: number,
  lane: LaneConfig,
) {
  'worklet';
  const p = pathPos - Math.floor(pathPos);
  const span = PATH_RIGHT - PATH_LEFT;
  const x = PATH_LEFT + p * span - size * 0.5;

  const wave =
    Math.sin(2 * Math.PI * WAVE_COUNT * p) * 0.82 +
    Math.sin(2 * Math.PI * (WAVE_COUNT + 1) * p) * 0.18;

  const y = lane.baseY + lane.amp * wave - height * 0.5;

  const dy =
    lane.amp *
    (0.82 * 2 * Math.PI * WAVE_COUNT * Math.cos(2 * Math.PI * WAVE_COUNT * p) +
      0.18 * 2 * Math.PI * (WAVE_COUNT + 1) * Math.cos(2 * Math.PI * (WAVE_COUNT + 1) * p));
  const tangent = Math.atan2(dy, span) * (57.2958);

  const cx = x + size * 0.5;
  let opacity = lane.opacityScale;
  if (cx < VISIBLE_INSET) {
    opacity *= Math.max(0, (cx - PATH_LEFT) / (VISIBLE_INSET - PATH_LEFT));
  } else if (cx > SCREEN_W - VISIBLE_INSET) {
    opacity *= Math.max(0, (PATH_RIGHT - cx) / (PATH_RIGHT - (SCREEN_W - VISIBLE_INSET)));
  }

  return { x, y, tangent, opacity };
}

function ConveyorSeed({
  laneId,
  index,
  type,
  size,
  tilt,
  phase,
  lane,
}: {
  laneId: string;
  index: number;
  type: SeedType;
  size: number;
  tilt: number;
  phase: SharedValue<number>;
  lane: LaneConfig;
}) {
  const height = size * 1.35;
  const laneScale = lane.id === 'upper' ? 0.88 : 1;
  const drawSize = size * laneScale;
  const drawHeight = height * laneScale;

  const animStyle = useAnimatedStyle(() => {
    const pathPos =
      lane.phaseOffset + lane.direction * phase.value + index / SEED_COUNT;
    const { x, y, tangent, opacity } = pointOnWave(
      pathPos,
      drawSize,
      drawHeight,
      lane,
    );

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${tangent * 0.28 + tilt}deg` },
      ],
      opacity,
      zIndex: 1,
    };
  });

  return (
    <Animated.View style={[styles.seed, animStyle]} pointerEvents="none">
      <View style={[styles.shadowWrap, { width: drawSize, height: drawHeight }]}>
        <Image
          source={SEED_IMAGES[type]}
          style={{ width: drawSize, height: drawHeight }}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

function WaveLaneGroup({
  lane,
  phase,
}: {
  lane: LaneConfig;
  phase: SharedValue<number>;
}) {
  return (
    <>
      {SEED_DEFS.map((seed, index) => (
        <ConveyorSeed
          key={`${lane.id}-${seed.type}-${index}`}
          laneId={lane.id}
          index={index}
          type={seed.type}
          size={seed.size}
          tilt={seed.tilt}
          phase={phase}
          lane={lane}
        />
      ))}
    </>
  );
}

/** Two wave bands — upper & lower — seamless conveyor loops */
export function FloatingCacaoSeeds() {
  const phase = useSharedValue(0);

  useFrameCallback((frame) => {
    'worklet';
    const dt = frame.timeSincePreviousFrame ?? 0;
    if (dt <= 0) return;
    phase.value = (phase.value + dt / CYCLE_MS) % 1;
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {WAVE_LANES.map((lane) => (
        <WaveLaneGroup key={lane.id} lane={lane} phase={phase} />
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
  seed: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  shadowWrap: {
    shadowColor: '#0A0604',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
});
