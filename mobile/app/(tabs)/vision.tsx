import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Switch,
} from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useESP32Connection, ClassResult } from '@/hooks/use-esp32-connection';
import { useBatchController } from '@/hooks/use-batch-controller';

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

function BlinkingLiveIndicator() {
  const opacity = useSharedValue(1);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 800, easing: Easing.linear }),
        withTiming(1, { duration: 800, easing: Easing.linear })
      ),
      -1,
      true
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.liveIndicatorContainer}>
      <Animated.View style={[styles.liveDot, animatedStyle]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

function RecentClassificationItem({
  result,
  theme,
}: {
  result: ClassResult & { timestamp?: string; imageUrl?: string };
  theme: typeof Colors.light;
}) {
  const isExport = result.quality === 'export_grade';
  const isRejected = result.quality === 'rejected';
  const isDrying = result.quality === 'needs_drying';

  const qualityColor = isExport
    ? theme.success
    : isRejected
    ? theme.danger
    : theme.warning;

  const qualityLabel = isExport
    ? 'Export Grade'
    : isRejected
    ? 'Rejected'
    : 'Needs Drying';

  const borderColor = isRejected ? theme.danger : isDrying ? theme.warning : theme.border;
  const borderWidth = (isRejected || isDrying) ? 1.5 : StyleSheet.hairlineWidth;

  return (
    <View style={[
      styles.recentItem,
      {
        backgroundColor: theme.surface,
        borderColor,
        borderWidth
      }
    ]}>
      <View style={styles.recentImagePlaceholder}>
        {result.imageUrl ? (
          <Image
            source={{ uri: result.imageUrl }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text style={{ fontSize: 18 }}>🫘</Text>
        )}
      </View>
      <View style={styles.recentInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.recentVariety, { color: theme.text }]}>
            {(result.variety || '—').charAt(0).toUpperCase() + (result.variety || '—').slice(1)}
          </Text>
          <Text style={[styles.recentTimestamp, { color: theme.textSecondary }]}>
             • {result.timestamp || 'Just now'}
          </Text>
        </View>
        <Text style={[styles.recentQuality, { color: qualityColor }]}>{qualityLabel}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        <Text style={[styles.recentConfidence, { color: theme.textSecondary, fontSize: 10 }]}>
          Variety: {Math.round((result.varietyConfidence || 0) * 100)}%
        </Text>
        <Text style={[styles.recentConfidence, { color: qualityColor, fontSize: 10 }]}>
          Quality: {Math.round((result.qualityConfidence || 0) * 100)}%
        </Text>
      </View>
    </View>
  );
}

export default function VisionScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { activeBatch } = useBatchController();
  const {
    isConnected,
    currentClassification,
    recentClassifications
  } = useESP32Connection(activeBatch?.id);

  const [showBoxes, setShowBoxes] = React.useState(true);

  const qualityLabel = currentClassification?.quality === 'export_grade'
    ? 'Export Grade'
    : currentClassification?.quality === 'needs_drying'
    ? 'Needs Drying'
    : currentClassification?.quality === 'rejected'
    ? 'Rejected'
    : '—';

  const qualityColor = currentClassification?.quality === 'export_grade'
    ? theme.success
    : currentClassification?.quality === 'needs_drying'
    ? theme.warning
    : currentClassification?.quality === 'rejected'
    ? theme.danger
    : theme.textSecondary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>AI Vision</Text>
          <View style={[styles.connectionBadge, { backgroundColor: isConnected ? theme.successBg : theme.dangerBg }]}>
            <View style={[styles.connectionDot, { backgroundColor: isConnected ? theme.success : theme.danger }]} />
            <Text style={[styles.connectionText, { color: isConnected ? theme.success : theme.danger }]}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={{ marginBottom: Spacing.md }}>
          <View style={[styles.cameraContainer, { backgroundColor: colorScheme === 'dark' ? '#1A1210' : '#2C1F1A' }]}>
            {isConnected ? (
              <View style={styles.cameraFeed}>
                <Text style={styles.feedText}>Waiting for camera frames…</Text>
                <BlinkingLiveIndicator />
                {showBoxes && currentClassification && (
                  <View style={[styles.boundingBoxBase, { borderColor: qualityColor }]}>
                    <View style={[styles.overlayBadge, { backgroundColor: qualityColor }]}>
                      <Text style={styles.overlayBadgeText}>
                        {(currentClassification.variety || '').charAt(0).toUpperCase()
                          + (currentClassification.variety || '').slice(1)}{' '}
                        {Math.round((currentClassification.varietyConfidence || 0) * 100)}%
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.cameraOffline}>
                <Text style={styles.cameraEmoji}>📷</Text>
                <Text style={styles.cameraOfflineTitle}>Vision monitoring unavailable</Text>
                <Text style={styles.cameraOfflineSubtitle}>
                  Connect to the machine to view the live feed. Sorting continues independently of this screen.
                </Text>
              </View>
            )}
          </View>
          <View style={styles.toggleRow}>
            <Text style={{ color: theme.text, fontFamily: Typography.fontFamily.medium }}>Show AI Bounding Boxes</Text>
            <Switch value={showBoxes} onValueChange={setShowBoxes} trackColor={{ true: theme.primary, false: theme.border }} />
          </View>
        </View>

        <View style={styles.modelRow}>
          <Animated.View
            entering={FadeInDown.delay(100)}
            style={[styles.modelCard, { backgroundColor: theme.surface }, Shadows.sm]}
          >
            <Text style={[styles.modelLabel, { color: theme.textSecondary }]}>
              🔬 Model A — Variety
            </Text>
            <Text style={[styles.modelValue, { color: theme.text }]}>
              {currentClassification
                ? (currentClassification.variety || '—').charAt(0).toUpperCase()
                  + (currentClassification.variety || '—').slice(1)
                : '—'}
            </Text>
            <ConfidenceBar value={currentClassification?.varietyConfidence || 0} color={theme.primary} />
            <Text style={[styles.modelConf, { color: theme.textSecondary }]}>
              {currentClassification
                ? `${Math.round((currentClassification.varietyConfidence || 0) * 100)}% confidence`
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
            <Text style={[styles.modelValue, { color: qualityColor }]}>
              {qualityLabel}
            </Text>
            <ConfidenceBar
              value={currentClassification?.qualityConfidence || 0}
              color={qualityColor}
            />
            <Text style={[styles.modelConf, { color: theme.textSecondary }]}>
              {currentClassification
                ? `${Math.round((currentClassification.qualityConfidence || 0) * 100)}% confidence`
                : 'Waiting for classification'}
            </Text>
          </Animated.View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Classifications</Text>
        {recentClassifications.length > 0 ? (
          recentClassifications.map((item) => (
            <RecentClassificationItem key={item.id} result={item} theme={theme} />
          ))
        ) : (
          <View style={[styles.emptyRecent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyRecentText, { color: theme.textSecondary }]}>
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
  scrollPadding: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['2xl'] },

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
  overlayBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  overlayBadgeText: { color: '#FFF', fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.semiBold },

  modelRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  modelCard: { flex: 1, borderRadius: Radius.md, padding: Spacing.md },
  modelLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.semiBold, marginBottom: Spacing.sm },
  modelValue: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, marginBottom: Spacing.sm },
  modelConf: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.regular, marginTop: Spacing.xs },

  confidenceBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: { height: 6, borderRadius: 3 },

  sectionTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold, marginBottom: Spacing.sm },

  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recentInfo: { flex: 1, marginLeft: Spacing.sm },
  recentVariety: { fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.medium },
  recentQuality: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  recentConfidence: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.semiBold },
  recentImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recentTimestamp: { fontSize: Typography.fontSize.xs },

  emptyRecent: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyRecentText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
  },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xs, marginTop: Spacing.sm },

  liveIndicatorContainer: { position: 'absolute', top: Spacing.md, right: Spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F44336', marginRight: 6 },
  liveText: { color: '#FFF', fontSize: 10, fontFamily: Typography.fontFamily.bold, letterSpacing: 1 },

  boundingBoxBase: {
    position: 'absolute',
    top: '28%',
    left: '28%',
    width: '44%',
    height: '48%',
    borderWidth: 2,
    borderRadius: 4,
  },
});
