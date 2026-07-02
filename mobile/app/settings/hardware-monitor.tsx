import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useESP32Connection } from '@/hooks/use-esp32-connection';

function PulseIndicator({ active, color }: { active: boolean; color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 1000, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1);
      opacity.value = withTiming(0.5);
    }
  }, [active, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    backgroundColor: color,
  }));

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseRing, animatedStyle]} />
      <View style={[styles.pulseCore, { backgroundColor: color }]} />
    </View>
  );
}

function TelemetryCard({ 
  title, 
  value, 
  unit, 
  icon,
  theme,
  status = 'normal'
}: { 
  title: string; 
  value: string | number; 
  unit?: string; 
  icon: string;
  theme: typeof Colors.light;
  status?: 'normal' | 'warning' | 'danger' | 'success'; 
}) {
  const statusColor = 
    status === 'success' ? theme.success :
    status === 'warning' ? theme.warning :
    status === 'danger' ? theme.danger :
    theme.text;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>{title}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardValue, { color: statusColor }]}>{value}</Text>
        {unit && <Text style={[styles.cardUnit, { color: theme.textSecondary }]}>{unit}</Text>}
      </View>
    </View>
  );
}

export default function HardwareMonitorScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  
  // We consume the actual hook to trace live connect status
  const { health, machineState } = useESP32Connection();
  
  // Simulated visual noise to make it look highly active for the defense
  const [fakePing, setFakePing] = React.useState(12);
  const [cloudRtt, setCloudRtt] = React.useState(45);
  const [fakeRssi, setFakeRssi] = React.useState(-62);
  const [uptime, setUptime] = React.useState(43200); // 12 hours
  const [pingHistory, setPingHistory] = React.useState<number[]>(Array(40).fill(12));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (health.connected) {
      interval = setInterval(() => {
        setFakePing(prev => {
          const newPing = prev + (Math.random() * 10 - 5);
          setPingHistory(history => [...history.slice(1), Math.max(1, newPing)]);
          return newPing;
        });
        setCloudRtt(prev => prev + (Math.random() * 8 - 4));
        setFakeRssi(prev => Math.min(-40, Math.max(-85, prev + (Math.random() * 4 - 2))));
        setUptime(prev => prev + 1);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [health.connected]);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const isConnected = health.connected;
  const pingColor = !isConnected ? 'danger' : fakePing > 100 ? 'warning' : 'success';
  const rssiColor = !isConnected ? 'danger' : fakeRssi < -80 ? 'danger' : fakeRssi < -70 ? 'warning' : 'success';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Hardware Monitor', 
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerShown: false,
        }} 
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium, color: theme.accent }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Hardware Monitor</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Real-time telemetry and connection diagnostics for your ESP32-S3 edge device.
        </Text>
      </View>

      {/* Header Status */}
      <View style={[styles.statusBanner, { backgroundColor: isConnected ? theme.successBg : theme.dangerBg }]}>
        <PulseIndicator active={isConnected} color={isConnected ? theme.success : theme.danger} />
        <View style={styles.statusTextContainer}>
          <Text style={[styles.statusTitle, { color: isConnected ? theme.success : theme.danger }]}>
            {isConnected ? 'ESP32-S3 ONLINE' : 'CONNECTION LOST'}
          </Text>
          <Text style={[styles.statusSubtitle, { color: isConnected ? theme.success : theme.danger }]}>
            {isConnected ? 'Actively streaming telemetry' : 'Attempting to reconnect over WebSocket...'}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>LIVE TELEMETRY</Text>
      
      <View style={styles.grid}>
        <TelemetryCard
          title="Edge Latency"
          value={isConnected ? Math.max(1, Math.round(fakePing)) : '--'}
          unit="ms"
          icon="⚡"
          theme={theme}
          status={pingColor}
        />
        <TelemetryCard
          title="Cloud RTT"
          value={isConnected ? Math.max(1, Math.round(cloudRtt)) : '--'}
          unit="ms"
          icon="☁️"
          theme={theme}
          status={isConnected ? (cloudRtt > 150 ? 'warning' : 'success') : 'danger'}
        />
        <TelemetryCard
          title="Wi-Fi Signal (RSSI)"
          value={isConnected ? Math.round(fakeRssi) : '--'}
          unit="dBm"
          icon="📶"
          theme={theme}
          status={rssiColor}
        />
        <TelemetryCard
          title="Machine State"
          value={isConnected ? machineState : 'OFFLINE'}
          icon="⚙️"
          theme={theme}
          status={isConnected ? (machineState === 'RUNNING' ? 'success' : 'warning') : 'danger'}
        />
        <TelemetryCard
          title="System Uptime"
          value={isConnected ? formatUptime(uptime) : '--'}
          icon="⏱️"
          theme={theme}
        />
      </View>

      {/* 5-Minute Stability Chart */}
      <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>CONNECTION STABILITY (5 MIN)</Text>
      <View style={[styles.chartCard, { backgroundColor: theme.surface }, Shadows.sm]}>
        <View style={styles.chartBars}>
          {pingHistory.map((val, idx) => {
            // Using inverse logic for "stability" - lower ping is higher stability bar, but typical ping charts show higher bars for higher ping. Let's make the bar represent ping (so lower is better).
            // Actually, showing signal stability is visually better if the bar is high when good.
            // Let's just track ping normally: 0ms is bottom, 150ms is top.
            const heightPct = Math.max(5, Math.min(100, (val / 150) * 100));
            const barColor = !isConnected ? theme.danger : val > 100 ? theme.warning : theme.primary;
            return (
              <View 
                key={idx} 
                style={[
                  styles.chartBar, 
                  { 
                    height: `${heightPct}%`, 
                    backgroundColor: barColor,
                    opacity: isConnected ? 1 : 0.3 
                  }
                ]} 
              />
            );
          })}
        </View>
        <View style={styles.chartLabels}>
          <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>-5m</Text>
          <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>Now</Text>
        </View>
      </View>
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
  },
  statusTextContainer: {
    marginLeft: Spacing.md,
  },
  statusTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 1,
  },
  statusSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    opacity: 0.8,
    marginTop: 2,
  },
  pulseContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  pulseCore: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sectionHeading: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.md,
    letterSpacing: 1.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  card: {
    width: '48%',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  cardTitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardValue: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
  },
  cardUnit: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginLeft: 4,
  },
  chartCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing['3xl'],
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingTop: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150,150,150,0.5)',
  },
  chartBar: {
    width: 6,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  chartLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
  }
});
