import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';

export interface Batch {
  id: string;
  user_id: string;
  batch_name: string;
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

    // Appending a random string prevents strict mode from reusing a 'joining' channel
    const channel = supabase
      .channel(`batch-${activeBatch.id}-${Date.now()}`)
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

  // Computed values
  const totalBeans = activeBatch
    ? activeBatch.criollo_count + activeBatch.forastero_count + activeBatch.trinitario_count
    : 0;

  // Timer management
  useEffect(() => {
    if (activeBatch?.status === 'active' && totalBeans > 0) {
      startTimer();
    } else if (activeBatch?.status !== 'active') {
      stopTimer();
    }
  }, [activeBatch?.status, totalBeans]);

  useEffect(() => {
    return () => stopTimer();
  }, []);

  function startTimer() {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        // Auto-save duration every 10 seconds to prevent data loss on crash
        if (next % 10 === 0 && activeBatch?.id) {
          supabase.from('batches').update({ duration_seconds: next }).eq('id', activeBatch.id).then();
        }
        return next;
      });
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
        
        // Timer only continues from last known duration immediately 
        // to prevent gap loading issues when timer pauses on zero beans
        setElapsedSeconds(data.duration_seconds || 0);
      }
    } catch (e) {
      console.warn('Error loading batch:', e);
    }
  }

  const createBatch = useCallback(
    async (batchName: string, harvestDate: string, targetBeanCount: number = 0) => {
      if (!user) return;
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: insertError } = await supabase
          .from('batches')
          .insert({
            user_id: user.id,
            batch_name: batchName,
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
      const currentTotal = activeBatch.criollo_count + activeBatch.forastero_count + activeBatch.trinitario_count;
      
      if (currentTotal === 0) {
        // Ghost Batch Gatekeeper Logic -> Delete empty aborted sessions
        const { error: deleteError } = await supabase
          .from('batches')
          .delete()
          .eq('id', activeBatch.id);
          
        if (deleteError) throw new Error(deleteError.message);
      } else {
        const { error: updateError } = await supabase
          .from('batches')
          .update({
            status: 'completed',
            duration_seconds: elapsedSeconds,
            completed_at: new Date().toISOString(),
          })
          .eq('id', activeBatch.id);

        if (updateError) throw new Error(updateError.message);
      }

      setActiveBatch(null);
      setElapsedSeconds(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeBatch, elapsedSeconds]);

  // Optimistic UI update from WebSocket to instantly reflect on screen
  const incrementBean = useCallback((variety: string, quality: string) => {
    setActiveBatch((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [`${variety}_count`]: prev[`${variety}_count` as keyof Batch] as number + 1,
        [`${quality}_count`]: prev[`${quality}_count` as keyof Batch] as number + 1,
      };
    });
  }, []);

  // Computed throughput and progress
  const throughput = elapsedSeconds > 0 ? Math.round((totalBeans / elapsedSeconds) * 60) : 0;

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
    incrementBean,
  };
}

// Helper: format seconds to MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
