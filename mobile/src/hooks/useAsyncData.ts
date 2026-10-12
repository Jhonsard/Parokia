/**
 * Minimal data-fetching hook: loading, error, pull-to-refresh and a manual
 * ``reload`` — without pulling a query library into the mobile bundle.
 */

import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';

import { describeError } from '../api/client';

export interface AsyncDataState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  setData: (data: T | null) => void;
}

/**
 * Run ``loader`` on mount and whenever ``deps`` change.
 *
 * ``loader`` is intentionally not part of the dependency list: callers wrap it
 * in ``useCallback`` and list the real inputs in ``deps``.
 */
export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList = []): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (mode: 'initial' | 'refresh'): Promise<void> => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const result = await loaderRef.current();
      if (mounted.current) {
        setData(result);
        setError(null);
      }
    } catch (caught) {
      if (mounted.current) {
        setError(describeError(caught));
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // ``deps`` is forwarded by the caller on purpose.
  }, deps);

  useEffect(() => {
    void run('initial');
  }, [run]);

  const reload = useCallback(() => run('initial'), [run]);
  const refresh = useCallback(() => run('refresh'), [run]);

  return { data, error, loading, refreshing, reload, refresh, setData };
}
