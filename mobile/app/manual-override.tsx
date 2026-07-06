import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AlertCircleIcon } from '@/components/auth/AuthIcons';

type ServoPosition = 1 | 2 | 3;
type IoniconName = ComponentProps<typeof Ionicons>['name'];

const SERVO_LABELS: Record<
  ServoPosition,
  { label: string; icon: IoniconName; color: string }
> = {
  1: { label: 'Route: Export', icon: 'checkmark-circle-outline', color: '#4CAF50' },
  2: { label: 'Route: Drying', icon: 'alert-circle-outline', color: '#FFA726' },
  3: { label: 'Route: Reject', icon: 'close-circle-outline', color: '#E53935' },
};

function SectionHeader({
  icon,
  title,
  theme,
}: {
  icon: IoniconName;
  title: string;
  theme: typeof Colors.light;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={theme.primary} />
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

export default function ManualOverrideScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [currentServoPos, setCurrentServoPos] = useState<ServoPosition | null>(null);
  const [conveyorSpeed, setConveyorSpeed] = useState(50);
  const [isConnected] = useState(false);

  function handleServoPress(position: ServoPosition) {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Connect to the ESP32 before using manual controls.');
      return;
    }
    setCurrentServoPos(position);
  }

  function handleSpeedChange(delta: number) {
    setConveyorSpeed((prev) => Math.max(0, Math.min(100, prev + delta)));
  }

  const speedWarning = conveyorSpeed > 75;
  const speedDanger = conveyorSpeed > 90;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Manual Override</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Direct control over the sorting machine hardware
          </Text>
        </View>

        <Animated.View
          entering={FadeInDown.delay(100)}
          style={[styles.warningBanner, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}
        >
          <AlertCircleIcon size={18} color={theme.warning} accent={theme.warning} />
          <Text style={[styles.warningText, { color: theme.warning }]}>
            Manual mode overrides the AI sorting. Use only when needed.
          </Text>
        </Animated.View>

        <View style={[styles.connectionCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={[styles.connDot, { backgroundColor: isConnected ? theme.success : theme.danger }]} />
          <Text style={[styles.connText, { color: theme.text }]}>
            ESP32: {isConnected ? 'Connected' : 'Not Connected'}
          </Text>
        </View>

        <SectionHeader icon="construct-outline" title="Servo Flipper Control" theme={theme} />
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Manually route beans to a specific output bin
        </Text>

        <View style={[styles.servoDiagram, { backgroundColor: theme.surface }, Shadows.md]}>
          <Text style={[styles.diagramTitle, { color: theme.textSecondary }]}>Current Position</Text>
          <View style={styles.diagramRow}>
            {([1, 2, 3] as ServoPosition[]).map((pos) => {
              const config = SERVO_LABELS[pos];
              const isActive = currentServoPos === pos;
              return (
                <TouchableOpacity
                  key={pos}
                  style={[
                    styles.servoButton,
                    {
                      backgroundColor: isActive ? config.color : theme.background,
                      borderColor: config.color,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => handleServoPress(pos)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={config.icon}
                    size={28}
                    color={isActive ? '#FFF8F0' : config.color}
                  />
                  <Text
                    style={[
                      styles.servoLabel,
                      { color: isActive ? '#FFF8F0' : config.color },
                    ]}
                  >
                    {config.label}
                  </Text>
                  {isActive && (
                    <View style={styles.servoActiveRow}>
                      <View style={styles.servoActiveDot} />
                      <Text style={styles.servoActive}>Active</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <SectionHeader icon="speedometer-outline" title="Conveyor Speed" theme={theme} />
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Adjust PWM speed of the conveyor belt motor
        </Text>

        <View style={[styles.speedCard, { backgroundColor: theme.surface }, Shadows.md]}>
          <View style={styles.speedDisplay}>
            <Text
              style={[
                styles.speedValue,
                {
                  color: speedDanger
                    ? theme.danger
                    : speedWarning
                    ? theme.warning
                    : theme.text,
                },
              ]}
            >
              {conveyorSpeed}%
            </Text>
            <Text style={[styles.speedUnit, { color: theme.textSecondary }]}>PWM</Text>
          </View>

          {speedWarning && (
            <View
              style={[
                styles.speedWarning,
                { backgroundColor: speedDanger ? theme.dangerBg : theme.warningBg },
              ]}
            >
              <Ionicons
                name={speedDanger ? 'close-circle-outline' : 'alert-circle-outline'}
                size={16}
                color={speedDanger ? theme.danger : theme.warning}
                style={styles.speedWarningIcon}
              />
              <Text
                style={[
                  styles.speedWarningText,
                  { color: speedDanger ? theme.danger : theme.warning },
                ]}
              >
                {speedDanger
                  ? 'Too fast — camera cannot capture accurately'
                  : 'Approaching speed limit for AI detection'}
              </Text>
            </View>
          )}

          <View style={styles.speedBarContainer}>
            <View style={[styles.speedBarBg, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.speedBarFill,
                  {
                    width: `${conveyorSpeed}%`,
                    backgroundColor: speedDanger
                      ? theme.danger
                      : speedWarning
                      ? theme.warning
                      : theme.success,
                  },
                ]}
              />
              <View style={[styles.speedZoneMarker, { left: '75%', backgroundColor: theme.warning }]} />
              <View style={[styles.speedZoneMarker, { left: '90%', backgroundColor: theme.danger }]} />
            </View>
            <View style={styles.speedLabels}>
              <Text style={[styles.speedLabel, { color: theme.textSecondary }]}>0</Text>
              <Text style={[styles.speedLabel, { color: theme.warning }]}>75</Text>
              <Text style={[styles.speedLabel, { color: theme.danger }]}>90</Text>
              <Text style={[styles.speedLabel, { color: theme.textSecondary }]}>100</Text>
            </View>
          </View>

          <View style={styles.speedControls}>
            <TouchableOpacity
              style={[styles.speedBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => handleSpeedChange(-10)}
            >
              <Text style={[styles.speedBtnText, { color: theme.text }]}>- 10</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.speedBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => handleSpeedChange(-5)}
            >
              <Text style={[styles.speedBtnText, { color: theme.text }]}>- 5</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.speedBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => handleSpeedChange(5)}
            >
              <Text style={[styles.speedBtnText, { color: theme.text }]}>+ 5</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.speedBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => handleSpeedChange(10)}
            >
              <Text style={[styles.speedBtnText, { color: theme.text }]}>+ 10</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.resetButton, { borderColor: theme.border }]}
          onPress={() => {
            setCurrentServoPos(null);
            setConveyorSpeed(50);
          }}
        >
          <Text style={[styles.resetText, { color: theme.textSecondary }]}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollPadding: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['2xl'] },

  header: { paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  backText: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  title: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    marginTop: Spacing.xs,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    lineHeight: 20,
  },

  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  connDot: { width: 10, height: 10, borderRadius: 5 },
  connText: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold },
  sectionSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.md,
  },

  servoDiagram: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  diagramTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  diagramRow: { flexDirection: 'row', gap: Spacing.sm },
  servoButton: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  servoLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.semiBold,
    textAlign: 'center',
  },
  servoActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  servoActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF8F0' },
  servoActive: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
  },

  speedCard: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  speedDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  speedValue: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold },
  speedUnit: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.medium },
  speedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  speedWarningIcon: { marginRight: Spacing.xs },
  speedWarningText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  speedBarContainer: { marginBottom: Spacing.md },
  speedBarBg: { height: 12, borderRadius: 6, overflow: 'hidden', position: 'relative' },
  speedBarFill: { height: 12, borderRadius: 6 },
  speedZoneMarker: { position: 'absolute', top: 0, width: 2, height: 12 },
  speedLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  speedLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium },
  speedControls: { flexDirection: 'row', gap: Spacing.sm },
  speedBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedBtnText: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.semiBold },

  resetButton: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  resetText: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
});
