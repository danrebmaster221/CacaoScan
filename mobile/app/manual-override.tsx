import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AlertCircleIcon } from '@/components/auth/AuthIcons';

type ServoPosition = 1 | 2 | 3;
type IoniconName = ComponentProps<typeof Ionicons>['name'];

const ESP32_DEFAULT_IP = '192.168.4.1';

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
  const [conveyorSpeed, setConveyorSpeed] = useState(0);
  const [isConnected] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [eStopActive, setEStopActive] = useState(false);

  const controlsDisabled = !isConnected || !manualMode || eStopActive;

  function handleEmergencyStop() {
    setEStopActive(true);
    setConveyorSpeed(0);
    setCurrentServoPos(null);
    // Send E-Stop command to ESP32
    try {
      fetch(`http://${ESP32_DEFAULT_IP}/e-stop`, { method: 'POST', signal: AbortSignal.timeout(2000) });
    } catch {
      // Best effort
    }
    Alert.alert(
      '🛑 EMERGENCY STOP ACTIVATED',
      'Conveyor relay has been killed. All actuators are frozen. Press "Resume Operations" to re-enable controls.',
    );
  }

  function handleResumeOperations() {
    Alert.alert(
      'Resume Operations?',
      'This will re-enable manual controls. Make sure the sorting area is clear before proceeding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume',
          style: 'destructive',
          onPress: () => {
            setEStopActive(false);
            try {
              fetch(`http://${ESP32_DEFAULT_IP}/resume`, { method: 'POST', signal: AbortSignal.timeout(2000) });
            } catch {
              // Best effort
            }
          },
        },
      ],
    );
  }

  function handleManualModeToggle(enabled: boolean) {
    if (enabled) {
      Alert.alert(
        'Enable Manual Mode?',
        'This will disable the AI sorting system. Only use for maintenance or emergencies.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', style: 'destructive', onPress: () => setManualMode(true) },
        ],
      );
    } else {
      setManualMode(false);
      setCurrentServoPos(null);
      setConveyorSpeed(0);
    }
  }

  function handleServoPress(position: ServoPosition) {
    if (controlsDisabled) {
      if (eStopActive) {
        Alert.alert('E-Stop Active', 'Resume operations before using manual controls.');
      } else if (!isConnected) {
        Alert.alert('Not Connected', 'Connect to the ESP32 before using manual controls.');
      } else {
        Alert.alert('Manual Mode Required', 'Enable Manual Mode to use these controls.');
      }
      return;
    }
    setCurrentServoPos(position);
    // Send to ESP32
    try {
      fetch(`http://${ESP32_DEFAULT_IP}/servo?pos=${position}`, { signal: AbortSignal.timeout(2000) });
    } catch {
      // Silent
    }
  }

  function handleSpeedChange(value: number) {
    const speed = Math.round(value);
    setConveyorSpeed(speed);
    // Debounced send to ESP32 via PWM
    try {
      fetch(`http://${ESP32_DEFAULT_IP}/conveyor?speed=${speed}`, { signal: AbortSignal.timeout(2000) });
    } catch {
      // Silent
    }
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
            Direct physical control over the sorting machine
          </Text>
        </View>

        {/* Disconnected Banner */}
        {!isConnected && (
          <Animated.View
            entering={FadeInDown.delay(50)}
            style={[styles.disconnectedBanner, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
          >
            <Ionicons name="cloud-offline-outline" size={20} color={theme.danger} />
            <Text style={[styles.disconnectedText, { color: theme.danger }]}>
              Scanner Disconnected — Connect to CacaoScan-AP Wi-Fi
            </Text>
          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* EMERGENCY STOP — THE BIG RED BUTTON                */}
        {/* ═══════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(100)}>
          {eStopActive ? (
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleResumeOperations}
              activeOpacity={0.85}
            >
              <Ionicons name="play-circle-outline" size={32} color="#FFF8F0" />
              <Text style={styles.resumeButtonText}>Resume Operations</Text>
              <Text style={styles.resumeButtonSub}>Conveyor relay is currently HALTED</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.eStopButton}
              onPress={handleEmergencyStop}
              activeOpacity={0.85}
            >
              <Ionicons name="hand-left-outline" size={36} color="#FFF8F0" />
              <Text style={styles.eStopText}>EMERGENCY STOP</Text>
              <Text style={styles.eStopSubText}>Kill conveyor relay instantly</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Manual Mode Toggle */}
        <Animated.View entering={FadeInDown.delay(150)} style={[styles.manualModeCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.manualModeRow}>
            <Ionicons name="cog-outline" size={22} color={manualMode ? theme.warning : theme.textSecondary} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[styles.manualModeLabel, { color: theme.text }]}>Manual Mode</Text>
              <Text style={[styles.manualModeDesc, { color: theme.textSecondary }]}>
                {manualMode ? 'AI sorting is DISABLED — manual controls active' : 'AI sorting is active — turn on for manual control'}
              </Text>
            </View>
            <Switch
              value={manualMode}
              onValueChange={handleManualModeToggle}
              trackColor={{ false: theme.border, true: theme.warning }}
              thumbColor="#FFF8F0"
            />
          </View>
        </Animated.View>

        {/* Safety Warning */}
        {manualMode && (
          <Animated.View
            entering={FadeInDown.delay(100)}
            style={[styles.warningBanner, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}
          >
            <AlertCircleIcon size={18} color={theme.warning} accent={theme.warning} />
            <Text style={[styles.warningText, { color: theme.warning }]}>
              Manual mode overrides the AI sorting. Use only when needed.
            </Text>
          </Animated.View>
        )}

        {/* Servo Flipper Control */}
        <SectionHeader icon="construct-outline" title="Servo Flipper Control" theme={theme} />
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Manually route beans to a specific output bin
        </Text>

        <View style={[styles.servoDiagram, { backgroundColor: theme.surface, opacity: controlsDisabled ? 0.5 : 1 }, Shadows.md]}>
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
                  disabled={controlsDisabled}
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

        {/* Conveyor Speed Slider */}
        <SectionHeader icon="speedometer-outline" title="Conveyor Speed" theme={theme} />
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Adjust PWM speed of the 12V conveyor belt motor
        </Text>

        <View style={[styles.speedCard, { backgroundColor: theme.surface, opacity: controlsDisabled ? 0.5 : 1 }, Shadows.md]}>
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

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={conveyorSpeed}
            onSlidingComplete={handleSpeedChange}
            minimumTrackTintColor={speedDanger ? theme.danger : speedWarning ? theme.warning : theme.success}
            maximumTrackTintColor={theme.border}
            thumbTintColor={speedDanger ? theme.danger : speedWarning ? theme.warning : theme.primary}
            disabled={controlsDisabled}
          />

          <View style={styles.speedLabels}>
            <Text style={[styles.speedLabel, { color: theme.textSecondary }]}>0%</Text>
            <Text style={[styles.speedLabel, { color: theme.warning }]}>75%</Text>
            <Text style={[styles.speedLabel, { color: theme.danger }]}>90%</Text>
            <Text style={[styles.speedLabel, { color: theme.textSecondary }]}>100%</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.resetButton, { borderColor: theme.border }]}
          onPress={() => {
            setCurrentServoPos(null);
            setConveyorSpeed(0);
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

  disconnectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  disconnectedText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.semiBold,
    lineHeight: 20,
  },

  eStopButton: {
    backgroundColor: '#C62828',
    paddingVertical: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 3,
    borderColor: '#E53935',
    shadowColor: '#C62828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  eStopText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 2,
    marginTop: Spacing.sm,
  },
  eStopSubText: {
    color: '#FFCDD2',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginTop: 4,
  },

  resumeButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  resumeButtonText: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    marginTop: Spacing.sm,
  },
  resumeButtonSub: {
    color: '#C8E6C9',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginTop: 4,
  },

  manualModeCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  manualModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualModeLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
  },
  manualModeDesc: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
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
  slider: {
    width: '100%',
    height: 40,
    marginBottom: Spacing.xs,
  },
  speedLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  speedLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium },

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
