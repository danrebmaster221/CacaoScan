import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useBatchController, formatTime } from '@/hooks/use-batch-controller';
import { useESP32Connection } from '@/hooks/use-esp32-connection';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { SwipeToStop } from '@/components/SwipeToStop';
import { Sparkline } from '@/components/Sparkline';
import { Skeleton } from '@/components/Skeleton';

// ─── Progress Ring Component ──────────────────────────────────────────────
function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  theme,
  isContinuous = false,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  theme: typeof Colors.light;
  isContinuous?: boolean;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background circle */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: theme.border,
          opacity: 0.3,
        }}
      />
      {/* Progress circle - simplified with a colored border */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: progress >= 1 ? theme.success : theme.accent,
          borderTopColor: progress >= 0.25 ? (progress >= 1 ? theme.success : theme.accent) : 'transparent',
          borderRightColor: progress >= 0.5 ? (progress >= 1 ? theme.success : theme.accent) : 'transparent',
          borderBottomColor: progress >= 0.75 ? (progress >= 1 ? theme.success : theme.accent) : 'transparent',
          borderLeftColor: progress >= 1 ? theme.success : theme.accent,
          transform: [{ rotate: '-90deg' }],
        }}
      />
      {/* Center content */}
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.progressPercent, { color: theme.text, fontSize: isContinuous ? 32 : Typography.fontSize.xl }]}>
          {isContinuous ? '∞' : `${Math.round(progress * 100)}%`}
        </Text>
        <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
          {isContinuous ? 'Auto' : 'Complete'}
        </Text>
      </View>
    </View>
  );
}

// ─── Counter Card Component ───────────────────────────────────────────────
function CounterCard({
  label,
  count,
  color,
  theme,
  emoji,
}: {
  label: string;
  count: number;
  color: string;
  theme: typeof Colors.light;
  emoji: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(100)}
      style={[styles.counterCard, { backgroundColor: theme.surface }, Shadows.sm]}
    >
      <Text style={styles.counterEmoji}>{emoji}</Text>
      <AnimatedCounter value={count} color={color} style={styles.counterNumber} />
      <Text style={[styles.counterLabel, { color: theme.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Main Dashboard Screen ────────────────────────────────────────────────
export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuth();
  const {
    activeBatch,
    isLoading,
    elapsedSeconds,
    totalBeans,
    throughput,
    progress,
    createBatch,
    pauseBatch,
    resumeBatch,
    stopBatch,
    incrementBean,
  } = useBatchController();

  const { isConnected, sendCommand, currentClassification } = useESP32Connection(activeBatch?.id, incrementBean);

  const [showNewSession, setShowNewSession] = useState(false);
  const [harvestDateDate, setHarvestDateDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchName, setBatchName] = useState('');
  const [useManualLimit, setUseManualLimit] = useState(false);
  const [targetCount, setTargetCount] = useState('100');
  const [sparklineData, setSparklineData] = useState<number[]>([0]);

  // Update sparkline data periodically
  React.useEffect(() => {
    if (activeBatch?.status === 'active') {
      const interval = setInterval(() => {
        setSparklineData((prev) => {
          const newData = [...prev, throughput];
          return newData.length > 20 ? newData.slice(newData.length - 20) : newData;
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeBatch?.status, throughput]);

  const displayName = user?.user_metadata?.full_name || 'Farmer';

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setHarvestDateDate(selectedDate);
      setHarvestDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  async function handleStartSession() {
    if (!batchName.trim()) {
      Alert.alert('Invalid Input', 'Please enter a batch name or lot number.');
      return;
    }
    const finalTargetCount = useManualLimit ? parseInt(targetCount) : 0;
    if (useManualLimit && (isNaN(finalTargetCount) || finalTargetCount <= 0)) {
      Alert.alert('Invalid Input', 'Please enter a valid target bean count.');
      return;
    }
    await createBatch(batchName.trim(), harvestDate, finalTargetCount);
    sendCommand('START');
    setSparklineData([0]);
    setShowNewSession(false);
  }

  function handlePause() {
    pauseBatch();
    sendCommand('PAUSE');
  }

  function handleResume() {
    resumeBatch();
    sendCommand('START');
  }

  function handleStopSession() {
    stopBatch();
    sendCommand('STOP');
  }

  // ─── Active Session View ──────────────────────────────────────────────
  if (activeBatch) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          {/* Session Header */}
          <View style={styles.sessionHeader}>
            <View>
              <Text style={[styles.sessionLabel, { color: activeBatch.status === 'paused' ? theme.warning : theme.textSecondary }]}>
                {activeBatch.status === 'paused' ? 'Session Paused' : 'Active Session'}
              </Text>
              <Text style={[styles.sessionTimer, { color: activeBatch.status === 'paused' ? theme.warning : theme.text }]}>
                ⏱ {formatTime(elapsedSeconds)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Sparkline data={sparklineData} width={80} height={20} color={activeBatch.status === 'paused' ? theme.warning : theme.accent} strokeWidth={1.5} />
              <View style={[styles.throughputBadge, { backgroundColor: theme.surface, marginTop: 4 }]}>
                <Text style={[styles.throughputValue, { color: activeBatch.status === 'paused' ? theme.warning : theme.accent }]}>
                  {throughput}
                </Text>
                <Text style={[styles.throughputUnit, { color: theme.textSecondary }]}>
                  beans/min
                </Text>
              </View>
            </View>
          </View>
          
          {/* Connection Error Banner */}
          {!isConnected && activeBatch.status === 'active' && (
            <Animated.View entering={FadeInDown} style={{ backgroundColor: theme.dangerBg, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Text style={{ fontSize: 24 }}>🚨</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.danger, fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.sm }}>INTERRUPTED: Machine Offline</Text>
                <Text style={{ color: theme.danger, opacity: 0.8, fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, marginTop: 2 }}>Please check the ESP32 Wi-Fi connection. The feed has stopped.</Text>
              </View>
            </Animated.View>
          )}

          {/* Progress Ring + Target */}
          <View style={[styles.progressSection, { backgroundColor: theme.surface }, Shadows.md]}>
            <ProgressRing progress={progress} theme={theme} isContinuous={activeBatch.target_bean_count === 0} />
            <View style={styles.progressInfo}>
              <Text style={[styles.progressBeans, { color: theme.text }]}>
                {totalBeans} {activeBatch.target_bean_count > 0 ? `/ ${activeBatch.target_bean_count}` : ''}
              </Text>
              <Text style={[styles.progressSubtitle, { color: theme.textSecondary }]}>
                beans sorted
              </Text>
              <Text style={[styles.harvestLabel, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
                🏷️ Batch: {activeBatch.batch_name}
              </Text>
              {/* Added Last Bean Result here for QA Polish */}
              <View style={[{ backgroundColor: theme.background, padding: 6, borderRadius: Radius.sm, marginTop: Spacing.sm }]}>
                <Text style={{ fontSize: Typography.fontSize.xs, color: theme.textSecondary, fontFamily: Typography.fontFamily.medium }}>
                  Last Result: <Text style={{ color: theme.primary, fontFamily: Typography.fontFamily.bold }}>
                    {currentClassification ? `${currentClassification.variety.toUpperCase()} (${currentClassification.quality})` : 'Waiting for bean...'}
                  </Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Variety Counters */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>By Variety</Text>
          <View style={styles.counterRow}>
            <CounterCard
              label="Criollo"
              count={activeBatch.criollo_count}
              color="#8D6E63"
              theme={theme}
              emoji="🟤"
            />
            <CounterCard
              label="Forastero"
              count={activeBatch.forastero_count}
              color="#5D4037"
              theme={theme}
              emoji="⬛"
            />
            <CounterCard
              label="Trinitario"
              count={activeBatch.trinitario_count}
              color={theme.accent}
              theme={theme}
              emoji="🟡"
            />
          </View>

          {/* Quality Counters */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>By Quality Grade</Text>
          <View style={styles.counterRow}>
            <CounterCard
              label="Export"
              count={activeBatch.export_grade_count}
              color={theme.success}
              theme={theme}
              emoji="✅"
            />
            <CounterCard
              label="Drying"
              count={activeBatch.needs_drying_count}
              color={theme.warning}
              theme={theme}
              emoji="⚠️"
            />
            <CounterCard
              label="Rejected"
              count={activeBatch.rejected_count}
              color={(totalBeans > 0 && activeBatch.rejected_count / totalBeans > 0.15) ? theme.danger : theme.textSecondary}
              theme={theme}
              emoji="❌"
            />
          </View>

          {/* Control Buttons — large, intentional */}
          <View style={{ marginTop: Spacing.xl, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', width: '100%', marginBottom: Spacing.lg }}>
              {activeBatch.status === 'active' ? (
                <TouchableOpacity
                  style={[styles.controlButton, styles.pauseButton]}
                  onPress={handlePause}
                  activeOpacity={0.8}
                >
                  <Text style={styles.controlIcon}>⏸</Text>
                  <Text style={styles.controlButtonText}>Pause Conveyor</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.controlButton, styles.resumeButton]}
                  onPress={handleResume}
                  activeOpacity={0.8}
                >
                  <Text style={styles.controlIcon}>▶️</Text>
                  <Text style={styles.controlButtonText}>Resume Sorting</Text>
                </TouchableOpacity>
              )}
            </View>

            <SwipeToStop 
              onStop={handleStopSession} 
              width={Dimensions.get('window').width - Spacing.md * 2} 
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── No Active Session View ───────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>{greeting},</Text>
            <Text style={[styles.userName, { color: theme.text }]}>{displayName} 👋</Text>
          </View>
          <View style={styles.connectionStatus}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? theme.success : theme.danger }]} />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              {isConnected ? 'Connected' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Machine Status Card */}
        <View style={[styles.machineCard, { backgroundColor: theme.surface }, Shadows.md]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Machine Status</Text>
          <View style={[styles.statusIndicator, { backgroundColor: isConnected ? theme.successBg : theme.dangerBg }]}>
            <Text style={[styles.statusBadgeText, { color: isConnected ? theme.success : theme.danger }]}>
              {isConnected ? 'ESP32 Online & Ready' : 'Not Connected'}
            </Text>
          </View>
          <Text style={[styles.cardHint, { color: theme.textSecondary }]}>
            {isConnected ? 'Hardware linked. You can start a batch.' : 'Connect to the ESP32 to start sorting.'}
          </Text>
        </View>

        {/* Start New Session Button */}
        <TouchableOpacity
          style={[styles.startSessionButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowNewSession(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.startEmoji}>🫘</Text>
          <View>
            <Text style={styles.startButtonTitle}>Start New Session</Text>
            <Text style={styles.startButtonSubtitle}>Begin sorting a new batch of beans</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Stats */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Today&apos;s Summary</Text>
        <View style={styles.counterRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface }, Shadows.sm]}>
            {isLoading ? <Skeleton width={50} height={32} style={{ marginBottom: Spacing.xs }} /> : <Text style={[styles.statNumber, { color: theme.primary }]}>0</Text>}
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Beans{'\n'}Sorted</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }, Shadows.sm]}>
            {isLoading ? <Skeleton width={50} height={32} style={{ marginBottom: Spacing.xs }} /> : <Text style={[styles.statNumber, { color: theme.success }]}>0</Text>}
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Export{'\n'}Grade</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface }, Shadows.sm]}>
            {isLoading ? <Skeleton width={50} height={32} style={{ marginBottom: Spacing.xs }} /> : <Text style={[styles.statNumber, { color: theme.danger }]}>0</Text>}
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rejected</Text>
          </View>
        </View>
      </ScrollView>

      {/* New Session Modal */}
      <Modal
        visible={showNewSession}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewSession(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Sorting Session</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Set up your batch before starting the conveyor
            </Text>

            <View style={styles.modalField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Batch Name / Lot #
              </Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={batchName}
                onChangeText={setBatchName}
                placeholder="e.g. Mampang-Farm-Sack-A"
                placeholderTextColor={theme.disabled}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Harvest Date
              </Text>
              
              {Platform.OS === 'ios' ? (
                <View style={{ alignItems: 'flex-start', marginTop: 4 }}>
                  <DateTimePicker
                    value={harvestDateDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.fieldInput, { backgroundColor: theme.surface, justifyContent: 'center', borderColor: theme.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: theme.text, fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.regular }}>
                    {harvestDate}
                  </Text>
                </TouchableOpacity>
              )}
              
              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={harvestDateDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                Set Manual Limit (Testing)
              </Text>
              <Switch
                value={useManualLimit}
                onValueChange={setUseManualLimit}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={theme.surface}
              />
            </View>

            {useManualLimit && (
              <View style={styles.modalField}>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={targetCount}
                  onChangeText={setTargetCount}
                  keyboardType="numeric"
                  placeholder="e.g. 100"
                  placeholderTextColor={theme.disabled}
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                onPress={() => setShowNewSession(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalStartBtn, { backgroundColor: theme.success }]}
                onPress={handleStartSession}
                disabled={isLoading}
              >
                <Text style={styles.modalStartText}>
                  {isLoading ? 'Starting...' : '▶ Start Sorting'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollPadding: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['2xl'] },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  greeting: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular },
  userName: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold },
  connectionStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium },

  // Machine Card
  machineCard: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold, marginBottom: Spacing.sm },
  statusIndicator: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm, marginBottom: Spacing.sm },
  statusBadgeText: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium },
  cardHint: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular },

  // Start Session
  startSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  startEmoji: { fontSize: 36 },
  startButtonTitle: { color: '#FFF8F0', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold },
  startButtonSubtitle: { color: 'rgba(255,248,240,0.7)', fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },

  // Section
  sectionTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold, marginBottom: Spacing.sm, marginTop: Spacing.sm },

  // Counter Row
  counterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  counterCard: { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  counterEmoji: { fontSize: 20, marginBottom: Spacing.xs },
  counterNumber: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold },
  counterLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium, marginTop: Spacing.xs, textAlign: 'center' },

  // Stat cards (idle view)
  statCard: { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  statNumber: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold },
  statLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium, marginTop: Spacing.xs, textAlign: 'center' },

  // Session Header
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  sessionLabel: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium },
  sessionTimer: { fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold },
  throughputBadge: { alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  throughputValue: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold },
  throughputUnit: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium },

  // Progress Section
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  progressInfo: { flex: 1 },
  progressPercent: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold },
  progressLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium },
  progressBeans: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold },
  progressSubtitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  harvestLabel: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, marginTop: Spacing.sm },

  // Controls
  controlButton: {
    flex: 1,
    height: 64,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  controlIcon: { fontSize: 22 },
  pauseButton: { backgroundColor: '#FFA726' },
  resumeButton: { backgroundColor: '#4CAF50' },
  stopButton: { backgroundColor: '#E53935' },
  controlButtonText: { color: '#FFF8F0', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold },
  controlButtonTextStop: { color: '#FFF8F0', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 31, 26, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  modalTitle: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, marginBottom: Spacing.xs },
  modalSubtitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, marginBottom: Spacing.lg },
  modalField: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, marginBottom: Spacing.xs },
  fieldInput: { height: 48, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.regular },
  modalButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  modalCancelBtn: { flex: 1, height: 48, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  modalStartBtn: { flex: 2, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  modalStartText: { color: '#FFF8F0', fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.semiBold },
});
