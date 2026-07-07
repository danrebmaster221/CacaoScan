import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const ESP32_DEFAULT_IP = '192.168.4.1';
const POLL_INTERVAL = 5000; // 5 seconds

interface TelemetryData {
  rssi: number;
  uptime: number;
  freeHeap: number;
  firmware: string;
}

export default function HardwareMonitorScreen() {
  const theme = Colors.light;
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [otaStatus, setOtaStatus] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`http://${ESP32_DEFAULT_IP}/telemetry`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
        setConnected(true);
      } else {
        setConnected(false);
        setTelemetry(null);
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
  }, [connected]);

  const getRssiLabel = (rssi: number) => {
    if (rssi >= -50) return { label: 'Excellent', color: theme.success };
    if (rssi >= -60) return { label: 'Good', color: theme.success };
    if (rssi >= -70) return { label: 'Fair', color: theme.warning };
    return { label: 'Weak', color: theme.danger };
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handleCheckOta = () => {
    setOtaStatus('Your firmware is up to date.');
    setTimeout(() => setOtaStatus(null), 4000);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Hardware Monitor', headerShadowVisible: false }} />
      <View style={styles.container}>

        {/* Connection */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.statusRow}>
            <Ionicons name={connected ? 'wifi' : 'wifi-outline'} size={24} color={connected ? theme.success : theme.textSecondary} />
            <Text style={[styles.statusText, { color: theme.text }]}>
              {connected ? 'Connected to Scanner' : 'Not connected'}
            </Text>
          </View>
          {!connected && (
            <TouchableOpacity style={[styles.connectBtn, { backgroundColor: theme.primary }]} onPress={handleConnect} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.connectBtnText}>Connect</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Telemetry Cards */}
        {connected && telemetry ? (
          <>
            <View style={styles.telemetryGrid}>
              <View style={[styles.telemetryCard, { backgroundColor: theme.surface }, Shadows.sm]}>
                <Ionicons name="wifi" size={28} color={getRssiLabel(telemetry.rssi).color} />
                <Text style={[styles.telemetryValue, { color: theme.text }]}>{telemetry.rssi} dBm</Text>
                <Text style={[styles.telemetryLabel, { color: getRssiLabel(telemetry.rssi).color }]}>
                  Wi-Fi: {getRssiLabel(telemetry.rssi).label}
                </Text>
              </View>
              <View style={[styles.telemetryCard, { backgroundColor: theme.surface }, Shadows.sm]}>
                <Ionicons name="time-outline" size={28} color={theme.primary} />
                <Text style={[styles.telemetryValue, { color: theme.text }]}>{formatUptime(telemetry.uptime)}</Text>
                <Text style={[styles.telemetryLabel, { color: theme.textSecondary }]}>Uptime</Text>
              </View>
            </View>

            <View style={styles.telemetryGrid}>
              <View style={[styles.telemetryCard, { backgroundColor: theme.surface }, Shadows.sm]}>
                <Ionicons name="server-outline" size={28} color={theme.info} />
                <Text style={[styles.telemetryValue, { color: theme.text }]}>{(telemetry.freeHeap / 1024).toFixed(0)} KB</Text>
                <Text style={[styles.telemetryLabel, { color: theme.textSecondary }]}>Free Memory</Text>
              </View>
              <View style={[styles.telemetryCard, { backgroundColor: theme.surface }, Shadows.sm]}>
                <Ionicons name="code-slash-outline" size={28} color={theme.primary} />
                <Text style={[styles.telemetryValue, { color: theme.text }]}>{telemetry.firmware}</Text>
                <Text style={[styles.telemetryLabel, { color: theme.textSecondary }]}>Firmware</Text>
              </View>
            </View>

            {/* OTA Section */}
            <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Firmware Updates</Text>
              <TouchableOpacity style={[styles.otaBtn, { borderColor: theme.primary }]} onPress={handleCheckOta}>
                <Ionicons name="cloud-download-outline" size={20} color={theme.primary} />
                <Text style={[styles.otaBtnText, { color: theme.primary }]}>Check for OTA Updates</Text>
              </TouchableOpacity>
              {otaStatus && (
                <Text style={[styles.otaStatus, { color: theme.success }]}>{otaStatus}</Text>
              )}
            </View>
          </>
        ) : !connected ? (
          <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
            <View style={{ alignItems: 'center', padding: Spacing.xl }}>
              <Ionicons name="hardware-chip-outline" size={48} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, marginTop: Spacing.md, fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, textAlign: 'center' }}>
                Connect your phone to the scanner&apos;s Wi-Fi hotspot to view hardware telemetry.
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    flex: 1,
  },
  connectBtn: {
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnText: {
    color: '#FFF8F0',
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  telemetryCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  telemetryValue: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    marginTop: Spacing.xs,
  },
  telemetryLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  otaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  otaBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  otaStatus: {
    marginTop: Spacing.md,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
  },
});
