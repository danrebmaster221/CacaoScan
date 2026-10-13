import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  AppState,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, ClassColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useESP32Connection, ClassResult } from '@/hooks/use-esp32-connection';
import { useBatchController } from '@/hooks/use-batch-controller';
import {
  derivedGradeForClass,
  gateForClass,
  labelForClass,
  OPERATIONAL_CLASSES,
  type OperationalClass,
} from '@/utils/classification';

const FRAME_INTERVAL_MS = 1000;
const FRAME_TIMEOUT_MS = 2000;
const FLASH_MS = 1500;

type DetectionMeta = {
  version: number;
  bean_id: number | null;
  operational_class: string;
  confidence: number | null;
  has_annotated_frame: boolean;
};

function isOperationalClass(value: string): value is OperationalClass {
  return (OPERATIONAL_CLASSES as readonly string[]).includes(value);
}

function encodeBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return globalThis.btoa(binary);
}

function RecentItem({ result, theme }: { result: ClassResult; theme: typeof Colors.light }) {
  const color = ClassColors[result.operationalClass] || theme.primary;
  return (
    <View style={[styles.recentRow, { borderBottomColor: '#f2ece5' }]}>
      <View style={[styles.recentSwatch, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.recentTitle, { color: theme.text }]}>{labelForClass(result.operationalClass)}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
          Gate {result.gateActuated} · {result.derivedGrade}
        </Text>
      </View>
      <Text style={{ color: theme.primary, fontFamily: Typography.fontFamily.bold }}>
        {Math.round((result.confidence || 0) * 100)}%
      </Text>
    </View>
  );
}

export default function VisionScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { activeBatch } = useBatchController();
  const {
    isConnected,
    serverHost,
    recentClassifications,
  } = useESP32Connection(activeBatch?.id);
  const [shownUri, setShownUri] = useState<string | null>(null);
  const [cameraPhase, setCameraPhase] = useState<'online' | 'stalled' | 'unavailable'>('unavailable');
  const [detection, setDetection] = useState<DetectionMeta | null>(null);
  const [annotatedUri, setAnnotatedUri] = useState<string | null>(null);
  const [flashUri, setFlashUri] = useState<string | null>(null);
  const shownRef = useRef(false);
  const shownVersionRef = useRef<number | null>(null);
  const baselineReadyRef = useRef(false);
  const hostSeenRef = useRef(serverHost);
  const flashTokenRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusedRef = useRef(false);
  const inFlightRef = useRef(false);
  const generationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearFlash = useCallback(() => {
    flashTokenRef.current += 1;
    if (flashTimerRef.current != null) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    setFlashUri(null);
  }, []);

  const startFlash = useCallback((uri: string) => {
    flashTokenRef.current += 1;
    const token = flashTokenRef.current;
    if (flashTimerRef.current != null) clearTimeout(flashTimerRef.current);
    setFlashUri(uri);
    flashTimerRef.current = setTimeout(() => {
      if (flashTokenRef.current !== token) return;
      flashTimerRef.current = null;
      setFlashUri(null);
    }, FLASH_MS);
  }, []);

  const stopFrameTimer = useCallback(() => {
    generationRef.current += 1;
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    clearFlash();
  }, [clearFlash]);

  const startFrameTimer = useCallback(() => {
    stopFrameTimer();
    if (hostSeenRef.current !== serverHost) {
      hostSeenRef.current = serverHost;
      shownVersionRef.current = null;
      setDetection(null);
      setAnnotatedUri(null);
    }
    baselineReadyRef.current = false;
    if (!focusedRef.current || AppState.currentState !== 'active') return;
    const host = serverHost.trim();
    const generation = generationRef.current;
    if (!host) {
      setCameraPhase(shownRef.current ? 'stalled' : 'unavailable');
      return;
    }
    const tick = async () => {
      if (generation !== generationRef.current || inFlightRef.current) return;
      inFlightRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), FRAME_TIMEOUT_MS);
      try {
        try {
          const response = await fetch(`http://${host}:5000/vision/frame?t=${Date.now()}`, {
            signal: controller.signal,
          });
          if (generation !== generationRef.current) return;
          if (!response.ok) throw new Error('frame');
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (generation !== generationRef.current) return;
          shownRef.current = true;
          setShownUri(`data:image/jpeg;base64,${encodeBase64(bytes)}`);
          setCameraPhase('online');
        } catch {
          if (generation !== generationRef.current || !focusedRef.current) return;
          setCameraPhase(shownRef.current ? 'stalled' : 'unavailable');
        }

        if (generation !== generationRef.current || controller.signal.aborted) return;

        const metaResponse = await fetch(`http://${host}:5000/vision/last-classification?t=${Date.now()}`, {
          signal: controller.signal,
        });
        if (generation !== generationRef.current) return;
        if (metaResponse.status === 404) {
          baselineReadyRef.current = true;
          shownVersionRef.current = null;
          setDetection(null);
          setAnnotatedUri(null);
          clearFlash();
          return;
        }
        if (!metaResponse.ok) return;
        const meta = (await metaResponse.json()) as DetectionMeta;
        if (generation !== generationRef.current) return;
        if (meta.operational_class === 'EMPTY' || !meta.has_annotated_frame) {
          baselineReadyRef.current = true;
          shownVersionRef.current = meta.version;
          setDetection(null);
          setAnnotatedUri(null);
          clearFlash();
          return;
        }
        if (shownVersionRef.current === meta.version) {
          baselineReadyRef.current = true;
          return;
        }
        const imageResponse = await fetch(
          `http://${host}:5000/vision/annotated?version=${meta.version}`,
          { signal: controller.signal },
        );
        if (generation !== generationRef.current) return;
        if (imageResponse.status === 404) return;
        if (!imageResponse.ok) return;
        const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
        if (generation !== generationRef.current) return;
        const allowFlash = baselineReadyRef.current;
        const annotated = `data:image/jpeg;base64,${encodeBase64(imageBytes)}`;
        shownVersionRef.current = meta.version;
        baselineReadyRef.current = true;
        setDetection(meta);
        setAnnotatedUri(annotated);
        if (allowFlash) startFlash(annotated);
      } catch {
        if (generation !== generationRef.current || !focusedRef.current) return;
      } finally {
        clearTimeout(timeout);
        if (generation === generationRef.current) {
          if (abortRef.current === controller) abortRef.current = null;
          inFlightRef.current = false;
        }
      }
    };
    void tick();
    timerRef.current = setInterval(() => {
      void tick();
    }, FRAME_INTERVAL_MS);
  }, [serverHost, stopFrameTimer, clearFlash, startFlash]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      startFrameTimer();
      return () => {
        focusedRef.current = false;
        stopFrameTimer();
      };
    }, [startFrameTimer, stopFrameTimer]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') startFrameTimer();
      else stopFrameTimer();
    });
    return () => {
      sub.remove();
      stopFrameTimer();
    };
  }, [startFrameTimer, stopFrameTimer]);

  const live = isConnected && activeBatch?.status === 'active';
  const machineLabel = !isConnected ? 'Machine: Offline' : live ? 'Machine: Live' : 'Machine: Standby';
  const detectionClass = detection && isOperationalClass(detection.operational_class)
    ? detection.operational_class
    : null;

  const tally = [
    activeBatch?.criollo_count || 0,
    activeBatch?.forastero_count || 0,
    activeBatch?.trinitario_count || 0,
    activeBatch?.needs_drying_count || 0,
    activeBatch?.rejected_count || 0,
  ];
  const labels = ['Criollo', 'Forastero', 'Trinitario', 'Needs Drying', 'Rejected'];
  const colors = [
    ClassColors.Criollo,
    ClassColors.Forastero,
    ClassColors.Trinitario,
    ClassColors.Needs_Drying,
    ClassColors.Rejected,
  ];

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>AI Vision</Text>
            <Text style={{ color: theme.textSecondary, marginTop: 4 }}>OV3660 preview · laptop edge</Text>
          </View>
          <View
            style={[
              styles.pill,
              {
                backgroundColor: !isConnected ? theme.dangerBg : live ? theme.successBg : theme.warningBg,
              },
            ]}
          >
            <View
              style={[
                styles.pillDot,
                { backgroundColor: !isConnected ? theme.danger : live ? theme.success : theme.warning },
              ]}
            />
            <Text
              style={{
                color: !isConnected ? theme.danger : live ? theme.success : theme.warning,
                fontFamily: Typography.fontFamily.semiBold,
                fontSize: 13,
              }}
            >
              {machineLabel}
            </Text>
          </View>
        </View>

        <View style={styles.feed}>
          {flashUri ? (
            <Image
              key={detection?.version ?? 'flash'}
              source={{ uri: flashUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="none"
            />
          ) : shownUri ? (
            <Image
              source={{ uri: shownUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="none"
            />
          ) : null}
          {cameraPhase === 'unavailable' ? (
            <View style={styles.feedEmpty}>
              <Text style={styles.feedEmptyTitle}>Camera unavailable</Text>
            </View>
          ) : null}
          {cameraPhase === 'online' ? (
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeText}>Camera: Online</Text>
            </View>
          ) : null}
          {cameraPhase === 'stalled' ? (
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeText}>Frame stalled</Text>
            </View>
          ) : null}
          {flashUri ? (
            <View style={styles.detectionBadge}>
              <Text style={styles.cameraBadgeText}>Detection</Text>
            </View>
          ) : null}
        </View>

        {detection && annotatedUri && detectionClass ? (
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {isConnected ? 'Latest Detection' : 'Last Detection'}
          </Text>
        ) : null}
        {detection && annotatedUri && detectionClass ? (
          <View>
            <View style={styles.snapshot}>
              <Image
                source={{ uri: annotatedUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="none"
              />
            </View>
            <Text style={{ color: theme.textSecondary, marginTop: 8, fontFamily: Typography.fontFamily.semiBold }}>
              {detection.bean_id != null ? `Bean #${detection.bean_id} · ` : ''}
              Gate {gateForClass(detectionClass)} · {derivedGradeForClass(detectionClass)}
            </Text>
          </View>
        ) : (
          <View style={[styles.emptyDetect, Shadows.sm, { borderColor: theme.border }]}>
            <Text style={{ color: theme.textSecondary, textAlign: 'center', lineHeight: 22 }}>
              No active detection
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Session Tally</Text>
        <View style={styles.tallyGrid}>
          {labels.map((label, i) => (
            <View key={label} style={[styles.tallyCell, Shadows.sm, { borderColor: theme.border }]}>
              <View style={[styles.pillDot, { backgroundColor: colors[i], marginBottom: 6 }]} />
              <Text style={{ fontSize: 18, fontFamily: Typography.fontFamily.bold, color: theme.text }}>
                {live || activeBatch ? tally[i] : 0}
              </Text>
              <Text style={{ fontSize: 10, color: theme.textSecondary, textAlign: 'center', marginTop: 4 }}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Classifications</Text>
        {recentClassifications.length > 0 ? (
          <Animated.View
            entering={FadeInDown}
            style={[styles.recentCard, Shadows.sm, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            {recentClassifications.map((item) => (
              <RecentItem key={item.id} result={item} theme={theme} />
            ))}
          </Animated.View>
        ) : (
          <View style={[styles.emptyDetect, Shadows.sm, { borderColor: theme.border }]}>
            <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
              No classifications yet. Results appear here when the machine detects and sorts beans.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 110,
    paddingTop: Spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 26, fontFamily: Typography.fontFamily.bold },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 6 },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  snapshot: {
    height: 220,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#241812',
  },
  feed: {
    marginTop: Spacing.md,
    height: 260,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#241812',
  },
  feedEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  feedEmptyTitle: { color: '#fff', fontSize: 18, fontFamily: Typography.fontFamily.bold, textAlign: 'center' },
  cameraBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cameraBadgeText: { color: '#fff', fontSize: 12, fontFamily: Typography.fontFamily.bold },
  detectionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  detectRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
  detectCard: { flex: 1, borderRadius: Radius.lg, borderWidth: 1, backgroundColor: '#fff', padding: Spacing.md },
  confTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12 },
  confFill: { height: '100%', borderRadius: 4 },
  gradePill: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  emptyDetect: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: '#fff',
    padding: Spacing.lg,
  },
  sectionTitle: { marginTop: Spacing.xl, fontSize: 20, fontFamily: Typography.fontFamily.bold, marginBottom: Spacing.sm },
  tallyGrid: { flexDirection: 'row', gap: 6 },
  tallyCell: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    alignItems: 'center',
  },
  recentCard: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentSwatch: { width: 32, height: 32, borderRadius: 8 },
  recentTitle: { fontSize: 15, fontFamily: Typography.fontFamily.bold },
});
