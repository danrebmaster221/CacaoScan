import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const ESP32_DEFAULT_IP = '192.168.4.1';
const POLL_INTERVAL = 3000;
const CHART_POINTS = 60; // 5 minutes at 5s intervals

interface TelemetryData {
  rssi: number;
  uptime: number;
  freeHeap: number;
  firmware: string;
  edgeLatency?: number;
  cloudRtt?: number;
}

export default function HardwareMonitorScreen() {
  const theme = Colors.light;
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [stabilityData, setStabilityData] = useState<number[]>(new Array(CHART_POINTS).fill(0));
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTelemetry = async () => {
    const start = Date.now();
    try {
      const res = await fetch(`http://${ESP32_DEFAULT_IP}/telemetry`, { signal: AbortSignal.timeout(3000) });
      const latency = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        setTelemetry({ ...data, edgeLatency: latency });
        setConnected(true);
        setStabilityData(prev => {
          const next = [...prev.slice(1), data.rssi ? Math.min(100, Math.max(0, 100 + data.rssi)) : 0];
          return next;
        });
      } else {
        handleDisconnect();
      }
    } catch {
      handleDisconnect();
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setStabilityData(prev => [...prev.slice(1), 0]);
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
  }, [connected]);

  const getRssiInfo = (rssi: number) => {
    if (rssi >= -50) return { label: 'Excellent', color: theme.success, icon: 'wifi' as const };
    if (rssi >= -60) return { label: 'Good', color: theme.success, icon: 'wifi' as const };
    if (rssi >= -70) return { label: 'Fair', color: theme.warning, icon: 'wifi' as const };
    return { label: 'Weak', color: theme.danger, icon: 'wifi' as const };
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const screenWidth = Dimensions.get('window').width - Spacing.lg * 2 - Spacing.lg * 2;

  // Mini sparkline renderer
  const renderStabilityChart = () => {
    const max = 100;
    const chartH = 80;
    const barW = Math.max(1, screenWidth / CHART_POINTS);

    return (
      <View style={[styles.chartContainer, { height: chartH }]}>
        <View style={styles.chartBars}>
          {stabilityData.map((val, i) => (
            <View
              key={i}
              style={[
                styles.chartBar,
                {
                  width: barW - 1,
                  height: Math.max(1, (val / max) * chartH),
                  backgroundColor: val === 0 ? theme.danger + '40' : val > 60 ? theme.success : val > 30 ? theme.warning : theme.danger,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.chartLabels}>
          <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>5m ago</Text>
          <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>now</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Hardware Monitor', headerShadowVisible: false }} />
      <View style={styles.container}>

        {/* Connection Banner */}
        <View style={[styles.card, { backgroundColor: connected ? theme.successBg : theme.dangerBg, borderColor: connected ? theme.success : theme.danger }, styles.statusBanner]}>
          <Ionicons name={connected ? 'wifi' : 'cloud-offline-outline'} size={24} color={connected ? theme.success : theme.danger} />
          <Text style={[styles.statusText, { color: connected ? theme.success : theme.danger }]}>
            {connected ? 'Online — Scanner Connected' : 'Connection Lost — Scanner Offline'}
          </Text>
        </View>

        {!connected && (
          <TouchableOpacity style={[styles.connectBtn, { backgroundColor: theme.primary }]} onPress={handleConnect} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.connectBtnText}>Connect to Scanner</Text>}
          </TouchableOpacity>
        )}

        {/* Latency Metrics */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>LATENCY METRICS</Text>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: theme.surface }, Shadows.sm]}>
            <Ionicons name="flash-outline" size={24} color={theme.primary} />
            <Text style={[styles.metricValue, { color: theme.text }]}>
              {connected && telemetry?.edgeLatency ? `${telemetry.edgeLatency}ms` : '—'}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Edge Latency</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: theme.surface }, Shadows.sm]}>
            <Ionicons name="globe-outline" size={24} color={theme.info} />
            <Text style={[styles.metricValue, { color: theme.text }]}>
              {connected && telemetry?.cloudRtt ? `${telemetry.cloudRtt}ms` : '—'}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Cloud RTT</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: theme.surface }, Shadows.sm]}>
            <Ionicons name="wifi" size={24} color={connected && telemetry ? getRssiInfo(telemetry.rssi).color : theme.textSecondary} />
            <Text style={[styles.metricValue, { color: theme.text }]}>
              {connected && telemetry ? `${telemetry.rssi} dBm` : '—'}
            </Text>
            <Text style={[styles.metricLabel, { color: connected && telemetry ? getRssiInfo(telemetry.rssi).color : theme.textSecondary }]}>
              Wi-Fi: {connected && telemetry ? getRssiInfo(telemetry.rssi).label : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Stability Chart */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Connection Stability</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Signal quality over the last 5 minutes</Text>
          {renderStabilityChart()}
        </View>

        {/* System Info */}
        {connected && telemetry && (
          <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>System Details</Text>
            <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Uptime</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{formatUptime(telemetry.uptime)}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Free Memory</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{(telemetry.freeHeap / 1024).toFixed(0)} KB</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Firmware</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{telemetry.firmware}</Text>
            </View>
          </View>
        )}

        {!connected && (
          <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
            <View style={{ alignItems: 'center', padding: Spacing.xl }}>
              <Ionicons name="hardware-chip-outline" size={48} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, marginTop: Spacing.md, fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, textAlign: 'center' }}>
                Connect your phone to the scanner&apos;s Wi-Fi hotspot (CacaoScan-AP) to view hardware telemetry.
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.semiBold,
    flex: 1,
  },
  connectBtn: {
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  connectBtnText: {
    color: '#FFF8F0',
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metricValue: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    marginTop: Spacing.xs,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.md,
  },
  chartContainer: {
    overflow: 'hidden',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  chartBar: {
    marginHorizontal: 0.5,
    borderRadius: 1,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  chartLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
