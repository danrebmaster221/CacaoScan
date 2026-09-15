import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Palette } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { StickyHeader, Card, BrownButton } from '@/components/redesign/ui';

const ESP32_DEFAULT_IP = '192.168.4.1';

interface ROIBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_ROIS: ROIBox[] = [
  { x: 160, y: 150, w: 120, h: 200 },
  { x: 420, y: 150, w: 120, h: 200 },
  { x: 680, y: 150, w: 120, h: 200 },
];

const POCKET_LABELS = ['Left', 'Center', 'Right'];
const NUDGE_STEP = 5;
const SCALE_STEP = 10;

export default function VisionCalibrationScreen() {
  const theme = Colors.light;
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [frameUri, setFrameUri] = useState<string | null>(null);
  const [rois, setRois] = useState<ROIBox[]>(DEFAULT_ROIS);
  const [selectedPocket, setSelectedPocket] = useState(0);
  const [status, setStatus] = useState('Not connected to scanner.');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setStatus('Connecting...');
    try {
      const res = await fetch(`http://${ESP32_DEFAULT_IP}/capture`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const blob = await res.blob();
        setFrameUri(URL.createObjectURL(blob));
        setConnected(true);
        setStatus('Connected — Frame captured');
      } else {
        setStatus('Connection failed.');
      }
    } catch {
      setStatus('Could not reach scanner. Connect to CacaoScan-AP Wi-Fi.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshFrame = async () => {
    try {
      const res = await fetch(`http://${ESP32_DEFAULT_IP}/capture`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const blob = await res.blob();
        setFrameUri(URL.createObjectURL(blob));
      }
    } catch {
      // keep existing frame
    }
  };

  const nudge = (dir: 'up' | 'down' | 'left' | 'right') => {
    setRois((prev) => {
      const next = [...prev];
      const roi = { ...next[selectedPocket] };
      if (dir === 'up') roi.y -= NUDGE_STEP;
      if (dir === 'down') roi.y += NUDGE_STEP;
      if (dir === 'left') roi.x -= NUDGE_STEP;
      if (dir === 'right') roi.x += NUDGE_STEP;
      next[selectedPocket] = roi;
      return next;
    });
  };

  const scale = (delta: number) => {
    setRois((prev) => {
      const next = [...prev];
      const roi = { ...next[selectedPocket] };
      roi.w = Math.max(20, roi.w + delta);
      roi.h = Math.max(20, roi.h + delta);
      next[selectedPocket] = roi;
      return next;
    });
  };

  const handleSaveToCloud = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const config = { rois, updated_at: new Date().toISOString() };
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user?.user_metadata,
          vision_config: config,
        },
      });
      if (error) throw error;
      setSaveStatus('Calibration saved to cloud!');
    } catch {
      setSaveStatus('Failed to save calibration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ headerShown: false }} />
      <StickyHeader
        title="Vision Calibration"
        subtitle="Align AI detection zones with the machine's physical sorting pockets."
      />

      <Card style={styles.card}>
        <View style={styles.statusRow}>
          <Ionicons
            name={connected ? 'checkmark-circle' : 'alert-circle'}
            size={22}
            color={connected ? theme.success : theme.warning}
          />
          <Text style={[styles.statusText, { color: theme.text }]}>{status}</Text>
        </View>
        {!connected && (
          <BrownButton
            title={loading ? 'Connecting…' : 'Connect & Capture Frame'}
            onPress={handleConnect}
            disabled={loading}
          />
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Camera Frame</Text>
          {connected && (
            <TouchableOpacity onPress={handleRefreshFrame}>
              <Ionicons name="refresh-outline" size={20} color={Palette.chocolate} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.previewBox}>
          {frameUri ? (
            <Image source={{ uri: frameUri }} style={styles.frameImage} resizeMode="cover" />
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons name="camera-outline" size={32} color="#c9b3a4" />
              <Text style={styles.previewEmptyText}>No camera frame yet</Text>
            </View>
          )}
          {rois.map((roi, i) => (
            <View
              key={i}
              style={[
                styles.roiBox,
                {
                  left: `${(roi.x / 1024) * 100}%`,
                  top: `${(roi.y / 559) * 100}%`,
                  width: `${(roi.w / 1024) * 100}%`,
                  height: `${(roi.h / 559) * 100}%`,
                  borderColor: i === selectedPocket ? Palette.green : `${Palette.green}88`,
                  borderWidth: i === selectedPocket ? 2 : 1,
                },
              ]}
            >
              <Text style={styles.roiLabel}>{POCKET_LABELS[i]}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>ROI Pocket Selection</Text>
        <View style={styles.tabRow}>
          {POCKET_LABELS.map((label, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.tab, selectedPocket === i && styles.tabActive]}
              onPress={() => setSelectedPocket(i)}
            >
              <Text style={[styles.tabText, selectedPocket === i && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.controlLabel}>Nudge Position</Text>
        <View style={styles.dpadContainer}>
          <TouchableOpacity style={styles.dpadBtn} onPress={() => nudge('up')}>
            <Ionicons name="arrow-up" size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.dpadMiddleRow}>
            <TouchableOpacity style={styles.dpadBtn} onPress={() => nudge('left')}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.dpadCenter}>
              <Text style={styles.dpadCenterText}>{POCKET_LABELS[selectedPocket]}</Text>
            </View>
            <TouchableOpacity style={styles.dpadBtn} onPress={() => nudge('right')}>
              <Ionicons name="arrow-forward" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.dpadBtn} onPress={() => nudge('down')}>
            <Ionicons name="arrow-down" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.controlLabel}>Scale Size</Text>
        <View style={styles.scaleRow}>
          <TouchableOpacity style={styles.dpadBtn} onPress={() => scale(-SCALE_STEP)}>
            <Ionicons name="remove" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.scaleValue}>
            {rois[selectedPocket].w} × {rois[selectedPocket].h}
          </Text>
          <TouchableOpacity style={styles.dpadBtn} onPress={() => scale(SCALE_STEP)}>
            <Ionicons name="add" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </Card>

      <BrownButton
        title={saving ? 'Saving…' : 'Save Calibration to Cloud'}
        onPress={handleSaveToCloud}
        disabled={saving}
        icon="cloud-upload-outline"
      />
      {saveStatus && (
        <Text
          style={[
            styles.saveStatusText,
            { color: saveStatus.includes('Failed') ? theme.danger : theme.success },
          ]}
        >
          {saveStatus}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['2xl'] },
  card: { marginTop: Spacing.md, padding: Spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Palette.brownText,
    marginBottom: Spacing.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  statusText: { fontSize: 14, fontFamily: Typography.fontFamily.medium, flex: 1 },
  previewBox: {
    aspectRatio: 1024 / 559,
    width: '100%',
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#241812',
    position: 'relative',
  },
  frameImage: { width: '100%', height: '100%' },
  previewEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewEmptyText: { color: '#bda99b', fontSize: 13, fontFamily: Typography.fontFamily.medium },
  roiBox: {
    position: 'absolute',
    borderStyle: 'solid',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  roiLabel: { color: Palette.green, fontSize: 9, fontFamily: Typography.fontFamily.bold },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.iconBg,
  },
  tabActive: { backgroundColor: Palette.chocolate },
  tabText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Palette.muted,
  },
  tabTextActive: { color: '#fff' },
  controlLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    color: Palette.muted,
  },
  dpadContainer: { alignItems: 'center', marginBottom: Spacing.lg },
  dpadMiddleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dpadBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.borderWarm,
    backgroundColor: Palette.creamField,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenter: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.iconBg,
  },
  dpadCenterText: {
    fontSize: 10,
    color: Palette.muted,
    fontFamily: Typography.fontFamily.medium,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  scaleValue: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    minWidth: 80,
    textAlign: 'center',
    color: Palette.brownText,
  },
  saveStatusText: {
    textAlign: 'center',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    marginTop: Spacing.sm,
  },
});
