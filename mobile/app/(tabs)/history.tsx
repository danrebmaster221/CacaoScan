import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
// eslint-disable-next-line import/namespace
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHistoryAnalytics } from '@/hooks/use-history-analytics';
import type { Batch } from '@/hooks/use-batch-controller';
import { formatTime } from '@/hooks/use-batch-controller';
import { router } from 'expo-router';
import { Skeleton } from '@/components/Skeleton';

// ─── Horizontal Bar Chart ────────────────────────────────────────────────
function HorizontalBar({ label, value, max, color, theme }: { label: string, value: number, max: number, color: string, theme: typeof Colors.light }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs }}>
      <Text style={{ width: 70, fontSize: Typography.fontSize.xs, color: theme.textSecondary, fontFamily: Typography.fontFamily.medium }}>{label}</Text>
      <View style={{ flex: 1, height: 6, backgroundColor: theme.border, borderRadius: 3, marginHorizontal: Spacing.sm, overflow: 'hidden' }}>
        <View style={{ width: `${percentage}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </View>
      <Text style={{ width: 30, fontSize: Typography.fontSize.xs, color: theme.text, textAlign: 'right', fontFamily: Typography.fontFamily.bold }}>{value}</Text>
    </View>
  );
}

// ─── Batch Card ──────────────────────────────────────────────────────────
function BatchCard({ batch, theme }: { batch: Batch; theme: typeof Colors.light }) {
  const total = batch.criollo_count + batch.forastero_count + batch.trinitario_count;
  const exportPct = total > 0 ? Math.round((batch.export_grade_count / total) * 100) : 0;
  
  const formattedDate = batch.completed_at
    ? new Date(batch.completed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
    
  const harvestDateObj = new Date(batch.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const displayDate = harvestDateObj === formattedDate 
     ? `Sorted: ${formattedDate}` 
     : `Harvest: ${harvestDateObj} • Sorted: ${formattedDate}`;

  const badgeBg = total === 0 ? theme.border : exportPct >= 70 ? theme.successBg : exportPct >= 40 ? theme.warningBg : theme.dangerBg;
  const badgeText = total === 0 ? theme.textSecondary : exportPct >= 70 ? theme.success : exportPct >= 40 ? theme.warning : theme.danger;

  const exportToCSV = async () => {
    try {
      if (total === 0) {
        Alert.alert("Empty Session", "No data to export for this batch.");
        return;
      }
      
      const safeName = (batch.batch_name || 'batch').replace(/ /g, '_');
      const efficiency = batch.duration_seconds > 0 ? Math.round((total / batch.duration_seconds) * 60) : 0;
      
      const csvContent = [
        "Batch Name,Harvest Date,Status,Total Beans,Export Grade,Needs Drying,Rejected,Criollo,Forastero,Trinitario,Duration(seconds),Efficiency(beans/min)",
        `${batch.batch_name || 'Unnamed'},${batch.harvest_date},${batch.status},${total},${batch.export_grade_count},${batch.needs_drying_count},${batch.rejected_count},${batch.criollo_count},${batch.forastero_count},${batch.trinitario_count},${batch.duration_seconds},${efficiency}`
      ].join('\n');
      
      // eslint-disable-next-line import/namespace
      // @ts-ignore
      const fileUri = `${FileSystem.documentDirectory}${safeName}_Report.csv`;
      // eslint-disable-next-line import/namespace
      // @ts-ignore
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Export Successful", "CSV Export generated. (Sharing disabled in this simulator environment).");
      }
    } catch (e: any) {
      Alert.alert("Export Error", e.message);
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(100)}
    >
      <TouchableOpacity 
        style={[styles.batchCard, { backgroundColor: theme.surface }, Shadows.sm]} 
        activeOpacity={0.7}
        onPress={() => router.push(`/batch/${batch.id}` as any)}
      >
        {/* Header Row */}
      <View style={styles.batchHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.batchDate, { color: theme.text }]} numberOfLines={1}>
            {batch.batch_name && batch.batch_name.trim() !== '' ? batch.batch_name : `Batch #${batch.id.substring(0, 4).toUpperCase()} (${batch.harvest_date})`}
          </Text>
          <Text style={[styles.batchHarvest, { color: theme.textSecondary }]}>
            {displayDate}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          {/* Virtual PDF Icon for Drill Down requirements */}
          <TouchableOpacity 
            onPress={exportToCSV}
            style={{ padding: Spacing.xs, backgroundColor: theme.border, borderRadius: Radius.sm }}
          >
            <Text style={{ fontSize: 16 }}>📄</Text>
          </TouchableOpacity>
          <View style={[styles.exportBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.exportText, { color: badgeText }]}>
              {exportPct}% Export
            </Text>
          </View>
        </View>
      </View>

      {/* Bar Charts Row */}
      {total > 0 ? (
        <View style={{ flexDirection: 'row', gap: Spacing.xl, marginBottom: Spacing.md }}>
          {/* Varieties */}
          <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.bold, color: theme.text, marginBottom: Spacing.sm }}>Variety Distribution</Text>
              <HorizontalBar label="Criollo" value={batch.criollo_count} max={total} color="#8D6E63" theme={theme} />
              <HorizontalBar label="Forastero" value={batch.forastero_count} max={total} color="#5D4037" theme={theme} />
              <HorizontalBar label="Trinitario" value={batch.trinitario_count} max={total} color={theme.accent} theme={theme} />
          </View>
          
          {/* Quality */}
          <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.bold, color: theme.text, marginBottom: Spacing.sm }}>Quality Grading</Text>
              <HorizontalBar label="Export" value={batch.export_grade_count} max={total} color={theme.success} theme={theme} />
              <HorizontalBar label="Drying" value={batch.needs_drying_count} max={total} color={theme.warning} theme={theme} />
              <HorizontalBar label="Rejected" value={batch.rejected_count} max={total} color={theme.danger} theme={theme} />
          </View>
        </View>
      ) : (
        <View style={{ paddingVertical: Spacing.lg, alignItems: 'center', opacity: 0.5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border, marginBottom: Spacing.sm }}>
          <Text style={{ color: theme.textSecondary, fontSize: Typography.fontSize.sm, fontStyle: 'italic' }}>
            No beans sorted in this session.
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.batchFooterContainer}>
        <View style={[styles.batchFooter, { borderTopColor: theme.border }]}>
          <Text style={[styles.footerStat, { color: theme.textSecondary }]}>
            🫘 {total} beans
          </Text>
          <Text style={[styles.footerStat, { color: theme.textSecondary }]}>
            ⏱ {formatTime(batch.duration_seconds)}
          </Text>
          <Text style={[styles.footerStat, { color: theme.textSecondary }]}>
            ⚡ {batch.duration_seconds > 0 ? Math.round((total / batch.duration_seconds) * 60) : 0} beans/min
          </Text>
        </View>
        {/* Drill down visual indicator */}
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border, paddingTop: Spacing.sm, alignItems: 'center', marginTop: Spacing.sm }}>
           <Text style={{ color: theme.primary, fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.medium }}>
             View Details  〉
           </Text>
        </View>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main History Screen ──────────────────────────────────────────────────
export default function HistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { batches, totalBatches, totalBeansSorted, globalExportRate, isLoading, refresh } = useHistoryAnalytics();

  const renderItem = useCallback(
    ({ item }: { item: Batch }) => <BatchCard batch={item} theme={theme} />,
    [theme]
  );

  // ─── PRESENTATION MOCK DATA ───
  const mockBatches: Batch[] = [
    {
      id: 'mock-1',
      user_id: 'mock',
      batch_name: 'Premium Lot A',
      harvest_date: new Date().toISOString().split('T')[0],
      target_bean_count: 500,
      status: 'completed',
      criollo_count: 220,
      forastero_count: 40,
      trinitario_count: 40,
      export_grade_count: 260,
      needs_drying_count: 30,
      rejected_count: 10,
      total_beans: 300,
      duration_seconds: 642,
      started_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 3000000).toISOString(),
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'mock-2',
      user_id: 'mock',
      batch_name: 'Standard Mix B',
      harvest_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      target_bean_count: 1000,
      status: 'completed',
      criollo_count: 300,
      forastero_count: 300,
      trinitario_count: 200,
      export_grade_count: 600,
      needs_drying_count: 120,
      rejected_count: 80,
      total_beans: 800,
      duration_seconds: 1840,
      started_at: new Date(Date.now() - 86400000).toISOString(),
      completed_at: new Date(Date.now() - 84600000).toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'mock-3',
      user_id: 'mock',
      batch_name: 'Rainy Day Harvest',
      harvest_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
      target_bean_count: 200,
      status: 'completed',
      criollo_count: 50,
      forastero_count: 40,
      trinitario_count: 60,
      export_grade_count: 60,
      needs_drying_count: 70,
      rejected_count: 20,
      total_beans: 150,
      duration_seconds: 400,
      started_at: new Date(Date.now() - 172800000).toISOString(),
      completed_at: new Date(Date.now() - 172400000).toISOString(),
      created_at: new Date(Date.now() - 172800000).toISOString(),
    }
  ];

  const presentationBatches = [...mockBatches, ...batches];
  const presentationTotalBatches = totalBatches + mockBatches.length;
  const presentationTotalBeans = totalBeansSorted + mockBatches.reduce((sum, b) => sum + b.total_beans, 0);
  const realExportTotal = totalBeansSorted > 0 ? (totalBeansSorted * globalExportRate) / 100 : 0;
  const mockExportTotal = mockBatches.reduce((sum, b) => sum + b.export_grade_count, 0);
  const presentationExportRate = presentationTotalBeans > 0 
    ? ((realExportTotal + mockExportTotal) / presentationTotalBeans) * 100 
    : 0;

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
          <Text style={[styles.summaryNumber, { color: theme.primary }]}>{presentationTotalBatches}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total{'\n'}Batches</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.summaryNumber, { color: theme.success }]}>{presentationTotalBeans}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Beans{'\n'}Sorted</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }, Shadows.sm]}>
          <Text style={[styles.summaryNumber, { color: theme.accent }]}>{Math.round(presentationExportRate)}%</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Export{'\n'}Rate</Text>
        </View>
      </View>

      {/* Batch List */}
      <FlatList
        data={presentationBatches}
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
          isLoading ? (
            <View style={{ marginTop: Spacing.sm }}>
              {[1, 2, 3].map((k) => (
                <View key={k} style={[styles.batchCard, { backgroundColor: theme.surface, height: 180 }, Shadows.sm]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md }}>
                    <View>
                      <Skeleton width={140} height={20} />
                      <Skeleton width={80} height={14} style={{ marginTop: Spacing.xs }} />
                    </View>
                    <Skeleton width={70} height={24} borderRadius={Radius.sm} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md }}>
                    <Skeleton width="48%" height={60} />
                    <Skeleton width="48%" height={60} />
                  </View>
                  <Skeleton width="100%" height={24} />
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.surface }, Shadows.sm]}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Batches Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Completed sorting sessions will appear here with variety breakdowns and export rates
              </Text>
            </View>
          )
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

  batchFooterContainer: { marginTop: Spacing.md },
  batchFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm },
  footerStat: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular },

  // Empty
  emptyState: { borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.semiBold, marginBottom: Spacing.xs },
  emptySubtitle: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.regular, textAlign: 'center', lineHeight: 20 },
});
