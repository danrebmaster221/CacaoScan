import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows, Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHistoryAnalytics } from '@/hooks/use-history-analytics';
import type { Batch } from '@/hooks/use-batch-controller';
import { formatTime } from '@/hooks/use-batch-controller';
import { router } from 'expo-router';

function gradeOf(exportRate: number) {
  if (exportRate >= 85) {
    return { label: 'Export', bg: Palette.greenBg, text: Palette.green, dot: Palette.green };
  }
  if (exportRate >= 65) {
    return { label: 'Standard', bg: Palette.goldBg, text: '#c9832a', dot: Palette.gold };
  }
  return { label: 'Below Grade', bg: Palette.dangerBg, text: Palette.danger, dot: Palette.danger };
}

function BatchCard({ batch, theme, index }: { batch: Batch; theme: typeof Colors.light; index: number }) {
  const total =
    batch.total_beans ||
    batch.criollo_count +
      batch.forastero_count +
      batch.trinitario_count +
      batch.needs_drying_count +
      batch.rejected_count;
  const exportPct = total > 0 ? Math.round((batch.export_grade_count / total) * 100) : 0;
  const grade = gradeOf(exportPct);
  const rate = batch.duration_seconds > 0 ? Math.round((total / batch.duration_seconds) * 60) : 0;

  const formattedDate = batch.completed_at
    ? new Date(batch.completed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const name =
    batch.batch_name && batch.batch_name.trim() !== ''
      ? batch.batch_name
      : `Batch #${batch.id.substring(0, 4).toUpperCase()}`;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 60, 240))}>
      <TouchableOpacity
        style={[styles.batchCard, { backgroundColor: theme.surface }, Shadows.sm]}
        activeOpacity={0.85}
        onPress={() => router.push(`/batch/${batch.id}` as any)}
      >
        <View style={styles.batchHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.batchName, { color: theme.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.batchDate, { color: theme.textSecondary }]}>Sorted: {formattedDate}</Text>
          </View>
          <View style={[styles.exportBadge, { backgroundColor: grade.bg }]}>
            <View style={[styles.gradeDot, { backgroundColor: grade.dot }]} />
            <Text style={[styles.exportText, { color: grade.text }]}>
              {exportPct}% {grade.label}
            </Text>
          </View>
        </View>

        <View style={styles.dashedRule} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="scan-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{total} beans</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {formatTime(batch.duration_seconds)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="flash-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{rate} beans/min</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.detailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color={Palette.chocolate} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { batches, totalBatches, totalBeansSorted, globalExportRate, isLoading, refresh } =
    useHistoryAnalytics();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'export'>('newest');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = batches.filter((b) => {
      const name = (b.batch_name || '').toLowerCase();
      const id = b.id.toLowerCase();
      return !q || name.includes(q) || id.includes(q);
    });
    if (sort === 'export') {
      return [...filtered].sort((a, b) => {
        const ta =
          a.total_beans ||
          a.criollo_count + a.forastero_count + a.trinitario_count + a.needs_drying_count + a.rejected_count;
        const tb =
          b.total_beans ||
          b.criollo_count + b.forastero_count + b.trinitario_count + b.needs_drying_count + b.rejected_count;
        const ea = ta > 0 ? a.export_grade_count / ta : 0;
        const eb = tb > 0 ? b.export_grade_count / tb : 0;
        return eb - ea;
      });
    }
    return filtered;
  }, [batches, query, sort]);

  const renderItem = useCallback(
    ({ item, index }: { item: Batch; index: number }) => (
      <BatchCard batch={item} theme={theme} index={index} />
    ),
    [theme]
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Batch History</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          View past sorting sessions and analytics
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, Shadows.sm]}>
          <Text style={[styles.summaryNumber, { color: Palette.chocolate }]}>{totalBatches}</Text>
          <Text style={styles.summaryLabel}>Total Batches</Text>
        </View>
        <View style={[styles.summaryCard, Shadows.sm]}>
          <Text style={[styles.summaryNumber, { color: Palette.green }]}>
            {totalBeansSorted.toLocaleString()}
          </Text>
          <Text style={styles.summaryLabel}>Beans Sorted</Text>
        </View>
        <View style={[styles.summaryCard, Shadows.sm]}>
          <Text style={[styles.summaryNumber, { color: Palette.gold }]}>
            {Math.round(globalExportRate)}%
          </Text>
          <Text style={styles.summaryLabel}>Avg Export</Text>
        </View>
      </View>

      {batches.length > 0 && (
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#b6a394" style={{ marginRight: 8 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search batch name / lot #"
              placeholderTextColor="#b6a394"
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSort((s) => (s === 'newest' ? 'export' : 'newest'))}
            activeOpacity={0.85}
          >
            <Text style={styles.sortText}>{sort === 'newest' ? 'Newest' : 'Highest Export'}</Text>
            <Ionicons name="chevron-down" size={16} color="#9c8878" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={visible}
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
          batches.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={36} color="#b89a7f" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No batches yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Completed sorting sessions and their PNS compliance reports will appear here.
              </Text>
              <View style={styles.emptyHint}>
                <Ionicons name="bulb-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.emptyHintText}>Start a session from the Dashboard to begin</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noMatch}>No batches match “{query}”.</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  title: { fontSize: 26, fontFamily: Typography.fontFamily.bold },
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    marginTop: Spacing.xs,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.borderSoft,
    backgroundColor: '#fff',
    paddingVertical: Spacing.md,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  summaryNumber: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
    marginTop: Spacing.xs,
    textAlign: 'center',
    color: '#9c8878',
  },

  searchRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.borderWarm,
    backgroundColor: Palette.creamField,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.brownText,
    fontFamily: Typography.fontFamily.regular,
    padding: 0,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.borderWarm,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  sortText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#5c4739',
  },

  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 110 },

  batchCard: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.borderSoft,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  batchName: { fontSize: 19, fontFamily: Typography.fontFamily.bold },
  batchDate: { fontSize: 14, fontFamily: Typography.fontFamily.regular, marginTop: 2 },
  exportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  gradeDot: { width: 8, height: 8, borderRadius: 4 },
  exportText: { fontSize: 13, fontFamily: Typography.fontFamily.bold },

  dashedRule: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#efe6dc',
    marginVertical: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 14, fontFamily: Typography.fontFamily.semiBold },
  detailsRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  detailsText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Palette.chocolate,
  },

  emptyWrap: { alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f7f1eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: 19, fontFamily: Typography.fontFamily.bold, marginBottom: Spacing.xs },
  emptySubtitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 290,
  },
  emptyHint: {
    marginTop: Spacing.md,
    backgroundColor: '#f7f1eb',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyHintText: {
    color: '#8a7566',
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
  },
  noMatch: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 15,
    color: '#9c8878',
    fontFamily: Typography.fontFamily.regular,
  },
});
