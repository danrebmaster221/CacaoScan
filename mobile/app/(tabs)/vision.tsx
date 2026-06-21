import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useESP32Connection, ClassResult } from '@/hooks/use-esp32-connection';
import { useBatchController } from '@/hooks/use-batch-controller';

// ─── Classification Result Card ───────────────────────────────────────────
// Interface imported from use-esp32-connection

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.confidenceBarBg}>
      <View
        style={[
          styles.confidenceBarFill,
          { width: `${Math.round(value * 100)}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

function RecentClassificationItem({
  result,
  theme,
}: {
  result: ClassResult;
  theme: typeof Colors.light;
}) {
  const qualityColor =
    result.quality === 'export_grade'
      ? theme.success
      : result.quality === 'needs_drying'
      ? theme.warning
      : theme.danger;

  const qualityLabel =
    result.quality === 'export_grade'
      ? 'Export Grade'
      : result.quality === 'needs_drying'
      ? 'Needs Drying'
      : 'Rejected';

  return (
    <View style={[styles.recentItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.qualityDot, { backgroundColor: qualityColor }]} />
      <View style={styles.recentInfo}>
        <Text style={[styles.recentVariety, { color: theme.text }]}>
          {result.variety.charAt(0).toUpperCase() + result.variety.slice(1)}
        </Text>
        <Text style={[styles.recentQuality, { color: qualityColor }]}>{qualityLabel}</Text>
      </View>
      <Text style={[styles.recentConfidence, { color: theme.textSecondary }]}>
        {Math.round(result.qualityConfidence * 100)}%
      </Text>
    </View>
  );
}

// ─── Main Vision Screen ───────────────────────────────────────────────────
export default function VisionScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  const { activeBatch } = useBatchController();
  const { 
    isConnected, 
    currentClassification, 
    recentClassifications 
  } = useESP32Connection(activeBatch?.id);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>AI Vision</Text>
          <View style={[styles.connectionBadge, { backgroundColor: isConnected ? theme.successBg : theme.dangerBg }]}>
            <View style={[styles.connectionDot, { backgroundColor: isConnected ? theme.success : theme.danger }]} />
            <Text style={[styles.connectionText, { color: isConnected ? theme.success : theme.danger }]}>
              {isConnected ? 'Camera Online' : 'Camera Offline'}
            </Text>
          </View>
        </View>

        {/* Camera Feed Area */}
        <View style={[styles.cameraContainer, { backgroundColor: colorScheme === 'dark' ? '#1A1210' : '#2C1F1A' }]}>
          {isConnected ? (
            // Active camera feed would go here with bounding box overlay
            <View style={styles.cameraFeed}>
              <Text style={styles.feedText}>MJPEG Stream</Text>
            </View>
          ) : (
            // Offline placeholder
            <View style={styles.cameraOffline}>
              <Text style={styles.cameraEmoji}>📷</Text>
              <Text style={styles.cameraOfflineTitle}>Vision Feed</Text>
              <Text style={styles.cameraOfflineSubtitle}>
                Connect to the sorting machine to view the live AI camera feed
              </Text>
            </View>
          )}

          {/* Bounding Box Overlay Labels (shown when active) */}
          {currentClassification && (
            <View style={styles.overlayLabels}>
              <View style={[styles.overlayBadge, { backgroundColor: 'rgba(76,175,80,0.9)' }]}>
                <Text style={styles.overlayBadgeText}>
                  {currentClassification.variety} {Math.round(currentClassification.varietyConfidence * 100)}%
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Dual Model Classification Display */}
        <View style={styles.modelRow}>
          <Animated.View
            entering={FadeInDown.delay(100)}
            style={[styles.modelCard, { backgroundColor: theme.surface }, Shadows.sm]}
          >
            <Text style={[styles.modelLabel, { color: theme.textSecondary }]}>
              🔬 Model A — Variety
            </Text>
            <Text style={[styles.modelValue, { color: theme.text }]}>
              {currentClassification ? currentClassification.variety : '—'}
            </Text>
            {currentClassification && (
              <ConfidenceBar value={currentClassification.varietyConfidence} color={theme.primary} />
            )}
            <Text style={[styles.modelConf, { color: theme.textSecondary }]}>
              {currentClassification
                ? `${Math.round(currentClassification.varietyConfidence * 100)}% confidence`
                : 'Waiting for classification'}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200)}
            style={[styles.modelCard, { backgroundColor: theme.surface }, Shadows.sm]}
          >
            <Text style={[styles.modelLabel, { color: theme.textSecondary }]}>
              ⭐ Model B — Quality
            </Text>
            <Text
              style={[
                styles.modelValue,
                {
                  color: currentClassification
                    ? currentClassification.quality === 'export_grade'
                      ? theme.success
                      : currentClassification.quality === 'needs_drying'
                      ? theme.warning
                      : theme.danger
                    : theme.text,
                },
              ]}
            >
              {currentClassification
                ? currentClassification.quality === 'export_grade'
                  ? 'Export Grade'
                  : currentClassification.quality === 'needs_drying'
                  ? 'Needs Drying'
                  : 'Rejected'
                : '—'}
            </Text>
            {currentClassification && (
              <ConfidenceBar
                value={currentClassification.qualityConfidence}
                color={
                  currentClassification.quality === 'export_grade'
                    ? theme.success
                    : currentClassification.quality === 'needs_drying'
                    ? theme.warning
                    : theme.danger
                }
              />
            )}
            <Text style={[styles.modelConf, { color: theme.textSecondary }]}>
              {currentClassification
                ? `${Math.round(currentClassification.qualityConfidence * 100)}% confidence`
                : 'Waiting for classification'}
            </Text>
          </Animated.View>
        </View>

        {/* Recent Classifications */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Classifications</Text>
        {recentClassifications.length > 0 ? (
          recentClassifications.map((item) => (
            <RecentClassificationItem key={item.id} result={item} theme={theme} />
          ))
        ) : (
          <View style={[styles.emptyRecent, { backgroundColor: theme.surface }, Shadows.sm]}>
            <Text style={styles.emptyEmoji}>🫘</Text>
            <Text style={[styles.emptyRecentText, { color: theme.textSecondary }]}>
              Bean classifications will appear here during an active sorting session
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollPadding: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['2xl'] },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  connectionDot: { width: 8, height: 8, borderRadius: 4 },
  connectionText: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.semiBold },

  // Camera
  cameraContainer: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    height: 280,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  cameraFeed: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  feedText: { color: '#FFF8F0', fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.medium },
  cameraOffline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  cameraEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  cameraOfflineTitle: {
    color: '#FFF8F0',
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.xs,
  },
  cameraOfflineSubtitle: {
    color: 'rgba(255,248,240,0.6)',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  overlayLabels: { position: 'absolute', top: Spacing.sm, left: Spacing.sm },
  overlayBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  overlayBadgeText: { color: '#FFF', fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.semiBold },

  // Model Cards
  modelRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  modelCard: { flex: 1, borderRadius: Radius.md, padding: Spacing.md },
  modelLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.semiBold, marginBottom: Spacing.sm },
  modelValue: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, marginBottom: Spacing.sm },
  modelConf: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.regular, marginTop: Spacing.xs },

  // Confidence Bar
  confidenceBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: { height: 6, borderRadius: 3 },

  // Section
  sectionTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold, marginBottom: Spacing.sm },

  // Recent Classifications
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  qualityDot: { width: 12, height: 12, borderRadius: 6 },
  recentInfo: { flex: 1, marginLeft: Spacing.sm },
  recentVariety: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  recentQuality: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  recentConfidence: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.semiBold },

  // Empty
  emptyRecent: {
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 36, marginBottom: Spacing.sm },
  emptyRecentText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
});
