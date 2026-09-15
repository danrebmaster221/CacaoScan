import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { Colors, Typography, Spacing, Radius, Shadows, Palette, ClassColors } from '@/constants/theme';
import { GATE_CM, labelForClass, isExportClass } from '@/utils/classification';
import { StickyHeader, Card, BrownButton } from '@/components/redesign/ui';

export default function BatchReportScreen() {
  const { id } = useLocalSearchParams();
  const theme = Colors.light;

  const [batch, setBatch] = useState<any>(null);
  const [classifications, setClassifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'rejected' | 'export'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: b }, { data: c }] = await Promise.all([
        supabase.from('batches').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('classifications')
          .select('*')
          .eq('batch_id', id)
          .order('classified_at', { ascending: false }),
      ]);
      setBatch(b);
      setClassifications(c || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const breakdown = [
    { label: 'Criollo', count: batch?.criollo_count || 0, color: ClassColors.Criollo },
    { label: 'Forastero', count: batch?.forastero_count || 0, color: ClassColors.Forastero },
    { label: 'Trinitario', count: batch?.trinitario_count || 0, color: ClassColors.Trinitario },
    { label: 'Needs Drying', count: batch?.needs_drying_count || 0, color: ClassColors.Needs_Drying },
    { label: 'Rejected', count: batch?.rejected_count || 0, color: ClassColors.Rejected },
  ];
  const total =
    batch?.total_beans ||
    breakdown.reduce((s, x) => s + x.count, 0);
  const exportRate = total ? Math.round(((batch?.export_grade_count || 0) / total) * 100) : 0;
  const durationMin = batch?.duration_seconds
    ? `${Math.floor(batch.duration_seconds / 60)}:${String(batch.duration_seconds % 60).padStart(2, '0')}`
    : '—';
  const rate =
    batch?.duration_seconds > 0
      ? `${Math.round((total / batch.duration_seconds) * 60)}/min`
      : '—';

  const filtered = classifications.filter((c) => {
    if (filterMode === 'rejected') return c.operational_class === 'Rejected';
    if (filterMode === 'export') return isExportClass(c.operational_class);
    return true;
  });

  async function exportReport() {
    try {
      const lines = [
        `CacaoScan Batch Report`,
        `Batch: ${batch?.batch_name || id}`,
        `Export Rate: ${exportRate}%`,
        `Total Beans: ${total}`,
        ...breakdown.map((r) => `${r.label}: ${r.count}`),
      ].join('\n');
      await Share.share({ message: lines, title: 'Batch Report' });
    } catch (e: any) {
      Alert.alert('Export', e.message || 'Could not share report');
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={
          <View>
            <StickyHeader
              title={`Batch Report: ${batch?.batch_name || 'Session'}`}
              subtitle={`${batch?.harvest_date || '—'} • ${total} Beans`}
              onBack={() => router.back()}
            />
            <View style={styles.body}>
              <View style={styles.compliance}>
                <View style={styles.complianceIcon}>
                  <Ionicons name="shield-checkmark" size={24} color={theme.success} />
                </View>
                <View>
                  <Text style={styles.complianceLabel}>PNS Compliant</Text>
                  <Text style={styles.complianceValue}>EXPORT — {exportRate}%</Text>
                </View>
              </View>

              <View style={styles.statRow}>
                {[
                  [String(total), 'Total Beans'],
                  [durationMin, 'Duration'],
                  [rate, 'Throughput'],
                ].map(([v, l]) => (
                  <Card key={l} style={styles.statCard}>
                    <Text style={styles.statValue}>{v}</Text>
                    <Text style={styles.statLabel}>{l}</Text>
                  </Card>
                ))}
              </View>

              <Text style={styles.sectionLabel}>5-Class Sorting Breakdown</Text>
              <Card>
                {breakdown.map((row, i) => {
                  const pct = total ? Math.round((row.count / total) * 100) : 0;
                  return (
                    <View key={row.label} style={i > 0 ? { marginTop: 16 } : undefined}>
                      <View style={styles.breakHead}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[styles.dot, { backgroundColor: row.color }]} />
                          <Text style={styles.breakName}>{row.label}</Text>
                        </View>
                        <Text style={styles.breakCount}>
                          {row.count} <Text style={styles.breakPct}>· {pct}%</Text>
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: row.color }]} />
                      </View>
                    </View>
                  );
                })}
              </Card>

              <View style={{ marginTop: Spacing.lg }}>
                <BrownButton title="Export PDF Certificate" onPress={exportReport} icon="document-text-outline" />
              </View>

              <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>Bean Events</Text>
              <View style={styles.filters}>
                {([
                  ['all', 'Show All'],
                  ['rejected', 'Rejected'],
                  ['export', 'Export'],
                ] as const).map(([mode, label]) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.filterBtn, filterMode === mode && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => setFilterMode(mode)}
                  >
                    <Text style={[styles.filterText, filterMode === mode && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
        renderItem={({ item }) => {
          const cls = item.operational_class || '—';
          const gate = item.gate_actuated;
          return (
            <View style={[styles.eventCard, Shadows.sm]}>
              <View style={[styles.thumb, { backgroundColor: Palette.iconBg }]}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Ionicons name="leaf-outline" size={22} color={Palette.muted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eventTitle, { color: cls === 'Rejected' ? theme.danger : theme.text }]}>
                  {labelForClass(String(cls))}
                </Text>
                <Text style={styles.eventMeta}>
                  {item.derived_grade || '—'} · {Math.round((item.confidence || 0) * 100)}%
                </Text>
                <Text style={styles.eventMeta}>
                  {gate ? `Gate ${gate} @ ${GATE_CM[gate] ?? '?'} cm` : '—'}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyEvents}>No individual bean events recorded for this batch.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.md },
  compliance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.successBg,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: Spacing.md,
  },
  complianceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d3edd7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  complianceLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#3a8347',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  complianceValue: { fontSize: 19, fontFamily: Typography.fontFamily.bold, color: '#2f7a3d' },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statValue: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  statLabel: { marginTop: 6, fontSize: 11, color: Colors.light.textSecondary },
  sectionLabel: {
    marginTop: Spacing.lg,
    marginBottom: 10,
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#8a7566',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakName: { fontSize: 15, fontFamily: Typography.fontFamily.semiBold, color: Colors.light.text },
  breakCount: { fontFamily: Typography.fontFamily.bold, color: Colors.light.text },
  breakPct: { fontSize: 13, fontFamily: Typography.fontFamily.semiBold, color: Colors.light.textSecondary },
  barTrack: { marginTop: 8, height: 8, borderRadius: 4, backgroundColor: '#f2ece6', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  filterText: { fontSize: 12, fontFamily: Typography.fontFamily.semiBold, color: '#4B5563' },
  eventCard: {
    marginHorizontal: Spacing.md,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.borderSoft,
    backgroundColor: '#fff',
    padding: 10,
    alignItems: 'center',
  },
  thumb: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  eventTitle: { fontSize: 15, fontFamily: Typography.fontFamily.bold },
  eventMeta: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  emptyEvents: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    padding: Spacing.xl,
  },
});
