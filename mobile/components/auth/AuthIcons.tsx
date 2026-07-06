import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  accent?: string;
};

export function ShieldLockIcon({
  size = 16,
  color = '#6D4C41',
  accent = '#A1887F',
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5L5.5 6.25V11.5C5.5 16.1 8.55 19.45 12 20.75C15.45 19.45 18.5 16.1 18.5 11.5V6.25L12 3.5Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Rect
        x={9.25}
        y={10.25}
        width={5.5}
        height={4.5}
        rx={1}
        stroke={accent}
        strokeWidth={1.3}
      />
      <Path
        d="M12 10.25V8.75C12 7.95 12.65 7.3 13.45 7.3C14.25 7.3 14.9 7.95 14.9 8.75"
        stroke={accent}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function EyeRevealIcon({
  size = 20,
  color = '#5C3824',
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.25 12C4.8 7.2 8.1 5 12 5c3.9 0 7.2 2.2 9.75 7-2.55 4.8-5.85 7-9.75 7-3.9 0-7.2-2.2-9.75-7Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.5} />
      <Circle cx={12} cy={12} r={1.15} fill={color} />
    </Svg>
  );
}

export function EyeConcealIcon({
  size = 20,
  color = '#5C3824',
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.25 12C4.8 7.2 8.1 5 12 5c3.9 0 7.2 2.2 9.75 7-2.55 4.8-5.85 7-9.75 7-3.9 0-7.2-2.2-9.75-7Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={0.4}
      />
      <Line
        x1={5}
        y1={5}
        x2={19}
        y2={19}
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function AlertCircleIcon({
  size = 16,
  color = '#E53935',
  accent = '#FFA726',
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.4} />
      <Line x1={12} y1={8} x2={12} y2={13} stroke={accent} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={12} cy={16.25} r={0.9} fill={accent} />
    </Svg>
  );
}

/** Official multi-color Google "G" mark, rendered as local vector paths. */
export function GoogleGlyph({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </Svg>
  );
}

export function MailIcon({ size = 20, color = '#8D6E63' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path
        d="M4 8.5l8 5.5 8-5.5"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LockIcon({ size = 20, color = '#8D6E63' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={5.5}
        y={11}
        width={13}
        height={9}
        rx={1.5}
        stroke={color}
        strokeWidth={1.4}
      />
      <Path
        d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
