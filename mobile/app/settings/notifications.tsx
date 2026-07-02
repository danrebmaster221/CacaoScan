import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, ScrollView, TouchableOpacity, Alert, Vibration } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [rejectRate, setRejectRate] = useState('20');
  const [offlineTimeout, setOfflineTimeout] = useState('30');

  const [activeSettings, setActiveSettings] = useState({
    pushEnabled: true,
    rejectRate: '20',
    offlineTimeout: '30'
  });

  const handleSave = () => {
    const rRate = parseInt(rejectRate, 10);
    const oTimeout = parseInt(offlineTimeout, 10);
    
    if (isNaN(rRate) || rRate < 1 || rRate > 100) {
      return Alert.alert('Validation Error', 'Reject Rate must be between 1% and 100%.');
    }
    if (isNaN(oTimeout) || oTimeout < 1) {
      return Alert.alert('Validation Error', 'Offline timeout must be at least 1 second.');
    }

    setActiveSettings({ pushEnabled, rejectRate, offlineTimeout });
    Alert.alert('Saved', 'Alert thresholds have been updated successfully and synced to hardware.');
  };

  const handleTestAlert = () => {
    if (!pushEnabled) {
      return Alert.alert('Test Failed', 'Master Push Alerts must be enabled to receive notifications.');
    }
    Vibration.vibrate([0, 500, 200, 500]); // Custom double-vibrate pattern
    Alert.alert(
      '🔔 CACAO SCAN ALERT', 
      `This is a simulated industrial notification.\n\nCurrent Parameters:\nReject > ${activeSettings.rejectRate}%\nTimeout > ${activeSettings.offlineTimeout} sec`
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Notifications & Alerts', 
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
        <Text style={[styles.title, { color: theme.text }]}>Smart Thresholds</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Configure custom triggers to receive immediate alerts when your physical hardware systems cross critical bounds.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.text }]}>Master Push Alerts</Text>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              Allow CacaoScan to vibrate and send push notifications to this device.
            </Text>
          </View>
          <Switch 
            value={pushEnabled} 
            onValueChange={setPushEnabled}
            trackColor={{ true: theme.primary, false: theme.border }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: Spacing.md }}>
            <Text style={[styles.label, { color: theme.text }]}>Reject Rate Alert</Text>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              Notify me immediately if a running batch exceeds this threshold of rejected beans.
            </Text>
          </View>
          <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
            <TextInput 
              style={[styles.numberInput, { color: theme.text }]}
              value={rejectRate}
              onChangeText={setRejectRate}
              placeholder="[%]"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={[styles.inputUnit, { color: theme.textSecondary }]}>%</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: Spacing.md }}>
            <Text style={[styles.label, { color: theme.text }]}>Connectivity Alert</Text>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              Alert if the ESP32 hardware remains completely offline for more than this duration.
            </Text>
          </View>
          <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
            <TextInput 
              style={[styles.numberInput, { color: theme.text }]}
              value={offlineTimeout}
              onChangeText={setOfflineTimeout}
              placeholder="[sec]"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={[styles.inputUnit, { color: theme.textSecondary }]}>sec</Text>
          </View>
        </View>

      </View>

      <TouchableOpacity 
        style={[styles.saveBtn, { backgroundColor: theme.primary }, Shadows.sm]}
        onPress={handleSave}
      >
        <Text style={styles.saveBtnText}>Update Triggers</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.testBtn, { borderColor: theme.border, backgroundColor: theme.background }, Shadows.sm]}
        onPress={handleTestAlert}
      >
        <Text style={[styles.testBtnText, { color: theme.text }]}>🔔 Test Alert</Text>
      </TouchableOpacity>

      <View style={[styles.activeCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.activeTitle, { color: theme.textSecondary }]}>CURRENT ACTIVE SETTINGS</Text>
        <Text style={[styles.activeValue, { color: theme.text }]}>
          Master Switch: <Text style={{ color: activeSettings.pushEnabled ? theme.success : theme.danger }}>{activeSettings.pushEnabled ? 'ON' : 'OFF'}</Text>
        </Text>
        <Text style={[styles.activeValue, { color: theme.text }]}>
          Reject Threshold: <Text style={{ color: theme.primary }}>&gt; {activeSettings.rejectRate}%</Text>
        </Text>
        <Text style={[styles.activeValue, { color: theme.text }]}>
          Timeout Threshold: <Text style={{ color: theme.primary }}>&gt; {activeSettings.offlineTimeout} sec</Text>
        </Text>
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
    marginBottom: Spacing.xl,
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
  card: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: 4,
  },
  helpText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(150,150,150,0.2)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    height: 48,
    width: 80,
  },
  numberInput: {
    flex: 1,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.semiBold,
    marginLeft: 2,
  },
  saveBtn: {
    height: 50,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing['2xl'],
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
  },
  testBtn: {
    height: 50,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginTop: Spacing.md,
  },
  testBtnText: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
  },
  activeCard: {
    marginTop: Spacing['2xl'],
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150,150,150,0.5)',
    marginBottom: Spacing.xl,
  },
  activeTitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  activeValue: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: 4,
  }
});
