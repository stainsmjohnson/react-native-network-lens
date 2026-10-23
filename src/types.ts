export type Headers = Record<string, string>;

export type RequestMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | (string & {});

/** Lifecycle of a captured request. */
export type RequestState = 'pending' | 'done' | 'failed';

export type FailureReason = 'error' | 'timeout' | 'abort';

export type StatusGroup =
  '1xx' | '2xx' | '3xx' | '4xx' | '5xx' | 'pending' | 'failed';

export interface NetworkLensOptions {
  /**
   * Master switch. When `false` nothing is intercepted and every UI component
   * renders nothing, so you can wire it to `__DEV__` or a remote feature flag.
   * @default true
   */
  enabled?: boolean;
  /**
   * Max number of requests to keep before the oldest ones are dropped.
   * @default 500
   */
  maxRequests?: number;
  /** Hosts to ignore, e.g. `services.test.com` */
  ignoredHosts?: string[];
  /** Exact urls to ignore, e.g. `https://services.test.com/test` */
  ignoredUrls?: string[];
  /**
   * Patterns to ignore. They are tested against `${method} ${url}`,
   * e.g. `/^GET https:\/\/test\.com\/pages\/.*$/`
   */
  ignoredPatterns?: RegExp[];
  /**
   * How often (ms) the UI is notified about new data.
   * @default 50
   */
  refreshRate?: number;
}

/** @deprecated use `NetworkLensOptions` */
export type StartNetworkLoggingOptions = NetworkLensOptions;

/**
 * A body after we tried to understand it.
 * `text` is always the raw textual representation used by the "Raw" view.
 */
export type ParsedBody =
  | { kind: 'empty'; text: '' }
  | { kind: 'json'; value: unknown; text: string }
  | { kind: 'form'; value: Record<string, string>; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'binary'; text: string; size: number; mimeType?: string };

/** Light-weight projection of a request used by list rows. */
export interface NetworkRequestRow {
  id: string;
  method: RequestMethod;
  url: string;
  host: string;
  path: string;
  status: number;
  state: RequestState;
  statusGroup: StatusGroup;
  failureReason?: FailureReason;
  duration: number;
  startTime: number;
  responseSize: number;
  gqlOperation?: string;
  updatedAt: number;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
