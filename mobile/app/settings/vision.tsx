import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';

const ESP32_DEFAULT_IP = '192.168.4.1';

interface ROIBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_ROIS: ROIBox[] = [
  { x: 40, y: 60, w: 80, h: 120 },   // Left pocket
  { x: 180, y: 60, w: 80, h: 120 },   // Center pocket
  { x: 320, y: 60, w: 80, h: 120 },   // Right pocket
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
      const res = await fetch(`http://${ESP32_DEFAULT_IP}/capture`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const blob = await res.blob();
        const uri = URL.createObjectURL(blob);
        setFrameUri(uri);
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
      const res = await fetch(`http://${ESP32_DEFAULT_IP}/capture`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const blob = await res.blob();
        setFrameUri(URL.createObjectURL(blob));
      }
    } catch {
      // Keep existing frame
    }
  };

  const nudge = (dir: 'up' | 'down' | 'left' | 'right') => {
    setRois(prev => {
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
    setRois(prev => {
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
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Vision Calibration', headerShadowVisible: false }} />
      <View style={styles.container}>

        {/* Connection */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.statusRow}>
            <Ionicons name={connected ? 'checkmark-circle' : 'alert-circle'} size={24} color={connected ? theme.success : theme.warning} />
            <Text style={[styles.statusText, { color: theme.text }]}>{status}</Text>
          </View>
          {!connected && (
            <TouchableOpacity style={[styles.connectBtn, { backgroundColor: theme.primary }]} onPress={handleConnect} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.connectBtnText}>Connect &amp; Capture Frame</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Live Frame Preview with ROI Overlays */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Camera Frame</Text>
            {connected && (
              <TouchableOpacity onPress={handleRefreshFrame}>
                <Ionicons name="refresh-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.previewBox, { backgroundColor: '#1a1a1a', borderColor: theme.border }]}>
            {frameUri ? (
              <View style={{ width: '100%', height: '100%' }}>
                <Image source={{ uri: frameUri }} style={styles.frameImage} resizeMode="contain" />
                {/* ROI Overlay Boxes */}
                {rois.map((roi, i) => (
                  <View
                    key={i}
                    style={[
                      styles.roiBox,
                      {
                        left: roi.x * 0.5,
                        top: roi.y * 0.5,
                        width: roi.w * 0.5,
                        height: roi.h * 0.5,
                        borderColor: i === selectedPocket ? '#00FF00' : '#00FF0080',
                        borderWidth: i === selectedPocket ? 2 : 1,
                        backgroundColor: i === selectedPocket ? '#00FF0015' : '#00FF0008',
                      },
                    ]}
                  >
                    <Text style={styles.roiLabel}>{POCKET_LABELS[i]}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="videocam-off-outline" size={48} color="#666" />
                <Text style={{ color: '#999', marginTop: Spacing.sm, fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm }}>
                  Connect to scanner to capture frame
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Pocket Selector Tabs */}
        <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>ROI Pocket Selection</Text>
          <View style={styles.tabRow}>
            {POCKET_LABELS.map((label, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.tab, selectedPocket === i && { backgroundColor: theme.primary }]}
                onPress={() => setSelectedPocket(i)}
              >
                <Text style={[styles.tabText, { color: selectedPocket === i ? '#FFF8F0' : theme.textSecondary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* D-Pad Nudge Controls */}
          <Text style={[styles.controlLabel, { color: theme.textSecondary }]}>Nudge Position</Text>
          <View style={styles.dpadContainer}>
            <TouchableOpacity style={[styles.dpadBtn, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => nudge('up')}>
              <Ionicons name="arrow-up" size={20} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.dpadMiddleRow}>
              <TouchableOpacity style={[styles.dpadBtn, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => nudge('left')}>
                <Ionicons name="arrow-back" size={20} color={theme.text} />
              </TouchableOpacity>
              <View style={[styles.dpadCenter, { backgroundColor: theme.border }]}>
                <Text style={{ fontSize: 10, color: theme.textSecondary, fontFamily: Typography.fontFamily.medium }}>{POCKET_LABELS[selectedPocket]}</Text>
              </View>
              <TouchableOpacity style={[styles.dpadBtn, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => nudge('right')}>
                <Ionicons name="arrow-forward" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.dpadBtn, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => nudge('down')}>
              <Ionicons name="arrow-down" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Scale Controls */}
          <Text style={[styles.controlLabel, { color: theme.textSecondary }]}>Scale Size</Text>
          <View style={styles.scaleRow}>
            <TouchableOpacity style={[styles.scaleBtn, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => scale(-SCALE_STEP)}>
              <Ionicons name="remove" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.scaleValue, { color: theme.text }]}>{rois[selectedPocket].w} × {rois[selectedPocket].h}</Text>
            <TouchableOpacity style={[styles.scaleBtn, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => scale(SCALE_STEP)}>
              <Ionicons name="add" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Save to Cloud */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveToCloud} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFF8F0" />
              <Text style={styles.saveBtnText}>Save Calibration to Cloud</Text>
            </View>
          )}
        </TouchableOpacity>
        {saveStatus && (
          <Text style={[styles.saveStatusText, { color: saveStatus.includes('Failed') ? theme.danger : theme.success }]}>{saveStatus}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  statusText: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, flex: 1 },
  connectBtn: { height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  connectBtnText: { color: '#FFF8F0', fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.sm },
  previewBox: { height: 220, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  frameImage: { width: '100%', height: '100%' },
  roiBox: { position: 'absolute', borderStyle: 'solid', borderRadius: 2, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  roiLabel: { color: '#00FF00', fontSize: 9, fontFamily: Typography.fontFamily.bold },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  tab: { flex: 1, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0E6D9' },
  tabText: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.sm },
  controlLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.semiBold, letterSpacing: 1, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  dpadContainer: { alignItems: 'center', marginBottom: Spacing.lg },
  dpadMiddleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dpadBtn: { width: 48, height: 48, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dpadCenter: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  scaleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.md },
  scaleBtn: { width: 48, height: 48, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scaleValue: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold, minWidth: 80, textAlign: 'center' },
  saveBtn: { height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  saveBtnText: { color: '#FFF8F0', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold },
  saveStatusText: { textAlign: 'center', fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium, marginBottom: Spacing.xl },
});
