import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = '@cacaoscan_notification_prefs';

interface NotificationPrefs {
  batchComplete: boolean;
  hardwareDisconnect: boolean;
  weeklyDigest: boolean;
  qualityAlerts: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  batchComplete: true,
  hardwareDisconnect: true,
  weeklyDigest: false,
  qualityAlerts: true,
};

export default function NotificationsSettingsScreen() {
  const theme = Colors.light;
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPrefs(JSON.parse(stored));
      }
    } catch {
      // Use defaults
    }
    setLoaded(true);
  };

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Silently fail
    }
  };

  const NotifToggle = ({ icon, label, description, prefKey }: { icon: string; label: string; description: string; prefKey: keyof NotificationPrefs }) => (
    <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
      <Ionicons name={icon as any} size={22} color={theme.primary} style={styles.toggleIcon} />
      <View style={styles.toggleContent}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={prefs[prefKey]}
        onValueChange={(val) => updatePref(prefKey, val)}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFF8F0"
      />
    </View>
  );

  if (!loaded) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Notifications', headerShadowVisible: false }} />
      <View style={styles.container}>

        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Choose which alerts and updates you want to receive from your CacaoScan system.
        </Text>

        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Scanning Alerts</Text>
          <NotifToggle
            icon="checkmark-done-outline"
            label="Batch Completion"
            description="Get notified when a batch finishes processing"
            prefKey="batchComplete"
          />
          <NotifToggle
            icon="warning-outline"
            label="Quality Alerts"
            description="Alert when rejection rate exceeds threshold"
            prefKey="qualityAlerts"
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Hardware</Text>
          <NotifToggle
            icon="unlink-outline"
            label="Hardware Disconnects"
            description="Alert when the scanner goes offline unexpectedly"
            prefKey="hardwareDisconnect"
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Reports</Text>
          <NotifToggle
            icon="calendar-outline"
            label="Weekly Digest"
            description="Receive a weekly summary of scanning activity"
            prefKey="weeklyDigest"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleIcon: {
    width: 32,
  },
  toggleContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  toggleLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
  },
  toggleDesc: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },
});
