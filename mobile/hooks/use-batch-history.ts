import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Batch } from '@/hooks/use-batch-controller';

interface HistoryStats {
  totalBatches: number;
  totalBeans: number;
  exportRate: number;
}

export function useBatchHistory() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<HistoryStats>({ totalBatches: 0, totalBeans: 0, exportRate: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Error loading history:', error.message);
        return;
      }

      const batchList = (data || []) as Batch[];
      setBatches(batchList);

      // Compute aggregate stats
      const totalBeans = batchList.reduce((sum, b) => sum + b.total_beans, 0);
      const totalExport = batchList.reduce((sum, b) => sum + b.export_grade_count, 0);

      setStats({
        totalBatches: batchList.length,
        totalBeans,
        exportRate: totalBeans > 0 ? Math.round((totalExport / totalBeans) * 100) : 0,
      });
    } catch (e) {
      console.warn('Error loading history:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return { batches, stats, isLoading, refresh: loadHistory };
}
