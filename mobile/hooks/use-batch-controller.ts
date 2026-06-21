import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';

export interface Batch {
  id: string;
  user_id: string;
  harvest_date: string;
  target_bean_count: number;
  status: 'active' | 'paused' | 'completed';
  criollo_count: number;
  forastero_count: number;
  trinitario_count: number;
  export_grade_count: number;
  needs_drying_count: number;
  rejected_count: number;
  total_beans: number;
  duration_seconds: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export function useBatchController() {
  const { user } = useAuth();
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Load active batch on mount
  useEffect(() => {
    if (user) {
      loadActiveBatch();
    }
  }, [user]);

  // Subscribe to realtime updates on the active batch
  useEffect(() => {
    if (!activeBatch) return;

    const channel = supabase
      .channel(`batch-${activeBatch.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'batches',
          filter: `id=eq.${activeBatch.id}`,
        },
        (payload) => {
          setActiveBatch(payload.new as Batch);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBatch?.id]);

  // Timer management
  useEffect(() => {
    if (activeBatch?.status === 'active') {
      startTimer();
    } else {
      stopTimer();
    }

    return () => stopTimer();
  }, [activeBatch?.status]);

  function startTimer() {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function loadActiveBatch() {
    if (!user) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('batches')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.warn('Error loading active batch:', fetchError.message);
        return;
      }

      if (data) {
        setActiveBatch(data as Batch);
        // Calculate elapsed time from when it started
        const started = new Date(data.started_at).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - started) / 1000) - (data.duration_seconds || 0) + data.duration_seconds);
      }
    } catch (e) {
      console.warn('Error loading batch:', e);
    }
  }

  const createBatch = useCallback(
    async (harvestDate: string, targetBeanCount: number) => {
      if (!user) return;
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: insertError } = await supabase
          .from('batches')
          .insert({
            user_id: user.id,
            harvest_date: harvestDate,
            target_bean_count: targetBeanCount,
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);

        setActiveBatch(data as Batch);
        setElapsedSeconds(0);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const pauseBatch = useCallback(async () => {
    if (!activeBatch) return;
    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('batches')
        .update({
          status: 'paused',
          duration_seconds: elapsedSeconds,
        })
        .eq('id', activeBatch.id);

      if (updateError) throw new Error(updateError.message);

      setActiveBatch((prev) => (prev ? { ...prev, status: 'paused' } : null));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeBatch, elapsedSeconds]);

  const resumeBatch = useCallback(async () => {
    if (!activeBatch) return;
    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('batches')
        .update({ status: 'active' })
        .eq('id', activeBatch.id);

      if (updateError) throw new Error(updateError.message);

      setActiveBatch((prev) => (prev ? { ...prev, status: 'active' } : null));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeBatch]);

  const stopBatch = useCallback(async () => {
    if (!activeBatch) return;
    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('batches')
        .update({
          status: 'completed',
          duration_seconds: elapsedSeconds,
          completed_at: new Date().toISOString(),
        })
        .eq('id', activeBatch.id);

      if (updateError) throw new Error(updateError.message);

      setActiveBatch(null);
      setElapsedSeconds(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeBatch, elapsedSeconds]);

  // Computed values
  const totalBeans = activeBatch
    ? activeBatch.criollo_count + activeBatch.forastero_count + activeBatch.trinitario_count
    : 0;

  const throughput =
    elapsedSeconds > 0 ? Math.round((totalBeans / elapsedSeconds) * 60) : 0;

  const progress =
    activeBatch && activeBatch.target_bean_count > 0
      ? Math.min(totalBeans / activeBatch.target_bean_count, 1)
      : 0;

  return {
    activeBatch,
    isLoading,
    error,
    elapsedSeconds,
    totalBeans,
    throughput,
    progress,
    createBatch,
    pauseBatch,
    resumeBatch,
    stopBatch,
  };
}

// Helper: format seconds to MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
