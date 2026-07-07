import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

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
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    } catch {
      // Use defaults
    }
    setLoaded(true);
  };

  const savePrefs = async (updated: ThresholdPrefs) => {
    setPrefs(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Silently fail
    }
  };

  if (!loaded) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Smart Thresholds</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Configure automated alert rules. The system will monitor these thresholds and notify you when limits are breached.
        </Text>

        {/* Master Push Alerts */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.toggleRow}>
            <Ionicons name="notifications-outline" size={22} color={theme.primary} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>Push Notifications</Text>
              <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>Master toggle for Firebase Cloud Messaging (FCM)</Text>
            </View>
            <Switch
              value={prefs.pushAlertsEnabled}
              onValueChange={(val) => savePrefs({ ...prefs, pushAlertsEnabled: val })}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFF8F0"
            />
          </View>
        </View>

        {/* Reject Rate Limit */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning-outline" size={22} color={theme.danger} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Reject Rate Limit</Text>
          </View>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            If a batch exceeds this rejection percentage, the system sends a critical alert to your device.
          </Text>

          <View style={styles.sliderRow}>
            <Slider
              style={styles.slider}
              minimumValue={5}
              maximumValue={50}
              step={1}
              value={prefs.rejectRateLimit}
              onSlidingComplete={(val) => savePrefs({ ...prefs, rejectRateLimit: val })}
              minimumTrackTintColor={theme.danger}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.danger}
            />
            <View style={[styles.valueBox, { backgroundColor: theme.dangerBg }]}>
              <Text style={[styles.valueText, { color: theme.danger }]}>{prefs.rejectRateLimit}%</Text>
            </View>
          </View>

          <View style={styles.sliderLabels}>
            <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>5%</Text>
            <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>Threshold</Text>
            <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>50%</Text>
          </View>
        </View>

        {/* Connection Timeout */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.cardHeader}>
            <Ionicons name="timer-outline" size={22} color={theme.warning} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Connection Timeout</Text>
          </View>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            If the ESP32 doesn&apos;t ping the server within this duration, alert the user that the scanner may be offline.
          </Text>

          <View style={styles.timeoutRow}>
            <TextInput
              style={[styles.timeoutInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={String(prefs.connectionTimeout)}
              onChangeText={(t) => {
                const num = parseInt(t) || 0;
                savePrefs({ ...prefs, connectionTimeout: Math.min(300, Math.max(5, num)) });
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={[styles.timeoutUnit, { color: theme.textSecondary }]}>seconds</Text>
          </View>

          <Text style={[styles.timeoutHint, { color: theme.textSecondary }]}>
            Recommended: 30s for stable Wi-Fi, 60s for warehouse environments
          </Text>
        </View>

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: theme.infoBg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
            <Ionicons name="bulb-outline" size={20} color={theme.info} />
            <Text style={[styles.infoText, { color: theme.info }]}>
              These thresholds run autonomously. The system monitors business rules without manual intervention — proving &quot;Smart&quot; system logic for your defense.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  header: { paddingTop: 64, paddingBottom: Spacing.md },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  backText: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.medium },
  description: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, marginBottom: Spacing.lg, lineHeight: 20 },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  cardTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold },
  cardDesc: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, lineHeight: 20, marginBottom: Spacing.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  toggleDesc: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  slider: { flex: 1, height: 40 },
  valueBox: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.md, minWidth: 56, alignItems: 'center' },
  valueText: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  sliderLabel: { fontSize: 10, fontFamily: Typography.fontFamily.medium },
  timeoutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  timeoutInput: { width: 80, height: 50, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, textAlign: 'center' },
  timeoutUnit: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  timeoutHint: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.regular, fontStyle: 'italic' },
  infoText: { flex: 1, fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, lineHeight: 20 },
});
