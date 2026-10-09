import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Palette } from '@/constants/theme';
import { useESP32Connection, type EdgeIdentityStatus } from '@/context/ESP32Context';
import {
  StickyHeader,
  Card,
  OfflineBanner,
  BrownButton,
  FieldInput,
  SectionLabel,
} from '@/components/redesign/ui';

const STATUS_TITLE: Record<EdgeIdentityStatus, string> = {
  unknown: 'Connect to Scanner',
  checking: 'Connecting…',
  matched: 'Scanner connected',
  unpaired: 'No paired machine',
  mismatch: 'Machine identity mismatch',
  unreachable: 'Scanner unreachable',
};

export default function HardwareMonitorScreen() {
  const theme = Colors.light;
  const router = useRouter();
  const { serverHost, setServerHost, edgeIdentity } = useESP32Connection();
  const scannerConnected = edgeIdentity === 'matched';
  const [hostInput, setHostInput] = useState(serverHost);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setHostInput(serverHost);
  }, [serverHost]);

  const handleHostChange = (value: string) => {
    editingRef.current = true;
    setHostInput(value);
  };

  const handleConnect = () => {
    editingRef.current = false;
    setServerHost(hostInput);
  };

  const metrics = [
    {
      icon: 'flash-outline' as const,
      label: 'Edge Latency',
      value: '—',
      tone: Palette.chocolate,
    },
    {
      icon: 'globe-outline' as const,
      label: 'Cloud RTT',
      value: '—',
      tone: '#3a7bc2',
    },
    {
      icon: 'wifi-outline' as const,
      label: scannerConnected ? 'Wi-Fi' : 'Wi-Fi: N/A',
      value: '—',
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
        {!scannerConnected && edgeIdentity !== 'unknown' && edgeIdentity !== 'checking' && (
          <OfflineBanner text={STATUS_TITLE[edgeIdentity]} />
        )}
        <View style={{ marginTop: Spacing.md }}>
          <BrownButton
            title={STATUS_TITLE[edgeIdentity]}
            onPress={handleConnect}
            disabled={edgeIdentity === 'checking'}
            icon="power-outline"
          />
        </View>

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
            Shared phone host for the port 8080 scanner and the port 5000 health check. This does not change the ESP32 address, and telemetry is not available from this screen.
          </Text>
          <FieldInput
            value={hostInput}
            onChangeText={handleHostChange}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ marginTop: 12, fontFamily: Typography.fontFamily.medium }}
          />
          <Text style={[styles.cardSub, { marginTop: 8 }]}>{STATUS_TITLE[edgeIdentity]}</Text>
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
