import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Ellipse, G, Defs, LinearGradient as SvgGradient, Stop, Pattern, Rect } from 'react-native-svg';
import { CacaoSeedConveyorBelt } from '@/components/auth/CacaoSeedConveyorBelt';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const HUSK_DARK = '#2A1810';
const HUSK_LIGHT = '#C4906A';

const GRADIENT_COLORS = ['#2E1A12', '#4A2A1C', '#5C3324', '#4A2E1E'] as const;
const GRADIENT_LOCS = [0, 0.35, 0.7, 1] as const;

function PodHuskRidges({ height }: { height: number }) {
  const ridges: React.ReactNode[] = [];
  const spacing = 14;
  const count = Math.ceil(SCREEN_W / spacing) + 2;
  const mid = height * 0.45;
  const low = height * 0.82;

  for (let i = 0; i < count; i++) {
    const x = i * spacing - 4;
    const sway = (i % 7) * 2.5 - 7;
    const depth = 0.08 + (i % 5) * 0.025;

    ridges.push(
      <G key={`ridge-${i}`}>
        <Path
          d={`M${x} -20 Q${x + sway} ${mid} ${x - sway * 0.6} ${low} T${x} ${height + 40}`}
          fill="none"
          stroke={HUSK_DARK}
          strokeWidth={2.2}
          opacity={depth}
        />
        <Path
          d={`M${x + 2} -20 Q${x + sway + 3} ${mid} ${x - sway * 0.6 + 2} ${low} T${x + 2} ${height + 40}`}
          fill="none"
          stroke={HUSK_LIGHT}
          strokeWidth={0.7}
          opacity={depth * 0.55}
        />
      </G>,
    );
  }

  return (
    <Svg width={SCREEN_W} height={height} style={styles.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgGradient id="huskSheen" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#6B3D28" stopOpacity={0.15} />
          <Stop offset="45%" stopColor="#3D2418" stopOpacity={0} />
          <Stop offset="100%" stopColor="#8B5040" stopOpacity={0.1} />
        </SvgGradient>
      </Defs>
      <Path d={`M0 0 H${SCREEN_W} V${height} H0 Z`} fill="url(#huskSheen)" />
      {ridges}
    </Svg>
  );
}

function PodSegmentBands({ height }: { height: number }) {
  const bands = [0.18, 0.38, 0.58, 0.78, 0.92];
  return (
    <Svg width={SCREEN_W} height={height} style={styles.absoluteFill} pointerEvents="none">
      {bands.map((pct, i) => {
        const y = height * pct;
        return (
          <Path
            key={`band-${i}`}
            d={`M-10 ${y} Q${SCREEN_W * 0.3} ${y + 6} ${SCREEN_W * 0.55} ${y - 3} T${SCREEN_W + 10} ${y + 2}`}
            fill="none"
            stroke={HUSK_DARK}
            strokeWidth={1.2}
            opacity={0.12}
          />
        );
      })}
    </Svg>
  );
}

const GRAIN_MARKS = [
  { cx: 3, cy: 5, rx: 0.8, fill: HUSK_LIGHT, opacity: 0.05 },
  { cx: 14, cy: 2, rx: 1.1, fill: HUSK_DARK, opacity: 0.06 },
  { cx: 22, cy: 11, rx: 0.8, fill: HUSK_LIGHT, opacity: 0.04 },
  { cx: 8, cy: 18, rx: 1.1, fill: HUSK_DARK, opacity: 0.07 },
  { cx: 27, cy: 20, rx: 0.8, fill: HUSK_LIGHT, opacity: 0.05 },
  { cx: 16, cy: 26, rx: 1.1, fill: HUSK_DARK, opacity: 0.04 },
  { cx: 4, cy: 28, rx: 0.8, fill: HUSK_LIGHT, opacity: 0.06 },
  { cx: 30, cy: 8, rx: 1.1, fill: HUSK_DARK, opacity: 0.05 },
] as const;

function FibrousGrain({ height }: { height: number }) {
  return (
    <Svg width={SCREEN_W} height={height} style={styles.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="grainPattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
          {GRAIN_MARKS.map((mark, index) => (
            <Ellipse
              key={index}
              cx={mark.cx}
              cy={mark.cy}
              rx={mark.rx}
              ry={0.4}
              fill={mark.fill}
              opacity={mark.opacity}
            />
          ))}
        </Pattern>
      </Defs>
      <Rect width={SCREEN_W} height={height} fill="url(#grainPattern)" />
    </Svg>
  );
}

/** Full-screen cacao pod husk base layer — gradient + continuous texture */
export function AuthCacaoFullScreenBackground() {
  return (
    <View style={styles.fullScreen} pointerEvents="none">
      <LinearGradient
        colors={[...GRADIENT_COLORS]}
        locations={[...GRADIENT_LOCS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <PodHuskRidges height={SCREEN_H} />
      <PodSegmentBands height={SCREEN_H} />
      <FibrousGrain height={SCREEN_H} />
    </View>
  );
}

/** Header foreground — interactive conveyor belt */
export function AuthCacaoHeaderForeground() {
  return <CacaoSeedConveyorBelt />;
}

/** @deprecated Use AuthCacaoFullScreenBackground + AuthCacaoHeaderForeground */
export function AuthCacaoHeaderDecor() {
  return (
    <>
      <AuthCacaoFullScreenBackground />
      <AuthCacaoHeaderForeground />
    </>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
});
