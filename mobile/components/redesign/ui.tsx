import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  TextInputProps,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows, Palette } from '@/constants/theme';

const theme = Colors.light;

export function StickyHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.stickyHeader, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
      <TouchableOpacity
        onPress={onBack || (() => router.back())}
        style={styles.backRow}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color={theme.text} />
        <Text style={styles.stickyTitle}>{title}</Text>
      </TouchableOpacity>
      {subtitle ? <Text style={styles.stickySub}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function FieldInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Palette.disabled}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function BrownButton({
  title,
  onPress,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <TouchableOpacity
      style={[styles.brownBtn, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
      <Text style={styles.brownBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function OfflineBanner({ text }: { text: string }) {
  return (
    <View style={styles.offlineBanner}>
      <Ionicons name="cloud-offline-outline" size={20} color={theme.danger} />
      <Text style={styles.offlineText}>{text}</Text>
    </View>
  );
}

export function RedesignToggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#e3d6c9', true: Palette.chocolate }}
      thumbColor="#fff"
    />
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  stickyHeader: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: theme.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1e9e0',
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stickyTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: theme.text,
  },
  stickySub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: theme.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.borderSoft,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#7a6555',
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Palette.borderWarm,
    backgroundColor: Palette.creamField,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.text,
    fontFamily: Typography.fontFamily.regular,
  },
  brownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.chocolate,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    ...Shadows.md,
  },
  brownBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.dangerBg,
    borderColor: '#f3c9c9',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  offlineText: {
    flex: 1,
    color: theme.danger,
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#a1917f',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: Spacing.lg,
  },
});
