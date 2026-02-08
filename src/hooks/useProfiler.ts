/**
 * Performance Profiler Hook
 * Measures execution time of async operations and tracks pipeline metrics
 */

import { useCallback, useRef, useState, useEffect } from 'react';

export interface ProfileStage {
  stage: string;
  start: number;
  end: number;
  duration: number;
}

export interface ProfileData {
  stages: ProfileStage[];
  totalDuration: number;
  timestamp: number;
  cacheHit: boolean;
  memoryFootprint?: number;
}

export interface ProfilerStats {
  currentProfile: ProfileData | null;
  history: ProfileData[];
  enabled: boolean;
}

/**
 * Hook for measuring and tracking performance metrics
 */
export function useProfiler() {
  const [stats, setStats] = useState<ProfilerStats>({
    currentProfile: null,
    history: [],
    enabled: false,
  });
  
  const stagesRef = useRef<ProfileStage[]>([]);
  const startTimeRef = useRef<number>(0);
  const enabledRef = useRef<boolean>(false);

  // Synchronise la valeur de enabled avec la ref (stable)
  useEffect(() => {
    enabledRef.current = stats.enabled;
  }, [stats.enabled]);

  /**
   * Enable or disable profiling
   */
  const setEnabled = useCallback(
    (nextEnabled: boolean | ((prevEnabled: boolean) => boolean)) => {
      setStats(prev => {
        const resolvedEnabled =
          typeof nextEnabled === 'function' ? nextEnabled(prev.enabled) : nextEnabled;

        if (prev.enabled === resolvedEnabled) {
          return prev;
        }

        enabledRef.current = resolvedEnabled; // Garde la valeur à jour
        return { ...prev, enabled: resolvedEnabled };
      });
    },
    []
  );

  /**
   * Start a new profiling session
   */
  const startProfiling = useCallback(() => {
    stagesRef.current = [];
    startTimeRef.current = performance.now();
  }, []);

  /**
   * Record a stage measurement
   */
  const recordStage = useCallback((stage: string, duration: number) => {
    const now = performance.now();
    stagesRef.current.push({
      stage,
      start: now - duration,
      end: now,
      duration,
    });
  }, []);

  /**
   * Measure an async function execution time
   */
  const measureAsync = useCallback(
    async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
      if (!enabledRef.current) {
        return await fn();
      }

      const start = performance.now();
      try {
        const result = await fn();
        const duration = performance.now() - start;
        recordStage(label, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        recordStage(`${label} (error)`, duration);
        throw error;
      }
    },
    [recordStage]
  );

  /**
   * Measure a synchronous function execution time
   */
  const measureSync = useCallback(
    <T,>(label: string, fn: () => T): T => {
      if (!enabledRef.current) {
        return fn();
      }

      const start = performance.now();
      try {
        const result = fn();
        const duration = performance.now() - start;
        recordStage(label, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        recordStage(`${label} (error)`, duration);
        throw error;
      }
    },
    [recordStage]
  );

  /**
   * Complete profiling session and save results
   */
  const endProfiling = useCallback((cacheHit: boolean = false, memoryFootprint?: number) => {
    const totalDuration = performance.now() - startTimeRef.current;
    
    const profile: ProfileData = {
      stages: [...stagesRef.current],
      totalDuration,
      timestamp: Date.now(),
      cacheHit,
      memoryFootprint,
    };

    setStats(prev => ({
      ...prev,
      currentProfile: profile,
      history: [...prev.history.slice(-9), profile], // Keep last 10 profiles
    }));

    stagesRef.current = [];
    startTimeRef.current = 0;
  }, []);

  /**
   * Clear profiling history
   */
  const clearHistory = useCallback(() => {
    setStats(prev => ({
      ...prev,
      currentProfile: null,
      history: [],
    }));
  }, []);

  /**
   * Get cache hit ratio from history
   */
  const getCacheHitRatio = useCallback((): number => {
    if (stats.history.length === 0) return 0;
    const hits = stats.history.filter(p => p.cacheHit).length;
    return (hits / stats.history.length) * 100;
  }, [stats.history]);

  /**
   * Get average stage duration
   */
  const getAverageStageDuration = useCallback((stageName: string): number => {
    const stageDurations = stats.history
      .flatMap(p => p.stages)
      .filter(s => s.stage === stageName)
      .map(s => s.duration);
    
    if (stageDurations.length === 0) return 0;
    return stageDurations.reduce((sum, d) => sum + d, 0) / stageDurations.length;
  }, [stats.history]);

  return {
    stats,
    setEnabled,
    startProfiling,
    recordStage,
    measureAsync,
    measureSync,
    endProfiling,
    clearHistory,
    getCacheHitRatio,
    getAverageStageDuration,
  };
}