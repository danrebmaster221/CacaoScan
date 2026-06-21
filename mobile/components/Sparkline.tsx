import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Path } from 'react-native-svg';

interface Props {
  data: number[]; // Array of throughput values (e.g. beans per minute)
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

export function Sparkline({
  data,
  width = 80,
  height = 30,
  color = '#4CAF50',
  strokeWidth = 2,
}: Props) {
  if (!data || data.length === 0) {
    return <View style={{ width, height }} />;
  }

  // Normalize data to fit within height visually
  const max = Math.max(...data, 1);
  const min = 0; // Baseline is always 0 for throughput
  const range = max - min;

  const getPoints = () => {
    if (data.length === 1) {
      return `0,${height / 2} ${width},${height / 2}`;
    }

    const points = data.map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - strokeWidth) - (strokeWidth / 2);
      return `${x},${y}`;
    });

    return points.join(' ');
  };

  const getAreaPoints = () => {
    const linePoints = getPoints();
    // Wrap the top line with corners to the baseline to create a closed shape
    return `${linePoints} ${width},${height} 0,${height}`;
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.4" />
            <Stop offset="1" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Gradient fill under the line */}
        {data.length > 1 && (
          <Path
            d={`M ${getAreaPoints()} Z`}
            fill="url(#gradient)"
          />
        )}

        {/* Action Line */}
        <Polyline
          points={getPoints()}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
