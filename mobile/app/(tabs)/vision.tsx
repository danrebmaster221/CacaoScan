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

  const getCropStyle = () => {
    switch ((result.variety || 'criollo').toLowerCase()) {
      case 'criollo': return { transform: [{ scale: 3.8 }, { translateX: 15 }, { translateY: 0 }] };
      case 'trinitario': return { transform: [{ scale: 3.8 }, { translateX: -5 }, { translateY: -8 }] };
      case 'forastero': return { transform: [{ scale: 3.8 }, { translateX: -21 }, { translateY: -5 }] };
      default: return {};
    }
  };

  return (
    <View style={[
      styles.recentItem, 
      { 
        backgroundColor: theme.surface, 
        borderColor,
        borderWidth
      }
    ]}>
      <View style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', marginRight: Spacing.sm }}>
        <Image 
          source={result.imageUrl ? { uri: result.imageUrl } : require('../../assets/images/example_image.jpg')} 
          style={[{ width: '100%', height: '100%' }, getCropStyle()]}
        />
      </View>
      <View style={styles.recentInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.recentVariety, { color: theme.text }]}>
            {(result.variety || 'criollo').charAt(0).toUpperCase() + (result.variety || 'criollo').slice(1)}
          </Text>
          <Text style={[styles.recentTimestamp, { color: theme.textSecondary }]}>
             • {result.timestamp || 'Just now'}
          </Text>
        </View>
        <Text style={[styles.recentQuality, { color: qualityColor }]}>{qualityLabel}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        <Text style={[styles.recentConfidence, { color: theme.textSecondary, fontSize: 10 }]}>Variety: {Math.round(result.varietyConfidence * 100)}%</Text>
        <Text style={[styles.recentConfidence, { color: qualityColor, fontSize: 10 }]}>Quality: {Math.round(result.qualityConfidence * 100)}%</Text>
      </View>
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

  const mockCurrent = currentClassification || {
    variety: 'criollo', quality: 'export_grade', varietyConfidence: 0.98, qualityConfidence: 0.95 
  };
  
  const mockRecents = recentClassifications.length > 0 ? recentClassifications : [
    { id: 'm1', variety: 'criollo', quality: 'export_grade', varietyConfidence: 0.98, qualityConfidence: 0.95, timestamp: '10:42 AM' },
    { id: 'm2', variety: 'forastero', quality: 'rejected', varietyConfidence: 0.88, qualityConfidence: 0.99, timestamp: '10:41 AM' },
    { id: 'm3', variety: 'trinitario', quality: 'needs_drying', varietyConfidence: 0.92, qualityConfidence: 0.81, timestamp: '10:40 AM' },
  ];

  const mockBoxes = [
    { id: '1', top: '33%', left: '21%', width: 110, height: 180, variety: 'Criollo', confidence: 98, quality: 'export_grade' },
    { id: '2', top: '39%', left: '43%', width: 110, height: 150, variety: 'Trinitario', confidence: 92, quality: 'needs_drying' },
    { id: '3', top: '35%', left: '65.5%', width: 125, height: 165, variety: 'Forastero', confidence: 88, quality: 'rejected' },
  ];

  const [showBoxes, setShowBoxes] = React.useState(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>AI Vision</Text>
          <View style={[styles.connectionBadge, { backgroundColor: isConnected ? theme.successBg : theme.dangerBg }]}>
            <View style={[styles.connectionDot, { backgroundColor: isConnected ? theme.success : theme.danger }]} />
            <Text style={[styles.connectionText, { color: isConnected ? theme.success : theme.danger }]}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Camera Feed Area */}
        <View style={{ marginBottom: Spacing.md }}>
          <View style={[styles.cameraContainer, { backgroundColor: colorScheme === 'dark' ? '#1A1210' : '#2C1F1A' }]}>
            <View style={styles.cameraFeed}>
              {/* Simulated Feed Video/Image */}
              <Image 
                source={require('../../assets/images/example_image.jpg')} 
                style={{ width: '100%', height: '100%', opacity: 0.5 }} 
                resizeMode="cover"
              />
              <BlinkingLiveIndicator />

              {/* Bounding Box Overlays */}
              {showBoxes && mockBoxes.map(box => (
                <View 
                  key={box.id}
                  style={[
                    styles.mockBoundingBoxBase, 
                    { 
                      top: box.top as any, 
                      left: box.left as any, 
                      width: box.width, 
                      height: box.height,
                      borderColor: box.quality === 'rejected' ? theme.danger : box.quality === 'needs_drying' ? theme.warning : theme.success
                    }
                  ]}
                >
                  <View style={[styles.overlayBadge, { backgroundColor: box.quality === 'rejected' ? theme.danger : box.quality === 'needs_drying' ? theme.warning : theme.success }]}>
                    <Text style={styles.overlayBadgeText}>
                      {box.variety} {box.confidence}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.toggleRow}>
            <Text style={{ color: theme.text, fontFamily: Typography.fontFamily.medium }}>Show AI Bounding Boxes</Text>
            <Switch value={showBoxes} onValueChange={setShowBoxes} trackColor={{ true: theme.primary, false: theme.border }} />
          </View>
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
              {(mockCurrent?.variety || 'criollo').charAt(0).toUpperCase() + (mockCurrent?.variety || 'criollo').slice(1)}
            </Text>
            <ConfidenceBar value={mockCurrent?.varietyConfidence || 0} color={theme.primary} />
            <Text style={[styles.modelConf, { color: theme.textSecondary }]}>
              {Math.round(mockCurrent.varietyConfidence * 100)}% confidence
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
                  color: mockCurrent?.quality === 'export_grade'
                      ? theme.success
                      : mockCurrent?.quality === 'needs_drying'
                      ? theme.warning
                      : theme.danger
                },
              ]}
            >
              {mockCurrent?.quality === 'export_grade' ? 'Export Grade' : mockCurrent?.quality === 'needs_drying' ? 'Needs Drying' : 'Rejected'}
            </Text>
            <ConfidenceBar
              value={mockCurrent?.qualityConfidence || 0}
              color={
                mockCurrent?.quality === 'export_grade'
                  ? theme.success
                  : mockCurrent?.quality === 'needs_drying'
                  ? theme.warning
                  : theme.danger
              }
            />
            <Text style={[styles.modelConf, { color: theme.textSecondary }]}>
              {Math.round((mockCurrent?.qualityConfidence || 0) * 100)}% confidence
            </Text>
          </Animated.View>
        </View>

        {/* Recent Classifications */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Classifications</Text>
        {mockRecents.map((item: any) => (
          <RecentClassificationItem key={item.id} result={item} theme={theme} />
        ))}
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

  // Toggle Row
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xs, marginTop: Spacing.sm },

  // Live Indicator
  liveIndicatorContainer: { position: 'absolute', top: Spacing.md, right: Spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F44336', marginRight: 6 },
  liveText: { color: '#FFF', fontSize: 10, fontFamily: Typography.fontFamily.bold, letterSpacing: 1 },

  // Mock Bounding Box Base
  mockBoundingBoxBase: { position: 'absolute', borderWidth: 2, borderRadius: 4 },
  
  recentImage: { width: 44, height: 44, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.1)' },
  recentTimestamp: { fontSize: Typography.fontSize.xs },
});
