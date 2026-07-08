import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/services/supabase';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

export default function BatchDrillDownScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [classifications, setClassifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'rejected' | 'flagged'>('all');

  const fetchClassifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classifications')
        .select('*')
        .eq('batch_id', id)
        .order('classified_at', { ascending: false });

      if (error) throw error;
      
      // Merge mock visual test data for presentation if DB rows lack image_url
      const mapped = (data || []).map((row, index) => ({
        ...row,
        // Fallback for presentation since live images might not be uploaded yet
        image_url: row.image_url || require('../../../assets/images/example_image.jpg'),
      }));
      
      setClassifications(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClassifications();
  }, [fetchClassifications]);

  const handleFlagError = async (classificationId: string) => {
    Alert.alert(
      "Report AI Error",
      "Are you sure this bean was misclassified? This will flag it to the MLOps pipeline for retraining on the Ryzen 7 workstation.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Flag It", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('classifications')
                .update({ is_flagged: true, farmer_correction: 'User Flagged via UI' })
                .eq('id', classificationId);
              
              if (error) throw error;
              Alert.alert("Success", "Image sent to Developer Staging Area for retraining.");
              fetchClassifications(); // Refresh list
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isRejected = item.quality === 'rejected';
    
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.imageWrapper}>
           <Image 
             source={typeof item.image_url === 'string' ? { uri: item.image_url } : item.image_url} 
             style={styles.beanImage} 
           />
           {item.is_flagged && (
             <View style={styles.flagBadge}>
               <Text style={styles.flagText}>⚠️ Flagged</Text>
             </View>
           )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.variety, { color: theme.text }]}>Variety: {item.variety.charAt(0).toUpperCase() + item.variety.slice(1)}</Text>
          <Text style={[styles.quality, { color: isRejected ? theme.danger : theme.textSecondary }]}>
            Quality: {item.quality.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.flagBtn, { backgroundColor: item.is_flagged ? theme.disabled : theme.danger }]}
          disabled={item.is_flagged}
          onPress={() => handleFlagError(item.id)}
        >
          <Text style={styles.flagBtnText}>{item.is_flagged ? 'Reported' : 'Report Error'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>MLOps Drill-Down</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.descriptionRow}>
         <Text style={{ color: theme.textSecondary, fontFamily: Typography.fontFamily.regular }}>
            Select any incorrectly sorted bean below to flag it. Flagged images are added to the retraining dataset on the edge workstation.
         </Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterBtn, filterMode === 'all' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setFilterMode('all')}
        >
          <Text style={[styles.filterText, filterMode === 'all' && { color: theme.surface }]}>Show All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, filterMode === 'rejected' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setFilterMode('rejected')}
        >
          <Text style={[styles.filterText, filterMode === 'rejected' && { color: theme.surface }]}>Rejected</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, filterMode === 'flagged' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => setFilterMode('flagged')}
        >
          <Text style={[styles.filterText, filterMode === 'flagged' && { color: theme.surface }]}>Flagged</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: Spacing['2xl'] }} />
      ) : (
        <FlatList
          data={classifications.filter(c => {
            if (filterMode === 'rejected') return c.quality === 'rejected';
            if (filterMode === 'flagged') return c.is_flagged;
            return true;
          })}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
             <View style={{ alignItems: 'center', marginTop: Spacing['2xl'], paddingHorizontal: Spacing.xl }}>
               <Text style={{ fontSize: 48, marginBottom: Spacing.lg, opacity: 0.8 }}>📦</Text>
               <Text style={{ color: theme.textSecondary, textAlign: 'center', fontFamily: Typography.fontFamily.medium, lineHeight: 22 }}>
                 This batch was terminated before classifications could be recorded.
               </Text>
             </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingTop: 64,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  backText: {
    color: Colors.light.text,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.medium,
  },
  descriptionRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full, borderWidth: 1, borderColor: '#D1D5DB' },
  filterText: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.semiBold, color: '#4B5563' },
  list: { padding: Spacing.md },
  card: { flexDirection: 'row', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.sm, marginBottom: Spacing.md, alignItems: 'center' },
  imageWrapper: { width: 60, height: 60, borderRadius: Radius.md, overflow: 'hidden', marginRight: Spacing.md },
  beanImage: { width: '100%', height: '100%' },
  flagBadge: { position: 'absolute', top: 0, left: 0, width: '100%', backgroundColor: 'rgba(255,167,38,0.9)', paddingVertical: 2, alignItems: 'center' },
  flagText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  info: { flex: 1 },
  variety: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.semiBold },
  quality: { fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.medium, marginTop: 2 },
  flagBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  flagBtnText: { color: '#FFF', fontSize: Typography.fontSize.xs, fontFamily: Typography.fontFamily.semiBold }
});
