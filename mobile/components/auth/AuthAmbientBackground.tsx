import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

type OrbProps = {
  size: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  inner: string;
  outer: string;
  gradientId: string;
};

function SoftOrb({ size, top, right, bottom, left, inner, outer, gradientId }: OrbProps) {
  const r = size / 2;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          top,
          right,
          bottom,
          left,
        },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={inner} stopOpacity={0.28} />
            <Stop offset="50%" stopColor={outer} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={outer} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

/** Soft blurred cacao-tone ambient washes for auth screens */
export function AuthAmbientBackground() {
  return (
    <>
      <SoftOrb
        gradientId="cacaoOrbTop"
        size={320}
        top={-90}
        right={-100}
        inner="#F0D4BC"
        outer="#E8C4A8"
      />
      <SoftOrb
        gradientId="cacaoOrbMid"
        size={220}
        top="34%"
        left={-110}
        inner="#F5E8DC"
        outer="#EDD9C8"
      />
      <SoftOrb
        gradientId="cacaoOrbBottom"
        size={300}
        bottom={-40}
        left={-80}
        inner="#EDD5C4"
        outer="#E0C4B0"
      />
    </>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});
