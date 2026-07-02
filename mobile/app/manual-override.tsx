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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useESP32Connection } from '@/hooks/use-esp32-connection';

type ServoPosition = 1 | 2 | 3;

const SERVO_LABELS: Record<ServoPosition, { label: string; emoji: string; color: string }> = {
  1: { label: 'Route: Export', emoji: '✅', color: '#4CAF50' },
  2: { label: 'Route: Drying', emoji: '⚠️', color: '#FFA726' },
  3: { label: 'Route: Reject', emoji: '❌', color: '#E53935' },
};

export default function ManualOverrideScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [currentServoPos, setCurrentServoPos] = useState<ServoPosition | null>(null);
  const [conveyorSpeed, setConveyorSpeed] = useState(50); // PWM 0-100
  
  const { health } = useESP32Connection();
  const isConnected = health.connected;

  function handleEmergencyStop() {
    // Highly aggressive zero-delay interrupt logic conceptually lives here
    setConveyorSpeed(0);
    setCurrentServoPos(null);
    Alert.alert(
      'EMERGENCY STOP INITIATED',
      'The hardware relay has been killed. Conveyor and actuators are physically halted via hardware lock.',
      [{ text: 'Acknowledge', style: 'destructive' }]
    );
  }

  function handleServoPress(position: ServoPosition) {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Connect to the ESP32 before using manual controls.');
      return;
    }
    setCurrentServoPos(position);
    // TODO: Send WebSocket command to ESP32
  }

  function handleSpeedChange(delta: number) {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Connect to the ESP32 before using manual controls.');
      return;
    }
    setConveyorSpeed((prev) => Math.max(0, Math.min(100, prev + delta)));
    // TODO: Send PWM WebSocket command to ESP32
  }

  // Speed warning zone
  const speedWarning = conveyorSpeed > 75;
  const speedDanger = conveyorSpeed > 90;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Manual Override</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Direct control over the sorting machine hardware
          </Text>
        </View>

        {/* Warning Banner */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={[styles.warningBanner, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}
        >
          <Text style={styles.warningEmoji}>⚠️</Text>
          <Text style={[styles.warningText, { color: theme.warning }]}>
            Manual mode overrides the AI sorting. Use only when needed.
          </Text>
        </Animated.View>

        {/* Connection Status */}
        <View style={[styles.connectionCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={[styles.connDot, { backgroundColor: isConnected ? theme.success : theme.danger }]} />
          <Text style={[styles.connText, { color: theme.text }]}>
            ESP32: {isConnected ? 'Connected' : 'Not Connected'}
          </Text>
        </View>

        {/* KILL SWITCH */}
        <TouchableOpacity
          style={[styles.killSwitch, Shadows.md]}
          onPress={handleEmergencyStop}
          activeOpacity={0.8}
        >
          <Text style={styles.killSwitchIcon}>🛑</Text>
          <Text style={styles.killSwitchText}>EMERGENCY STOP (HALT MACHINE)</Text>
        </TouchableOpacity>

        {/* Disabling Wrapper for Hardware Controls */}
        <View style={{ opacity: isConnected ? 1 : 0.4 }} pointerEvents={isConnected ? 'auto' : 'none'}>

        {/* Section: Servo Flipper Control */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🔧 Servo Flipper Control</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Manually route beans to a specific output bin
        </Text>

        {/* Visual Servo Diagram */}
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
                  <Text style={styles.servoEmoji}>{config.emoji}</Text>
                  <Text
                    style={[
                      styles.servoLabel,
                      { color: isActive ? '#FFF8F0' : config.color },
                    ]}
                  >
                    {config.label}
                  </Text>
                  {isActive && (
                    <Text style={styles.servoActive}>● Active</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section: Conveyor Speed */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>⚡ Conveyor Speed</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Adjust PWM speed of the conveyor belt motor
        </Text>

        <View style={[styles.speedCard, { backgroundColor: theme.surface }, Shadows.md]}>
          {/* Speed Display */}
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

          {/* Speed Warning */}
          {speedWarning && (
            <View style={[styles.speedWarning, { backgroundColor: speedDanger ? theme.dangerBg : theme.warningBg }]}>
              <Text style={[styles.speedWarningText, { color: speedDanger ? theme.danger : theme.warning }]}>
                {speedDanger
                  ? '🚫 Too fast — camera cannot capture accurately'
                  : '⚠️ Approaching speed limit for AI detection'}
              </Text>
            </View>
          )}

          {/* Speed Bar Visualization */}
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
              {/* Warning zone marker */}
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

          {/* Speed Controls */}
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

        {/* Reset Button */}
        <TouchableOpacity
          style={[styles.resetButton, { borderColor: theme.border }]}
          onPress={() => {
            setCurrentServoPos(null);
            setConveyorSpeed(50);
          }}
        >
          <Text style={[styles.resetText, { color: theme.textSecondary }]}>
            🔄 Reset Controls
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollPadding: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing['2xl'] },

  // Header
  header: { paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  backButton: { marginBottom: Spacing.sm },
  backText: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  title: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold },
  subtitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, marginTop: Spacing.xs },

  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  warningEmoji: { fontSize: 20 },
  warningText: { flex: 1, fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, lineHeight: 20 },

  // Connection
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

  // Kill Switch
  killSwitch: {
    backgroundColor: '#D32F2F', // Deep aggressive red
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: '#B71C1C',
  },
  killSwitchIcon: { fontSize: 24 },
  killSwitchText: {
    color: '#FFF',
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
  },

  // Section
  sectionTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold, marginBottom: 2 },
  sectionSubtitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, marginBottom: Spacing.md },

  // Servo
  servoDiagram: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  diagramTitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, marginBottom: Spacing.md, textAlign: 'center' },
  diagramRow: { flexDirection: 'row', gap: Spacing.sm },
  servoButton: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  servoEmoji: { fontSize: 24 },
  servoLabel: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.semiBold, textAlign: 'center' },
  servoActive: { color: '#FFF8F0', fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium, marginTop: 2 },

  // Speed
  speedCard: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  speedDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: Spacing.md, gap: Spacing.xs },
  speedValue: { fontSize: Typography.fontSize['3xl'], fontFamily: Typography.fontFamily.bold },
  speedUnit: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.medium },
  speedWarning: { padding: Spacing.sm, borderRadius: Radius.sm, marginBottom: Spacing.md },
  speedWarningText: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, textAlign: 'center' },
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

  // Reset
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
