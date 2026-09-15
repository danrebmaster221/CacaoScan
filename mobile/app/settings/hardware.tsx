import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows, Palette } from '@/constants/theme';
import {
  StickyHeader,
  Card,
  OfflineBanner,
  BrownButton,
  FieldLabel,
  FieldInput,
  SectionLabel,
} from '@/components/redesign/ui';

const ESP32_DEFAULT_IP = '192.168.1.11';
const POLL_INTERVAL = 3000;

interface TelemetryData {
  rssi?: number;
  edgeLatency?: number;
  cloudRtt?: number;
}

export default function HardwareMonitorScreen() {
  const theme = Colors.light;
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverIp, setServerIp] = useState(ESP32_DEFAULT_IP);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTelemetry = async () => {
    const start = Date.now();
    try {
      const res = await fetch(`http://${serverIp}/telemetry`, {
        signal: AbortSignal.timeout(3000),
      });
      const latency = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        setTelemetry({ ...data, edgeLatency: latency });
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
      setTelemetry(null);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    await fetchTelemetry();
    setLoading(false);
  };

  useEffect(() => {
    if (connected) {
      pollRef.current = setInterval(fetchTelemetry, POLL_INTERVAL);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [connected, serverIp]);

  const metrics = [
    {
      icon: 'flash-outline' as const,
      label: 'Edge Latency',
      value: connected && telemetry?.edgeLatency != null ? `${telemetry.edgeLatency} ms` : '—',
      tone: Palette.chocolate,
    },
    {
      icon: 'globe-outline' as const,
      label: 'Cloud RTT',
      value: connected && telemetry?.cloudRtt != null ? `${telemetry.cloudRtt} ms` : '—',
      tone: '#3a7bc2',
    },
    {
      icon: 'wifi-outline' as const,
      label: connected ? 'Wi-Fi' : 'Wi-Fi: N/A',
      value: connected && telemetry?.rssi != null ? `${telemetry.rssi} dBm` : '—',
      tone: Palette.chocolate,
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StickyHeader
        title="Hardware Monitor"
        subtitle="Monitor real-time network latency, connection stability, and system telemetry of the ESP32 scanner."
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        {!connected && (
          <OfflineBanner text="Connection Lost — Scanner Offline" />
        )}
        <View style={{ marginTop: Spacing.md }}>
          <BrownButton
            title={loading ? 'Connecting…' : connected ? 'Refresh Telemetry' : 'Connect to Scanner'}
            onPress={handleConnect}
            disabled={loading}
            icon="power-outline"
          />
        </View>
        {loading && <ActivityIndicator style={{ marginTop: 12 }} color={theme.primary} />}

        <SectionLabel>Latency Metrics</SectionLabel>
        <View style={styles.metricRow}>
          {metrics.map((m) => (
            <Card key={m.label} style={styles.metricCard}>
              <Ionicons name={m.icon} size={22} color={m.tone} />
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </Card>
          ))}
        </View>

        <Card style={{ marginTop: Spacing.md }}>
          <Text style={styles.cardTitle}>Connection Stability</Text>
          <Text style={styles.cardSub}>Signal quality over the last 5 minutes</Text>
          <View style={styles.dashLine} />
          <View style={styles.timeRow}>
            <Text style={styles.cardSub}>5m ago</Text>
            <Text style={styles.cardSub}>now</Text>
          </View>
        </Card>

        <Card style={{ marginTop: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="globe-outline" size={20} color={theme.primary} />
            <Text style={styles.cardTitle}>AI Server IP Address</Text>
          </View>
          <Text style={[styles.cardSub, { marginTop: 6 }]}>
            Both the phone and ESP32 join the same local network. Set the edge server address here.
          </Text>
          <FieldInput
            value={serverIp}
            onChangeText={setServerIp}
            autoCapitalize="none"
            style={{ marginTop: 12, fontFamily: Typography.fontFamily.medium }}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['3xl'] },
  metricRow: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  metricValue: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Palette.disabled,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  cardTitle: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  cardSub: { fontSize: 13, color: Colors.light.textSecondary },
  dashLine: {
    marginVertical: 20,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#f0c9c4',
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
