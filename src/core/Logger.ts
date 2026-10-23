import NetworkRequest from './NetworkRequest';
import * as XHRInterceptor from './XHRInterceptor';
import type { NetworkLensOptions, RequestMethod } from '../types';
import debounce from '../utils/debounce';
import { extractHost } from '../utils/url';
import { byteLength } from '../utils/format';
import { warn } from '../utils/logger';

export const DEFAULT_MAX_REQUESTS = 500;

/** Best-effort byte size when the server sent no Content-Length. */
const measureResponse = (response: unknown): number => {
  if (typeof response === 'string') return byteLength(response);
  if (response && typeof response === 'object') {
    const sized = response as { size?: unknown; byteLength?: unknown };
    if (typeof sized.size === 'number') return sized.size; // Blob
    if (typeof sized.byteLength === 'number') return sized.byteLength; // ArrayBuffer
    try {
      return byteLength(JSON.stringify(response));
    } catch {
      return 0;
    }
  }
  return 0;
};
export const DEFAULT_REFRESH_RATE = 50;

type Listener = () => void;

/**
 * Central store. Holds the captured requests (newest first) and publishes an
 * immutable snapshot that React reads through `useSyncExternalStore`.
 */
export default class Logger {
  private requests: NetworkRequest[] = [];
  private snapshot: NetworkRequest[] = [];
  private byXhrId = new Map<number, NetworkRequest>();
  private listeners = new Set<Listener>();
  private nextId = 0;
  private maxRequests = DEFAULT_MAX_REQUESTS;
  private refreshRate = DEFAULT_REFRESH_RATE;
  private ignoredHosts?: Set<string>;
  private ignoredUrls?: Set<string>;
  private ignoredPatterns?: RegExp[];
  private paused = false;
  private dirty = false;
  private publishDebounced = debounce(() => this.publish(), this.refreshRate);

  /** True while XMLHttpRequest is being intercepted by this logger. */
  enabled = false;

  // ---------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): NetworkRequest[] => this.snapshot;

  isPaused = (): boolean => this.paused;

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private publish() {
    if (this.paused) return;
    if (!this.dirty) return;
    this.dirty = false;
    this.snapshot = this.requests.slice();
    this.emit();
  }

  private schedulePublish() {
    this.dirty = true;
    this.publishDebounced();
  }

  // ---------------------------------------------------------------------
  // Interceptor callbacks
  // ---------------------------------------------------------------------

  private isIgnored(method: string, url: string): boolean {
    if (this.ignoredHosts?.has(extractHost(url))) return true;
    if (this.ignoredUrls?.has(url)) return true;
    if (
      this.ignoredPatterns?.some((pattern) => pattern.test(`${method} ${url}`))
    )
      return true;
    return false;
  }

  private onOpen = (
    method: RequestMethod,
    url: string,
    xhr: XHRInterceptor.InterceptedXHR
  ) => {
    if (this.isIgnored(method, url)) return;
    const id = this.nextId++;
    xhr.__lensId = id;
    const request = new NetworkRequest(String(id), method, url);
    this.byXhrId.set(id, request);
    this.requests.unshift(request);
    while (this.requests.length > this.maxRequests) {
      const dropped = this.requests.pop();
      if (dropped) this.byXhrId.delete(Number(dropped.id));
    }
    this.schedulePublish();
  };

  private get = (xhr: XHRInterceptor.InterceptedXHR) =>
    xhr.__lensId === undefined ? undefined : this.byXhrId.get(xhr.__lensId);

  private onRequestHeader = (
    header: string,
    value: string,
    xhr: XHRInterceptor.InterceptedXHR
  ) => {
    const request = this.get(xhr);
    if (!request) return;
    request.requestHeaders[header] = value;
  };

  private onSend = (body: unknown, xhr: XHRInterceptor.InterceptedXHR) => {
    const request = this.get(xhr);
    if (!request) return;
    request.update({ startTime: Date.now(), dataSent: body });
    this.schedulePublish();
  };

  private onHeadersReceived = (
    status: number,
    contentType: string,
    contentLength: number,
    headers: Record<string, string>,
    xhr: XHRInterceptor.InterceptedXHR
  ) => {
    const request = this.get(xhr);
    if (!request) return;
    request.update({
      status,
      responseContentType: contentType,
      responseSize: contentLength,
      responseHeaders: headers,
    });
    this.schedulePublish();
  };

  private onResponse = (
    status: number,
    timeout: number,
    response: unknown,
    responseURL: string,
    responseType: string,
    xhr: XHRInterceptor.InterceptedXHR
  ) => {
    const request = this.get(xhr);
    if (!request) return;
    const failed = status <= 0;
    request.update({
      endTime: Date.now(),
      status,
      timeout,
      response,
      responseURL,
      responseType,
      state: failed ? 'failed' : 'done',
      failureReason: failed ? (request.failureReason ?? 'error') : undefined,
    });
    if (!failed && !request.responseSize) {
      request.responseSize = measureResponse(response);
    }
    this.schedulePublish();
  };

  private onFailure = (
    reason: 'error' | 'timeout' | 'abort',
    xhr: XHRInterceptor.InterceptedXHR
  ) => {
    const request = this.get(xhr);
    if (!request) return;
    request.update({
      state: 'failed',
      failureReason: reason,
      endTime: request.endTime || Date.now(),
    });
    this.schedulePublish();
  };

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  start = (options: NetworkLensOptions = {}): void => {
    if (options.enabled === false) {
      if (this.enabled) this.stop();
      return;
    }
    if (this.enabled) return;

    if (options.maxRequests !== undefined) {
      if (typeof options.maxRequests !== 'number' || options.maxRequests < 1) {
        warn(
          '`maxRequests` must be a number greater than 0. Using the default.'
        );
      } else {
        this.maxRequests = options.maxRequests;
      }
    }
    if (options.refreshRate !== undefined) {
      if (typeof options.refreshRate !== 'number' || options.refreshRate < 1) {
        warn(
          '`refreshRate` must be a number greater than 0. Using the default.'
        );
      } else {
        this.refreshRate = options.refreshRate;
        this.publishDebounced = debounce(
          () => this.publish(),
          this.refreshRate
        );
      }
    }
    this.ignoredHosts = options.ignoredHosts?.length
      ? new Set(options.ignoredHosts)
      : undefined;
    this.ignoredUrls = options.ignoredUrls?.length
      ? new Set(options.ignoredUrls)
      : undefined;
    this.ignoredPatterns = options.ignoredPatterns?.length
      ? options.ignoredPatterns
      : undefined;

    XHRInterceptor.setCallbacks({
      onOpen: this.onOpen,
      onRequestHeader: this.onRequestHeader,
      onSend: this.onSend,
      onHeadersReceived: this.onHeadersReceived,
      onResponse: this.onResponse,
      onFailure: this.onFailure,
    });
    XHRInterceptor.enableInterception();
    this.enabled = true;
    this.emit();
  };

  stop = (): void => {
    if (!this.enabled) return;
    XHRInterceptor.disableInterception();
    this.publishDebounced.cancel();
    this.enabled = false;
    this.paused = false;
    this.requests = [];
    this.byXhrId.clear();
    this.nextId = 0;
    this.maxRequests = DEFAULT_MAX_REQUESTS;
    this.refreshRate = DEFAULT_REFRESH_RATE;
    this.ignoredHosts = undefined;
    this.ignoredUrls = undefined;
    this.ignoredPatterns = undefined;
    this.snapshot = [];
    this.dirty = false;
    this.emit();
  };

  getRequests = (): NetworkRequest[] => this.snapshot;

  getRequest = (id: string): NetworkRequest | undefined =>
    this.requests.find((request) => request.id === id);

  clear = (): void => {
    this.requests = [];
    this.byXhrId.clear();
    this.snapshot = [];
    this.dirty = false;
    this.emit();
  };

  setPaused = (paused: boolean): void => {
    if (this.paused === paused) return;
    this.paused = paused;
    if (!paused) {
      this.dirty = true;
      this.publish();
    } else {
      this.emit();
    }
  };
}
