import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, Palette, ClassColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useESP32Connection, ClassResult } from '@/hooks/use-esp32-connection';
import { promptConnectScanner } from '@/context/ESP32Context';
import { useBatchController } from '@/hooks/use-batch-controller';
import { isExportClass, labelForClass } from '@/utils/classification';

function BlinkingLiveIndicator() {
  const opacity = useSharedValue(1);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 700, easing: Easing.linear }),
        withTiming(1, { duration: 700, easing: Easing.linear })
      ),
      -1,
      true
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={styles.liveBadge}>
      <Animated.View style={[styles.liveDot, animatedStyle]} />
      <Text style={styles.liveBadgeText}>LIVE</Text>
    </View>
  );
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
    isConnecting,
    serverHost,
    connect,
    enableDemoMode,
    currentClassification,
    recentClassifications,
  } = useESP32Connection(activeBatch?.id);
  const [showBoxes, setShowBoxes] = React.useState(true);

  const live = isConnected && activeBatch?.status === 'active';
  const cls = currentClassification?.operationalClass;
  const classColor = cls ? ClassColors[cls] : theme.textSecondary;

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
            <Text style={{ color: theme.textSecondary, marginTop: 4 }}>Single-pass YOLOv8n · edge inference</Text>
          </View>
          <View
            style={[
              styles.pill,
              {
                backgroundColor: !isConnected ? theme.dangerBg : live ? theme.dangerBg : theme.warningBg,
              },
            ]}
          >
            <View
              style={[
                styles.pillDot,
                { backgroundColor: !isConnected ? theme.danger : live ? theme.danger : theme.warning },
              ]}
            />
            <Text
              style={{
                color: !isConnected ? theme.danger : live ? theme.danger : theme.warning,
                fontFamily: Typography.fontFamily.semiBold,
                fontSize: 13,
              }}
            >
              {!isConnected ? 'Offline' : live ? 'Live' : 'Standby'}
            </Text>
          </View>
        </View>

        <View style={styles.feed}>
          {live ? (
            <View style={styles.feedLive}>
              <Text style={styles.feedHint}>Waiting for camera frames…</Text>
              <BlinkingLiveIndicator />
              {showBoxes && currentClassification && (
                <View style={[styles.bbox, { borderColor: classColor }]}>
                  <View style={[styles.bboxBadge, { backgroundColor: classColor }]}>
                    <Text style={styles.bboxBadgeText}>
                      {labelForClass(currentClassification.operationalClass)}{' '}
                      {Math.round((currentClassification.confidence || 0) * 100)}%
                    </Text>
                  </View>
                </View>
              )}
              <TouchableOpacity style={styles.boxToggle} onPress={() => setShowBoxes((b) => !b)}>
                <View style={[styles.pillDot, { backgroundColor: showBoxes ? theme.success : Palette.disabled }]} />
                <Text style={{ color: '#fff', fontSize: 12, fontFamily: Typography.fontFamily.semiBold }}>
                  Bounding Boxes {showBoxes ? 'On' : 'Off'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.feedEmpty}>
              <Text style={{ fontSize: 40 }}>📷</Text>
              <Text style={styles.feedEmptyTitle}>
                {!isConnected ? 'Camera link down' : 'Standby · model loaded'}
              </Text>
              <Text style={styles.feedEmptySub}>
                {!isConnected
                  ? `AI Server ${serverHost} unreachable. Connect to view the live feed.`
                  : 'YOLOv8n is loaded and ready. Start a session to begin live inference.'}
              </Text>
              {!isConnected && (
                <TouchableOpacity
                  style={styles.connectMachineBtn}
                  onPress={() => promptConnectScanner(connect, enableDemoMode, serverHost)}
                  disabled={isConnecting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.connectMachineText}>
                    {isConnecting ? 'Connecting…' : 'Connect to Machine'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {live && currentClassification ? (
          <View style={styles.detectRow}>
            <View style={[styles.detectCard, Shadows.sm, { borderColor: theme.border }]}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: Typography.fontFamily.semiBold }}>
                Detected Class
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <View style={[styles.pillDot, { backgroundColor: classColor }]} />
                <Text style={{ color: theme.text, fontSize: 20, fontFamily: Typography.fontFamily.bold }}>
                  {labelForClass(currentClassification.operationalClass)}
                </Text>
              </View>
              <View style={[styles.confTrack, { backgroundColor: Palette.iconBg }]}>
                <View
                  style={[
                    styles.confFill,
                    {
                      width: `${Math.round((currentClassification.confidence || 0) * 100)}%`,
                      backgroundColor: classColor,
                    },
                  ]}
                />
              </View>
              <Text style={{ marginTop: 6, color: theme.primary, fontFamily: Typography.fontFamily.semiBold, fontSize: 12 }}>
                {Math.round((currentClassification.confidence || 0) * 100)}%
              </Text>
            </View>
            <View style={[styles.detectCard, Shadows.sm, { borderColor: theme.border }]}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: Typography.fontFamily.semiBold }}>
                Target Gate
              </Text>
              <Text style={{ color: theme.text, fontSize: 20, fontFamily: Typography.fontFamily.bold, marginTop: 8 }}>
                Gate {currentClassification.gateActuated}
              </Text>
              <View style={[styles.gradePill, { backgroundColor: isExportClass(currentClassification.operationalClass) ? theme.successBg : theme.warningBg }]}>
                <Text
                  style={{
                    color: isExportClass(currentClassification.operationalClass) ? theme.success : theme.warning,
                    fontFamily: Typography.fontFamily.bold,
                    fontSize: 13,
                  }}
                >
                  {currentClassification.derivedGrade}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyDetect, Shadows.sm, { borderColor: theme.border }]}>
            <Text style={{ color: theme.textSecondary, textAlign: 'center', lineHeight: 22 }}>
              No active detection. Start a sorting session to see live class and gate results.
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
  feed: {
    marginTop: Spacing.md,
    height: 260,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#241812',
  },
  feedLive: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  feedHint: { color: '#FFF8F0', fontFamily: Typography.fontFamily.medium },
  feedEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  feedEmptyTitle: { color: '#fff', fontSize: 18, fontFamily: Typography.fontFamily.bold, marginTop: 12 },
  feedEmptySub: { color: '#bda99b', textAlign: 'center', marginTop: 8, lineHeight: 20, fontSize: 14 },
  connectMachineBtn: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  connectMachineText: {
    color: Palette.chocolateDeep,
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4d4d' },
  liveBadgeText: { color: '#fff', fontSize: 10, fontFamily: Typography.fontFamily.bold, letterSpacing: 1 },
  bbox: { position: 'absolute', top: '28%', left: '28%', width: '44%', height: '48%', borderWidth: 2, borderRadius: 4 },
  bboxBadge: { position: 'absolute', top: -22, left: 0, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  bboxBadgeText: { color: '#fff', fontSize: 11, fontFamily: Typography.fontFamily.bold },
  boxToggle: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
