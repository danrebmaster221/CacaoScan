import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows, Palette, ClassColors } from '@/constants/theme';
import {
  StickyHeader,
  Card,
  OfflineBanner,
  RedesignToggle,
} from '@/components/redesign/ui';
import { useESP32Connection } from '@/hooks/use-esp32-connection';

const ESP32_DEFAULT_IP = '192.168.4.1';

const GATES = [
  { n: 1, label: 'Rejected', color: ClassColors.Rejected },
  { n: 2, label: 'Drying', color: ClassColors.Needs_Drying },
  { n: 3, label: 'Criollo', color: ClassColors.Criollo },
  { n: 4, label: 'Forastero', color: ClassColors.Forastero },
  { n: 5, label: 'Trinitario', color: ClassColors.Trinitario },
];

export default function ManualOverrideScreen() {
  const theme = Colors.light;
  const router = useRouter();
  const { isConnected } = useESP32Connection();

  const [manual, setManual] = useState(false);
  const [conveyor, setConveyor] = useState(false);
  const offline = !isConnected;
  const lockStyle = offline ? { opacity: 0.45 } : undefined;

  function post(path: string) {
    try {
      fetch(`http://${ESP32_DEFAULT_IP}${path}`, {
        method: 'POST',
        signal: AbortSignal.timeout(2000),
      }).catch(() => {});
    } catch {
      // best effort
    }
  }

  function handleEStop() {
    if (offline) return;
    setConveyor(false);
    post('/e-stop');
    Alert.alert('Emergency Stop', 'Conveyor relay killed. All actuators frozen.');
  }

  function handleGate(n: number) {
    if (offline || !manual) {
      Alert.alert('Locked', offline ? 'Connect to the machine first.' : 'Enable Manual Mode first.');
      return;
    }
    post(`/gate/${n}`);
    Alert.alert('Gate Test', `Actuating Gate ${n}`);
  }

  function handleConveyor(on: boolean) {
    if (offline || !manual) return;
    setConveyor(on);
    post(on ? '/conveyor/on' : '/conveyor/off');
  }

  function handleManualToggle(enabled: boolean) {
    if (enabled) {
      Alert.alert(
        'Enable Manual Mode?',
        'This will disable AI sorting. Only use for maintenance or emergencies.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', style: 'destructive', onPress: () => setManual(true) },
        ]
      );
    } else {
      setManual(false);
      setConveyor(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <StickyHeader
        title="Manual Override"
        subtitle="Direct physical control over the sorting machine"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {offline && (
          <View style={{ marginBottom: Spacing.md }}>
            <OfflineBanner text="Machine offline — connect to actuate hardware" />
          </View>
        )}

        <TouchableOpacity
          style={[styles.eStop, offline && { backgroundColor: '#e6a3a3' }]}
          onPress={handleEStop}
          disabled={offline}
          activeOpacity={0.9}
        >
          <Ionicons name="hand-left-outline" size={36} color="#fff" />
          <Text style={styles.eStopTitle}>EMERGENCY STOP</Text>
          <Text style={styles.eStopSub}>
            {offline ? 'Unavailable while disconnected' : 'Kill conveyor relay instantly'}
          </Text>
        </TouchableOpacity>

        <Card style={{ marginTop: Spacing.md, ...lockStyle }}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <Ionicons name="settings-outline" size={22} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Manual Mode</Text>
                <Text style={styles.rowSub}>AI sorting is active — turn on for manual control</Text>
              </View>
            </View>
            <RedesignToggle value={manual} onValueChange={handleManualToggle} />
          </View>
        </Card>

        <Text style={[styles.h3, { color: theme.text }]}>
          <Ionicons name="construct-outline" size={18} color={theme.primary} /> Gate Test Control
        </Text>
        <Text style={styles.hint}>Manually actuate each physical sorting paddle</Text>
        <Card style={{ marginTop: 10 }}>
          <View style={[styles.gateGrid, lockStyle]}>
            {GATES.map((g) => (
              <TouchableOpacity
                key={g.n}
                disabled={offline}
                onPress={() => handleGate(g.n)}
                style={[styles.gateBtn, { borderColor: g.color, backgroundColor: `${g.color}1a` }]}
              >
                <Text style={styles.gateN}>Gate {g.n}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: g.color }} />
                  <Text style={{ color: g.color, fontFamily: Typography.fontFamily.bold, fontSize: 12 }}>
                    {g.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {offline && (
            <Text style={styles.lockHint}>Connect to a machine to actuate hardware</Text>
          )}
        </Card>

        <Text style={[styles.h3, { color: theme.text }]}>Conveyor Motor</Text>
        <Text style={styles.hint}>Opto-isolated relay — switched ON / OFF</Text>
        <Card style={{ marginTop: 10, ...lockStyle }}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: conveyor ? theme.success : Palette.disabled,
                }}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: Typography.fontFamily.bold,
                  color: conveyor ? theme.success : theme.textSecondary,
                }}
              >
                {conveyor ? 'Motor Running' : 'Motor Stopped'}
              </Text>
            </View>
            <RedesignToggle
              value={conveyor}
              onValueChange={(v) => {
                if (!manual || offline) {
                  Alert.alert('Locked', 'Enable Manual Mode while connected first.');
                  return;
                }
                handleConveyor(v);
              }}
            />
          </View>
        </Card>

        <TouchableOpacity
          style={[styles.resetBtn, offline && { opacity: 0.45 }]}
          disabled={offline}
          onPress={() => {
            setManual(false);
            setConveyor(false);
          }}
        >
          <Text style={styles.resetText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['3xl'] },
  eStop: {
    backgroundColor: '#e02424',
    borderRadius: Radius.lg,
    paddingVertical: 28,
    alignItems: 'center',
    ...Shadows.md,
  },
  eStopTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  eStopSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  rowSub: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  h3: {
    marginTop: Spacing.lg,
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
  },
  hint: { marginTop: 4, fontSize: 14, color: Colors.light.textSecondary },
  gateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gateBtn: {
    width: '30%',
    flexGrow: 1,
    minWidth: '28%',
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  gateN: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  lockHint: {
    marginTop: 14,
    textAlign: 'center',
    color: Palette.disabled,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
  },
  resetBtn: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.borderWarm,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  resetText: {
    color: Palette.chocolate,
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
  },
});
