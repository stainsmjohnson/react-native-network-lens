import { useEffect, useState, useSyncExternalStore } from 'react';
import logger from './core/loggerSingleton';
import type NetworkRequest from './core/NetworkRequest';

/** Live list of captured requests, newest first. */
export const useNetworkRequests = (): NetworkRequest[] =>
  useSyncExternalStore(
    logger.subscribe,
    logger.getSnapshot,
    logger.getSnapshot
  );

const getEnabled = () => logger.enabled;
const getPaused = () => logger.isPaused();

export const useLoggerEnabled = (): boolean =>
  useSyncExternalStore(logger.subscribe, getEnabled, getEnabled);

export const useLoggerPaused = (): boolean =>
  useSyncExternalStore(logger.subscribe, getPaused, getPaused);

/** Resolves a promise factory, re-running whenever `deps` change. */
export const useAsyncValue = <T>(
  factory: () => Promise<T>,
  deps: readonly unknown[]
): { value: T | undefined; loading: boolean } => {
  const [state, setState] = useState<{
    value: T | undefined;
    loading: boolean;
  }>({
    value: undefined,
    loading: true,
  });
  useEffect(() => {
    let cancelled = false;
    setState((prev) => (prev.loading ? prev : { ...prev, loading: true }));
    factory().then(
      (value) => {
        if (!cancelled) setState({ value, loading: false });
      },
      () => {
        if (!cancelled) setState({ value: undefined, loading: false });
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
};
