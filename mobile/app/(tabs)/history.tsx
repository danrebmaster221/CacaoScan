import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBatchHistory } from '@/hooks/use-batch-history';
import type { Batch } from '@/hooks/use-batch-controller';
import { formatTime } from '@/hooks/use-batch-controller';

// ─── Batch Card ──────────────────────────────────────────────────────────
function BatchCard({ batch, theme }: { batch: Batch; theme: typeof Colors.light }) {
  const total = batch.criollo_count + batch.forastero_count + batch.trinitario_count;
  const exportPct = total > 0 ? Math.round((batch.export_grade_count / total) * 100) : 0;
  const date = batch.completed_at
    ? new Date(batch.completed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  return (
    <Animated.View
      entering={FadeInDown.delay(100)}
      style={[styles.batchCard, { backgroundColor: theme.surface }, Shadows.sm]}
    >
      {/* Header Row */}
      <View style={styles.batchHeader}>
        <View>
          <Text style={[styles.batchDate, { color: theme.text }]}>{date}</Text>
          <Text style={[styles.batchHarvest, { color: theme.textSecondary }]}>
            Harvest: {batch.harvest_date}
          </Text>
        </View>
        <View style={[styles.exportBadge, { backgroundColor: exportPct >= 70 ? theme.successBg : exportPct >= 40 ? theme.warningBg : theme.dangerBg }]}>
          <Text style={[styles.exportText, { color: exportPct >= 70 ? theme.success : exportPct >= 40 ? theme.warning : theme.danger }]}>
            {exportPct}% Export
          </Text>
        </View>
      </View>

      {/* Variety Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statItemValue, { color: '#8D6E63' }]}>{batch.criollo_count}</Text>
          <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>Criollo</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statItemValue, { color: '#5D4037' }]}>{batch.forastero_count}</Text>
          <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>Forastero</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statItemValue, { color: theme.accent }]}>{batch.trinitario_count}</Text>
          <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>Trinitario</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.batchFooter, { borderTopColor: theme.border }]}>
        <Text style={[styles.footerStat, { color: theme.textSecondary }]}>
          🫘 {total} beans
        </Text>
        <Text style={[styles.footerStat, { color: theme.textSecondary }]}>
          ⏱ {formatTime(batch.duration_seconds)}
        </Text>
        <Text style={[styles.footerStat, { color: theme.textSecondary }]}>
          ⚡ {batch.duration_seconds > 0 ? Math.round((total / batch.duration_seconds) * 60) : 0}/min
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Main History Screen ──────────────────────────────────────────────────
export default function HistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { batches, stats, isLoading, refresh } = useBatchHistory();

  const renderItem = useCallback(
    ({ item }: { item: Batch }) => <BatchCard batch={item} theme={theme} />,
    [theme]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Batch History</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          View past sorting sessions and analytics
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.summaryNumber, { color: theme.primary }]}>{stats.totalBatches}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total{'\n'}Batches</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.summaryNumber, { color: theme.success }]}>{stats.totalBeans}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Beans{'\n'}Sorted</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.summaryNumber, { color: theme.accent }]}>{stats.exportRate}%</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Export{'\n'}Rate</Text>
        </View>
      </View>

      {/* Batch List */}
      <FlatList
        data={batches}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: theme.surface }, Shadows.sm]}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Batches Yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Completed sorting sessions will appear here with variety breakdowns and export rates
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Spacing.xl, paddingBottom: Spacing.md, paddingHorizontal: Spacing.md },
  title: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold },
  subtitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, marginTop: Spacing.xs },

  // Summary
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  summaryCard: { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  summaryNumber: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold },
  summaryLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium, marginTop: Spacing.xs, textAlign: 'center' },

  // List
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['2xl'] },

  // Batch Card
  batchCard: { borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  batchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  batchDate: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold },
  batchHarvest: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  exportBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
  exportText: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.semiBold },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statItemValue: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold },
  statItemLabel: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium, marginTop: 2 },

  batchFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm },
  footerStat: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular },

  // Empty
  emptyState: { borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.semiBold, marginBottom: Spacing.xs },
  emptySubtitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, textAlign: 'center', lineHeight: 20 },
});
