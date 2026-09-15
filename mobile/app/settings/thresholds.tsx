import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Palette } from '@/constants/theme';
import {
  StickyHeader,
  Card,
  RedesignToggle,
} from '@/components/redesign/ui';

const STORAGE_KEY = '@cacaoscan_threshold_prefs';

interface ThresholdPrefs {
  pushAlertsEnabled: boolean;
  rejectRateLimit: number;
  connectionTimeout: number;
}

const DEFAULT_PREFS: ThresholdPrefs = {
  pushAlertsEnabled: true,
  rejectRateLimit: 20,
  connectionTimeout: 30,
};

export default function SmartThresholdsScreen() {
  const router = useRouter();
  const theme = Colors.light;
  const [prefs, setPrefs] = useState<ThresholdPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setPrefs(JSON.parse(stored));
      } catch {
        // defaults
      }
      setLoaded(true);
    })();
  }, []);

  const savePrefs = async (updated: ThresholdPrefs) => {
    setPrefs(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  if (!loaded) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StickyHeader
        title="Smart Thresholds"
        subtitle="Configure automated alert rules. The system will monitor these thresholds and notify you when limits are breached."
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        <Card>
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={22} color={theme.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSub}>Master toggle for Firebase Cloud Messaging (FCM)</Text>
            </View>
            <RedesignToggle
              value={prefs.pushAlertsEnabled}
              onValueChange={(val) => savePrefs({ ...prefs, pushAlertsEnabled: val })}
            />
          </View>
        </Card>

        <Card style={{ marginTop: Spacing.md }}>
          <View style={styles.row}>
            <Ionicons name="warning-outline" size={20} color={theme.danger} />
            <Text style={[styles.rowTitle, { marginLeft: 8 }]}>Reject Rate Limit</Text>
          </View>
          <Text style={[styles.rowSub, { marginTop: 8 }]}>
            If a batch exceeds this rejection percentage, the system sends a critical alert to your device.
          </Text>
          <View style={styles.sliderRow}>
            <Slider
              style={{ flex: 1 }}
              minimumValue={5}
              maximumValue={50}
              step={1}
              value={prefs.rejectRateLimit}
              onValueChange={(val) => savePrefs({ ...prefs, rejectRateLimit: val })}
              minimumTrackTintColor={theme.danger}
              maximumTrackTintColor="#f2d0cc"
              thumbTintColor={theme.danger}
            />
            <View style={styles.rejectBadge}>
              <Text style={styles.rejectPct}>{prefs.rejectRateLimit}%</Text>
            </View>
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.rowSub}>5%</Text>
            <Text style={styles.rowSub}>Threshold</Text>
            <Text style={styles.rowSub}>50%</Text>
          </View>
        </Card>

        <Card style={{ marginTop: Spacing.md }}>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={20} color={theme.warning} />
            <Text style={[styles.rowTitle, { marginLeft: 8 }]}>Connection Timeout</Text>
          </View>
          <Text style={[styles.rowSub, { marginTop: 8 }]}>
            If the ESP32 doesn&apos;t ping the server within this duration, alert the user that the scanner may be offline.
          </Text>
          <View style={styles.timeoutRow}>
            <TextInput
              value={String(prefs.connectionTimeout)}
              onChangeText={(t) => {
                const n = parseInt(t, 10);
                if (!isNaN(n)) savePrefs({ ...prefs, connectionTimeout: n });
              }}
              keyboardType="number-pad"
              style={styles.timeoutInput}
            />
            <Text style={styles.seconds}>seconds</Text>
          </View>
          <Text style={styles.recommend}>
            Recommended: 30s for stable Wi-Fi, 60s for warehouse environments
          </Text>
        </Card>

        <View style={styles.tip}>
          <Ionicons name="bulb-outline" size={20} color="#3a7bc2" />
          <Text style={styles.tipText}>
            These thresholds run autonomously. The system monitors business rules without manual intervention — proving
            &quot;Smart&quot; system logic for your defense.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['3xl'] },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  rowSub: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 18 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  rejectBadge: {
    backgroundColor: Colors.light.dangerBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rejectPct: { fontSize: 20, fontFamily: Typography.fontFamily.bold, color: Colors.light.danger },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeoutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  timeoutInput: {
    width: 96,
    borderWidth: 1,
    borderColor: Palette.borderWarm,
    backgroundColor: Palette.creamField,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.light.text,
  },
  seconds: { fontSize: 16, fontFamily: Typography.fontFamily.semiBold, color: '#7a6555' },
  recommend: { marginTop: 12, fontSize: 12, fontStyle: 'italic', color: Colors.light.textSecondary },
  tip: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#e5f0fb',
    borderRadius: 16,
    padding: 16,
  },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#3a7bc2' },
});
