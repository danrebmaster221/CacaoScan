import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Ellipse, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
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

function FibrousGrain({ height }: { height: number }) {
  const specks: React.ReactNode[] = [];
  const cols = Math.ceil(SCREEN_W / 8);
  const rows = Math.ceil(height / 8);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = (r * 13 + c * 29) % 100;
      if (seed > 55) continue;
      const x = c * 8 + (seed % 4);
      const y = r * 8 + (seed % 3);
      specks.push(
        <Ellipse
          key={`f-${r}-${c}`}
          cx={x}
          cy={y}
          rx={0.8 + (seed % 2) * 0.3}
          ry={0.4}
          fill={seed % 2 === 0 ? HUSK_LIGHT : HUSK_DARK}
          opacity={0.04 + (seed % 4) * 0.01}
        />,
      );
    }
  }
  return (
    <Svg width={SCREEN_W} height={height} style={styles.absoluteFill} pointerEvents="none">
      {specks}
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
    zIndex: 0,
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
});
