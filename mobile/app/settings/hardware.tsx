import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Palette, Radius } from '@/constants/theme';
import { useESP32Connection, type EdgeIdentityStatus } from '@/context/ESP32Context';
import {
  StickyHeader,
  Card,
  OfflineBanner,
  BrownButton,
  FieldInput,
  SectionLabel,
} from '@/components/redesign/ui';

const EDGE_STATUS: Record<EdgeIdentityStatus, string> = {
  unknown: 'Edge unknown',
  checking: 'Checking edge…',
  matched: 'Edge verified',
  unpaired: 'No paired machine',
  mismatch: 'Edge mismatch',
  unreachable: 'Edge unreachable',
};

export default function HardwareMonitorScreen() {
  const theme = Colors.light;
  const router = useRouter();
  const { serverHost, setServerHost, edgeIdentity, isConnected, isConnecting } = useESP32Connection();
  const machineLabel = isConnecting ? 'Connecting...' : isConnected ? 'Scanner connected' : 'Scanner offline';
  const [hostInput, setHostInput] = useState(serverHost);
  const [showHostModal, setShowHostModal] = useState(false);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setHostInput(serverHost);
  }, [serverHost]);

  const openHostModal = () => {
    editingRef.current = false;
    setHostInput(serverHost);
    setShowHostModal(true);
  };

  const closeHostModal = () => {
    editingRef.current = false;
    setHostInput(serverHost);
    setShowHostModal(false);
  };

  const handleHostChange = (value: string) => {
    editingRef.current = true;
    setHostInput(value);
  };

  const handleSaveEdgeHost = () => {
    editingRef.current = false;
    setServerHost(hostInput);
    setShowHostModal(false);
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
      label: isConnected ? 'Wi-Fi' : 'Wi-Fi: N/A',
      value: '—',
      tone: Palette.chocolate,
    },
  ];

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <StickyHeader
          title="Hardware Monitor"
          subtitle="Machine connection and laptop edge health. This screen does not start the scanner."
          onBack={() => router.back()}
        />

        <View style={styles.body}>
          {!isConnecting && !isConnected && (
            <OfflineBanner text="Scanner offline" />
          )}
          <Card style={{ marginTop: Spacing.md }}>
            <Text style={styles.cardTitle}>Machine</Text>
            <Text style={[styles.statusValue, { color: isConnected ? theme.success : theme.danger }]}>
              {machineLabel}
            </Text>
            <Text style={[styles.cardTitle, { marginTop: 16 }]}>Edge Server</Text>
            <Text style={styles.statusValue}>{EDGE_STATUS[edgeIdentity]}</Text>
          </Card>

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
              Laptop address for the edge health check on port 5000. Saving it does not connect the ESP32.
            </Text>
            <Text style={styles.hostValue}>{serverHost || '—'}</Text>
            <View style={{ marginTop: 12 }}>
              <BrownButton
                title="Configure Edge Host"
                onPress={openHostModal}
                icon="create-outline"
              />
            </View>
          </Card>
        </View>
      </ScrollView>

      <Modal
        visible={showHostModal}
        transparent
        animationType="slide"
        onRequestClose={closeHostModal}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeHostModal} />
            <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
              <View style={styles.grab} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="globe-outline" size={20} color={theme.primary} />
                <Text style={styles.sheetTitle}>Configure Edge Host</Text>
              </View>
              <Text style={[styles.cardSub, { marginTop: 8, marginBottom: 12 }]}>
                Enter the laptop address for the edge health check on port 5000.
              </Text>
              <FieldInput
                value={hostInput}
                onChangeText={handleHostChange}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                placeholder="192.168.1.11"
                autoFocus
                style={{ fontFamily: Typography.fontFamily.medium }}
              />
              <View style={{ marginTop: 12 }}>
                <BrownButton
                  title="Save Edge Host"
                  onPress={handleSaveEdgeHost}
                  disabled={edgeIdentity === 'checking'}
                  icon="save-outline"
                />
              </View>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeHostModal} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  statusValue: { marginTop: 4, fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  cardSub: { fontSize: 13, color: Colors.light.textSecondary },
  hostValue: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.light.text,
  },
  dashLine: {
    marginVertical: 20,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#f0c9c4',
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalRoot: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Palette.overlay,
  },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: 10,
  },
  grab: {
    alignSelf: 'center',
    width: 44,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e3d6c9',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.light.text,
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.light.textSecondary,
  },
});
