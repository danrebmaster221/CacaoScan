import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { Batch } from './use-batch-controller';

export interface HistoryAnalytics {
  totalBatches: number;
  totalBeansSorted: number;
  globalExportRate: number;
  batches: Batch[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHistoryAnalytics(): HistoryAnalytics {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('batches')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);

      setBatches(data as Batch[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load history continuously. Using focus refetching or simple mount
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totalBatches = batches.length;
  
  const totalBeansSorted = batches.reduce((acc, batch) => acc + (batch.total_beans || 0), 0);
  
  const totalExportGrade = batches.reduce((acc, batch) => acc + (batch.export_grade_count || 0), 0);
  
  const globalExportRate = totalBeansSorted > 0 
    ? (totalExportGrade / totalBeansSorted) * 100 
    : 0;

  return {
    totalBatches,
    totalBeansSorted,
    globalExportRate,
    batches,
    isLoading,
    error,
    refresh: fetchHistory,
  };
}
