import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows, Palette, ClassColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useBatchController, formatTime } from '@/hooks/use-batch-controller';
import { useESP32Connection } from '@/hooks/use-esp32-connection';
import { promptConnectScanner } from '@/context/ESP32Context';
import { router } from 'expo-router';

const CLASS_ROWS = [
  { key: 'criollo_count' as const, label: 'Criollo', color: ClassColors.Criollo },
  { key: 'forastero_count' as const, label: 'Forastero', color: ClassColors.Forastero },
  { key: 'trinitario_count' as const, label: 'Trinitario', color: ClassColors.Trinitario },
  { key: 'needs_drying_count' as const, label: 'Needs Drying', color: ClassColors.Needs_Drying },
  { key: 'rejected_count' as const, label: 'Rejected', color: ClassColors.Rejected },
];

function ExportRing({ pct, theme }: { pct: number; theme: typeof Colors.light }) {
  return (
    <View style={styles.exportRingWrap}>
      <View style={[styles.exportRingOuter, { borderColor: theme.border }]}>
        <View
          style={[
            styles.exportRingInner,
            {
              borderColor: theme.success,
              borderTopColor: pct >= 25 ? theme.success : 'transparent',
              borderRightColor: pct >= 50 ? theme.success : 'transparent',
              borderBottomColor: pct >= 75 ? theme.success : 'transparent',
            },
          ]}
        />
        <Text style={[styles.exportRingPct, { color: theme.text }]}>{pct}%</Text>
      </View>
      <Text style={[styles.exportRingLabel, { color: theme.textSecondary }]}>Export Rate</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, userRole } = useAuth();
  const {
    activeBatch,
    elapsedSeconds,
    totalBeans,
    throughput,
    createBatch,
    pauseBatch,
    resumeBatch,
    stopBatch,
    incrementBean,
  } = useBatchController();

  const {
    isConnected,
    isConnecting,
    isDemoMode,
    machineState,
    edgeIdentity,
    serverHost,
    setServerHost,
    connect,
    disconnect,
    enableDemoMode,
    sendCommand,
    currentClassification,
  } = useESP32Connection(activeBatch?.id, incrementBean);

  const [showNewSession, setShowNewSession] = useState(false);
  const [commandPending, setCommandPending] = useState<
    'start' | 'pause' | 'resume' | 'stop' | 'finalize' | 'ensure' | null
  >(null);
  const [harvestDateDate, setHarvestDateDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchName, setBatchName] = useState('');
  const [useManualLimit, setUseManualLimit] = useState(false);
  const [targetCount, setTargetCount] = useState('100');

  const displayName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name ||
    (userRole === 'admin' ? 'Admin' : 'Farmer');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const counts = activeBatch
    ? CLASS_ROWS.map((r) => activeBatch[r.key] || 0)
    : [0, 0, 0, 0, 0];
  const maxCount = Math.max(1, ...counts);
  const exportCount = activeBatch?.export_grade_count || 0;
  const exportRate = totalBeans ? Math.round((exportCount / totalBeans) * 100) : 0;
  const rejected = activeBatch?.rejected_count || 0;

  const onDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setHarvestDateDate(selectedDate);
      setHarvestDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  async function handleStartSession() {
    if (commandPending) return;
    if (!batchName.trim()) {
      Alert.alert('Invalid Input', 'Please enter a batch name or lot number.');
      return;
    }
    const finalTargetCount = useManualLimit ? parseInt(targetCount, 10) : 0;
    if (useManualLimit && (isNaN(finalTargetCount) || finalTargetCount <= 0)) {
      Alert.alert('Invalid Input', 'Please enter a valid target bean count.');
      return;
    }
    setCommandPending('start');
    try {
      const started = await sendCommand('START');
      if (!started.ok) {
        Alert.alert('Command failed', started.message);
        return;
      }
      const saved = await createBatch(batchName.trim(), harvestDate, finalTargetCount);
      if (!saved) {
        const stopped = await sendCommand('STOP');
        Alert.alert(
          'Batch not saved',
          stopped.ok
            ? 'The conveyor was stopped.'
            : 'The conveyor may still be running.'
        );
        return;
      }
      setShowNewSession(false);
      setBatchName('');
    } finally {
      setCommandPending(null);
    }
  }

  async function handlePause() {
    if (commandPending) return;
    setCommandPending('pause');
    try {
      const paused = await sendCommand('PAUSE');
      if (!paused.ok) {
        Alert.alert('Command failed', paused.message);
        return;
      }
      const saved = await pauseBatch();
      if (!saved) {
        Alert.alert('Sync error', 'The conveyor is paused, but the batch was not updated.');
      }
    } finally {
      setCommandPending(null);
    }
  }

  async function handleResume() {
    if (commandPending) return;
    setCommandPending('resume');
    try {
      const started = await sendCommand('START');
      if (!started.ok) {
        Alert.alert('Command failed', started.message);
        return;
      }
      const saved = await resumeBatch();
      if (!saved) {
        const stopped = await sendCommand('STOP');
        Alert.alert(
          'Sync error',
          stopped.ok
            ? 'The conveyor was stopped. The batch was not updated.'
            : 'The batch was not updated, and the stop was not confirmed.'
        );
      }
    } finally {
      setCommandPending(null);
    }
  }

  async function handleStopSession() {
    if (commandPending) return;
    const finalizing = machineState === 'STOPPED';
    setCommandPending(finalizing ? 'finalize' : 'stop');
    try {
      const stopped = await sendCommand('STOP');
      if (!stopped.ok) {
        Alert.alert('Command failed', stopped.message);
        return;
      }
      if (!activeBatch) return;
      const saved = await stopBatch();
      if (!saved) {
        Alert.alert('Sync error', 'The conveyor is stopped, but the batch was not finalized.');
      }
    } finally {
      setCommandPending(null);
    }
  }

  async function handleEnsureStopped() {
    if (commandPending) return;
    setCommandPending('ensure');
    try {
      const stopped = await sendCommand('STOP');
      if (!stopped.ok) Alert.alert('Command failed', stopped.message);
    } finally {
      setCommandPending(null);
    }
  }

  async function handleConnectScanner() {
    await promptConnectScanner(connect, enableDemoMode, serverHost);
  }

  const edgeReady = edgeIdentity === 'matched';
  const controlsLocked = commandPending !== null;
  const physicalLabel =
    machineState === 'UNKNOWN'
      ? 'Machine State: Not Confirmed'
      : machineState === 'RUNNING'
        ? 'Machine: RUNNING'
        : machineState === 'PAUSED'
          ? 'Machine: PAUSED'
          : 'Machine: STOPPED';
  const showEnsure = edgeReady && machineState === 'UNKNOWN';
  const showStart = !activeBatch && machineState === 'STOPPED' && edgeReady;
  const showPause = !!activeBatch && machineState === 'RUNNING' && edgeReady;
  const showResume =
    !!activeBatch &&
    edgeReady &&
    (machineState === 'PAUSED' ||
      (machineState === 'STOPPED' && activeBatch.status === 'paused'));
  const showStop =
    !!activeBatch &&
    edgeReady &&
    (machineState === 'RUNNING' || machineState === 'PAUSED' || machineState === 'STOPPED');
  const pendingLabel =
    commandPending === 'start'
      ? 'Starting...'
      : commandPending === 'pause'
        ? 'Pausing...'
        : commandPending === 'resume'
          ? 'Resuming...'
          : commandPending === 'finalize'
            ? 'Finalizing...'
            : commandPending === 'ensure'
              ? 'Ensuring stopped...'
              : commandPending === 'stop'
                ? 'Stopping...'
                : '';

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingLeft}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={[styles.greetingSub, { color: theme.textSecondary }]}>{greeting},</Text>
              <Text style={[styles.greetingName, { color: theme.text }]}>{displayName}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isConnected ? theme.successBg : theme.dangerBg,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? theme.success : theme.danger },
              ]}
            />
            <Text
              style={{
                color: isConnected ? theme.success : theme.danger,
                fontFamily: Typography.fontFamily.semiBold,
                fontSize: 13,
              }}
            >
              {isConnected ? 'Scanner online' : 'Scanner offline'}{isDemoMode ? ' · Demo' : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.heroIdle, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.idleTitle, { color: theme.text }]}>{physicalLabel}</Text>
          {activeBatch ? (
            <>
              <Text style={{ color: theme.textSecondary, marginTop: 8, fontSize: 14 }}>
                Batch: {activeBatch.batch_name}
              </Text>
              <Text style={{ color: theme.textSecondary, marginTop: 4, fontSize: 14 }}>
                Batch status: {activeBatch.status}
              </Text>
              <Text style={{ color: theme.textSecondary, marginTop: 4, fontSize: 14 }}>
                Elapsed {formatTime(elapsedSeconds)} · {throughput} beans/min · {totalBeans} sorted
              </Text>
            </>
          ) : null}
          {currentClassification && machineState === 'RUNNING' ? (
            <Text style={{ color: theme.textSecondary, marginTop: 8, fontSize: 14 }}>
              Last: {currentClassification.operationalClass.replace(/_/g, ' ')} ·{' '}
              {Math.round(currentClassification.confidence * 100)}%
            </Text>
          ) : null}
          {pendingLabel ? (
            <Text style={{ color: theme.text, marginTop: 12, fontFamily: Typography.fontFamily.semiBold }}>
              {pendingLabel}
            </Text>
          ) : null}
          <View style={[styles.heroActions, { marginTop: 16 }]}>
            {showEnsure ? (
              <TouchableOpacity
                style={[styles.heroPrimaryBtn, { backgroundColor: theme.primary }]}
                onPress={handleEnsureStopped}
                disabled={controlsLocked}
              >
                <Text style={styles.heroPrimaryText}>Ensure Stopped</Text>
              </TouchableOpacity>
            ) : null}
            {showResume ? (
              <TouchableOpacity
                style={[styles.heroPrimaryBtn, { backgroundColor: theme.primary }]}
                onPress={handleResume}
                disabled={controlsLocked}
              >
                <Text style={styles.heroPrimaryText}>Resume</Text>
              </TouchableOpacity>
            ) : null}
            {showStop ? (
              <TouchableOpacity
                style={[styles.heroPrimaryBtn, { backgroundColor: '#e02424' }]}
                onPress={handleStopSession}
                disabled={controlsLocked}
              >
                <Text style={styles.heroPrimaryText}>
                  {machineState === 'STOPPED' ? 'Finalize batch' : 'Stop'}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.heroSecondaryBtn, { backgroundColor: theme.border }]}
              onPress={() => router.push('/(tabs)/vision' as any)}
            >
              <Text style={[styles.heroSecondaryText, { color: theme.text }]}>View Live Feed</Text>
            </TouchableOpacity>
          </View>
          {showPause ? (
            <TouchableOpacity style={styles.pauseLink} onPress={handlePause} disabled={controlsLocked}>
              <Text style={[styles.pauseLinkText, { color: theme.textSecondary }]}>Pause session</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!isConnected ? (
          <View style={[styles.heroIdle, { borderColor: '#f0dcd8', backgroundColor: '#fdf3f1' }]}>
            <View style={[styles.statusPill, { backgroundColor: '#fbe1de', alignSelf: 'flex-start' }]}>
              <View style={[styles.statusDot, { backgroundColor: theme.danger }]} />
              <Text style={{ color: theme.danger, fontFamily: Typography.fontFamily.bold, fontSize: 12 }}>
                SCANNER OFFLINE
              </Text>
            </View>
            <Text style={{ color: '#a1857c', marginTop: 8, fontSize: 14 }}>
              Scanner socket is offline. Conveyor controls use the verified edge.
            </Text>
            <View style={styles.serverRow}>
              <Text style={styles.serverLabel}>AI Server</Text>
              <TextInput
                value={serverHost}
                onChangeText={setServerHost}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                placeholder="192.168.1.11"
                placeholderTextColor={Palette.disabled}
                style={styles.serverInput}
              />
            </View>
            <TouchableOpacity
              style={[styles.connectBtn, Shadows.md, isConnecting && { opacity: 0.7 }]}
              onPress={handleConnectScanner}
              disabled={isConnecting}
              activeOpacity={0.85}
            >
              <Ionicons name="power" size={20} color="#fff" />
              <Text style={styles.connectBtnText}>
                {isConnecting ? 'Connecting…' : 'Connect to Scanner'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.disconnectLink} onPress={disconnect}>
            <Text style={styles.disconnectLinkText}>
              Disconnect scanner{isDemoMode ? ' · Demo' : ''}
            </Text>
          </TouchableOpacity>
        )}

        {showStart ? (
          <TouchableOpacity
            style={[styles.startCta, { backgroundColor: theme.primary }, Shadows.md]}
            onPress={() => setShowNewSession(true)}
            disabled={controlsLocked}
          >
            <View>
              <Text style={styles.startCtaTitle}>Start New Session</Text>
              <Text style={styles.startCtaSub}>Begin sorting a new batch of beans</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </TouchableOpacity>
        ) : null}

        {/* Today's summary */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Today&apos;s Summary</Text>
          {machineState === 'RUNNING' && (
            <Text style={{ color: theme.success, fontFamily: Typography.fontFamily.semiBold, fontSize: 12 }}>
              ● Live
            </Text>
          )}
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryHero, Shadows.sm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Beans Sorted</Text>
            <Text style={[styles.summaryBig, { color: theme.text }]}>{totalBeans}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
              <Text style={{ color: theme.danger, fontFamily: Typography.fontFamily.semiBold }}>{rejected}</Text>
              {' '}rejected
            </Text>
          </View>
          <View style={[styles.summaryRingCard, Shadows.sm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ExportRing pct={exportRate} theme={theme} />
          </View>
        </View>

        {/* 5-class breakdown */}
        <View style={[styles.breakdownCard, Shadows.sm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.breakdownLabel}>5-CLASS BREAKDOWN</Text>
          {CLASS_ROWS.map((row, i) => (
            <View key={row.label} style={styles.breakdownRow}>
              <View style={styles.breakdownName}>
                <View style={[styles.classDot, { backgroundColor: row.color }]} />
                <Text style={{ color: theme.text, fontFamily: Typography.fontFamily.semiBold, fontSize: 13 }}>
                  {row.label}
                </Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: Palette.creamCard }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(counts[i] / maxCount) * 100}%`, backgroundColor: row.color },
                  ]}
                />
              </View>
              <Text style={{ width: 28, textAlign: 'right', fontFamily: Typography.fontFamily.bold, color: theme.text }}>
                {counts[i]}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.lastBatch, Shadows.sm, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/(tabs)/history' as any)}
        >
          <View style={[styles.lastBatchIcon, { backgroundColor: Palette.iconBg }]}>
            <Ionicons name="document-text-outline" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Batch history</Text>
            <Text style={{ color: theme.text, fontFamily: Typography.fontFamily.bold, fontSize: 15 }}>
              View past sessions
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Palette.disabled} />
        </TouchableOpacity>
      </ScrollView>

      {/* New session modal */}
      <Modal visible={showNewSession} transparent animationType="slide" onRequestClose={() => setShowNewSession(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowNewSession(false)} />
          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <View style={styles.grab} />
            <Text style={[styles.sheetTitle, { color: theme.text }]}>New Sorting Session</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              Set up your batch before starting the conveyor
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Batch Name / Lot #</Text>
            <TextInput
              value={batchName}
              onChangeText={setBatchName}
              placeholder="e.g. Mampang-Farm-Sack-A"
              placeholderTextColor={Palette.disabled}
              style={[styles.input, { color: theme.text, borderColor: Palette.borderWarm, backgroundColor: Palette.creamField }]}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Harvest Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[styles.input, { justifyContent: 'center', borderColor: Palette.borderWarm, backgroundColor: Palette.creamField }]}
            >
              <Text style={{ color: theme.text }}>{harvestDate}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={harvestDateDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
              />
            )}

            <View style={[styles.limitBox, { backgroundColor: Palette.creamCard, borderColor: theme.border }]}>
              <View style={styles.limitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: Typography.fontFamily.semiBold }}>Set Manual Limit</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Auto-stop after a set number of beans</Text>
                </View>
                <Switch
                  value={useManualLimit}
                  onValueChange={setUseManualLimit}
                  trackColor={{ true: theme.primary, false: Palette.borderWarm }}
                />
              </View>
              {useManualLimit && (
                <View style={styles.limitInputRow}>
                  <TextInput
                    value={targetCount}
                    onChangeText={setTargetCount}
                    keyboardType="number-pad"
                    style={[styles.limitInput, { color: theme.text, borderColor: Palette.borderWarm }]}
                  />
                  <Text style={{ color: theme.textSecondary }}>beans, then stop</Text>
                </View>
              )}
            </View>

            <View style={[styles.readyBanner, { backgroundColor: theme.successBg }]}>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              <Text style={{ color: theme.success, fontFamily: Typography.fontFamily.semiBold, fontSize: 13, flex: 1 }}>
                {edgeReady
                  ? 'Edge verified. The conveyor starts only after the machine confirms RUNNING.'
                  : 'Edge is not verified yet.'}
              </Text>
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: Palette.borderWarm }]} onPress={() => setShowNewSession(false)}>
                <Text style={{ color: theme.text, fontFamily: Typography.fontFamily.semiBold }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: theme.success }]}
                onPress={handleStartSession}
                disabled={controlsLocked}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.startBtnText}>
                  {commandPending === 'start' ? 'Starting...' : 'Start Sorting'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 110,
    paddingTop: Spacing.sm,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greetingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: 17 },
  greetingSub: { fontSize: 13 },
  greetingName: { fontSize: 19, fontFamily: Typography.fontFamily.bold },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  heroSorting: {
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    backgroundColor: Palette.chocolate,
    ...Shadows.md,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5be36b' },
  liveText: { color: '#fff', fontSize: 11, fontFamily: Typography.fontFamily.bold, textTransform: 'uppercase' },
  heroMuted: { color: '#d9c7ba', fontSize: 13, marginTop: 8 },
  heroTitle: { color: '#fff', fontSize: 22, fontFamily: Typography.fontFamily.bold },
  heroMetrics: { flexDirection: 'row', gap: 28, marginTop: Spacing.md },
  heroMetricValue: { color: '#fff', fontSize: 34, fontFamily: Typography.fontFamily.bold },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: Spacing.lg },
  heroSecondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroSecondaryText: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  heroPrimaryBtn: {
    flex: 1,
    backgroundColor: '#e02424',
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroPrimaryText: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  pauseLink: { marginTop: 12, alignItems: 'center' },
  pauseLinkText: { color: '#d9c7ba', fontFamily: Typography.fontFamily.medium },

  heroIdle: { marginTop: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg },
  idleTitle: { marginTop: 12, fontSize: 22, fontFamily: Typography.fontFamily.bold },
  serverRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  serverLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#a1857c',
  },
  serverInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Palette.brownText,
    paddingVertical: 0,
  },
  connectBtn: {
    marginTop: Spacing.md,
    backgroundColor: Palette.chocolate,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
  },
  disconnectLink: { marginTop: Spacing.md, alignSelf: 'flex-start' },
  disconnectLinkText: {
    color: Palette.muted,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
  },

  startCta: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startCtaTitle: { color: '#fff', fontSize: 18, fontFamily: Typography.fontFamily.bold },
  startCtaSub: { color: '#d9c7ba', fontSize: 14, marginTop: 2 },

  sectionHeader: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 20, fontFamily: Typography.fontFamily.bold },

  summaryRow: { flexDirection: 'row', gap: 12, marginTop: Spacing.md },
  summaryHero: { flex: 1.4, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  summaryBig: { fontSize: 38, fontFamily: Typography.fontFamily.bold, marginTop: 4 },
  summaryRingCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  exportRingWrap: { alignItems: 'center' },
  exportRingOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportRingInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 43,
    borderWidth: 8,
    transform: [{ rotate: '-90deg' }],
  },
  exportRingPct: { fontSize: 20, fontFamily: Typography.fontFamily.bold },
  exportRingLabel: { marginTop: 8, fontSize: 12, fontFamily: Typography.fontFamily.semiBold },

  breakdownCard: { marginTop: 12, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  breakdownLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#a1917f',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  breakdownName: { width: 100, flexDirection: 'row', alignItems: 'center', gap: 8 },
  classDot: { width: 10, height: 10, borderRadius: 5 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  lastBatch: {
    marginTop: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lastBatchIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Palette.overlay },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: 10,
  },
  grab: { alignSelf: 'center', width: 44, height: 6, borderRadius: 3, backgroundColor: '#e3d6c9', marginBottom: 14 },
  sheetTitle: { fontSize: 24, fontFamily: Typography.fontFamily.bold },
  fieldLabel: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: Typography.fontFamily.regular,
  },
  limitBox: { marginTop: 16, borderRadius: Radius.md, borderWidth: 1, padding: 14 },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  limitInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  limitInput: {
    width: 88,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    backgroundColor: '#fff',
  },
  readyBanner: {
    marginTop: 14,
    borderRadius: Radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtn: {
    flex: 1.6,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnText: { color: '#fff', fontFamily: Typography.fontFamily.bold, fontSize: 16 },
});
