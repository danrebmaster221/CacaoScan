import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const ESP32_DEFAULT_IP = '192.168.4.1'; // Default AP IP

export default function VisionCalibrationScreen() {
  const theme = Colors.light;
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [aeLevel, setAeLevel] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Not connected to scanner.');

  const handleConnect = async () => {
    setLoading(true);
    setStatus('Connecting...');
    try {
      const res = await fetch(`http://${ESP32_DEFAULT_IP}/status`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setConnected(true);
        setStatus('Connected to ESP32-CAM');
      } else {
        setStatus('Connection failed. Check Wi-Fi.');
      }
    } catch {
      setStatus('Could not reach scanner. Ensure you are on the scanner Wi-Fi network.');
    } finally {
      setLoading(false);
    }
  };

  const sendSetting = async (param: string, value: number) => {
    if (!connected) return;
    try {
      await fetch(`http://${ESP32_DEFAULT_IP}/control?var=${param}&val=${Math.round(value)}`);
    } catch {
      // Silently fail — ESP32 may not support live control
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Vision Calibration', headerShadowVisible: false }} />
      <View style={styles.container}>

        {/* Connection Status */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.statusRow}>
            <Ionicons name={connected ? 'checkmark-circle' : 'alert-circle'} size={24} color={connected ? theme.success : theme.warning} />
            <Text style={[styles.statusText, { color: theme.text }]}>{status}</Text>
          </View>
          {!connected && (
            <TouchableOpacity style={[styles.connectBtn, { backgroundColor: theme.primary }]} onPress={handleConnect} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.connectBtnText}>Connect to Scanner</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Camera Preview Placeholder */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Camera Preview</Text>
          <View style={[styles.previewBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            {connected ? (
              <Text style={{ color: theme.textSecondary, fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm }}>
                Live feed from ESP32-CAM will appear here when hardware is connected.
              </Text>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="videocam-off-outline" size={48} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary, marginTop: Spacing.sm, fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm }}>
                  Connect to scanner to see camera preview
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Camera Controls */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Camera Settings</Text>

          <View style={styles.sliderGroup}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>Brightness</Text>
              <Text style={[styles.sliderValue, { color: theme.primary }]}>{brightness}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-2}
              maximumValue={2}
              step={1}
              value={brightness}
              onSlidingComplete={(val) => { setBrightness(val); sendSetting('brightness', val); }}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
              disabled={!connected}
            />
          </View>

          <View style={styles.sliderGroup}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>Contrast</Text>
              <Text style={[styles.sliderValue, { color: theme.primary }]}>{contrast}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-2}
              maximumValue={2}
              step={1}
              value={contrast}
              onSlidingComplete={(val) => { setContrast(val); sendSetting('contrast', val); }}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
              disabled={!connected}
            />
          </View>

          <View style={styles.sliderGroup}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderLabel, { color: theme.textSecondary }]}>Auto Exposure Level</Text>
              <Text style={[styles.sliderValue, { color: theme.primary }]}>{aeLevel}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-2}
              maximumValue={2}
              step={1}
              value={aeLevel}
              onSlidingComplete={(val) => { setAeLevel(val); sendSetting('ae_level', val); }}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
              disabled={!connected}
            />
          </View>
        </View>

        {!connected && (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Connect your phone to the scanner&apos;s Wi-Fi hotspot (CacaoScan-AP) to begin calibration.
          </Text>
        )}
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
  previewBox: {
    height: 200,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sliderGroup: {
    marginBottom: Spacing.lg,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sliderLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },
  sliderValue: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.semiBold,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  hint: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
});
