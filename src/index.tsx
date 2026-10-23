import logger from './core/loggerSingleton';
import type { NetworkLensOptions } from './types';

export { default as NetworkLens, default } from './components/NetworkLens';
export type {
  NetworkLensProps,
  NetworkLensHandle,
} from './components/NetworkLens';
export { default as NetworkLensOverlay } from './components/NetworkLensOverlay';
export type { NetworkLensOverlayProps } from './components/NetworkLensOverlay';
export { default as JsonTreeView } from './components/JsonTree/JsonTreeView';
export type { JsonTreeHandle } from './components/JsonTree/JsonTreeView';

export { default as NetworkRequest } from './core/NetworkRequest';
export { createHar } from './core/har';
export { getBackHandler } from './backHandler';
export { useNetworkRequests, useLoggerEnabled, useLoggerPaused } from './hooks';
export { lightTheme, darkTheme } from './theme';
export type { Theme, ThemeName, ThemeInput } from './theme';
export type {
  NetworkLensOptions,
  StartNetworkLoggingOptions,
  NetworkRequestRow,
  ParsedBody,
  RequestMethod,
  RequestState,
  FailureReason,
  StatusGroup,
  Headers,
} from './types';

/**
 * Start capturing requests. Call it once, as early as possible (e.g. in your
 * `index.js`). Pass `enabled: false` to turn the whole thing into a no-op.
 *
 * ```ts
 * startNetworkLogging({ enabled: __DEV__, maxRequests: 500 });
 * ```
 */
export const startNetworkLogging = (options?: NetworkLensOptions): void =>
  logger.start(options);

/** Stop capturing, restore XMLHttpRequest and drop every captured request. */
export const stopNetworkLogging = (): void => logger.stop();

/** Whether requests are currently being captured. */
export const isNetworkLoggingEnabled = (): boolean => logger.enabled;

/** Snapshot of captured requests, newest first. */
export const getRequests = () => logger.getRequests();

export const clearRequests = (): void => logger.clear();

/** Pause or resume publishing new requests to the UI. Capturing continues while paused. */
export const setNetworkLoggingPaused = (paused: boolean): void =>
  logger.setPaused(paused);
