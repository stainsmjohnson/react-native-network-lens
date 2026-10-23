/**
 * Patches the global XMLHttpRequest so every request made from JavaScript can
 * be observed. `fetch` in React Native is built on XMLHttpRequest, so this also
 * covers fetch, axios, Apollo and friends.
 *
 * Every callback is wrapped in try/catch: the inspector must never break the
 * app's networking.
 */

export interface InterceptedXHR {
  __lensId?: number;
  __lensSeenHeaders?: boolean;
  __lensSeenDone?: boolean;
}

type XHRInstance = XMLHttpRequest & InterceptedXHR;

export interface InterceptorCallbacks {
  onOpen: (method: string, url: string, xhr: XHRInstance) => void;
  onRequestHeader: (header: string, value: string, xhr: XHRInstance) => void;
  onSend: (body: unknown, xhr: XHRInstance) => void;
  onHeadersReceived: (
    status: number,
    contentType: string,
    contentLength: number,
    headers: Record<string, string>,
    xhr: XHRInstance
  ) => void;
  onResponse: (
    status: number,
    timeout: number,
    response: unknown,
    responseURL: string,
    responseType: string,
    xhr: XHRInstance
  ) => void;
  onFailure: (reason: 'error' | 'timeout' | 'abort', xhr: XHRInstance) => void;
}

// XMLHttpRequest readyState values (fixed by the spec).
const HEADERS_RECEIVED = 2;
const DONE = 4;

type Originals = Pick<XMLHttpRequest, 'open' | 'send' | 'setRequestHeader'>;

const noop = () => {};
const noopCallbacks: InterceptorCallbacks = {
  onOpen: noop,
  onRequestHeader: noop,
  onSend: noop,
  onHeadersReceived: noop,
  onResponse: noop,
  onFailure: noop,
};

let callbacks = noopCallbacks;
let originals: Originals | undefined;

const safely = (fn: () => void) => {
  try {
    fn();
  } catch {
    // never let inspector code break a request
  }
};

export const parseResponseHeaders = (raw: string): Record<string, string> => {
  const headers: Record<string, string> = {};
  for (const line of raw.split(/[\r\n]+/)) {
    const index = line.indexOf(':');
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    headers[key] = key in headers ? `${headers[key]}, ${value}` : value;
  }
  return headers;
};

export const isInterceptorEnabled = (): boolean => originals !== undefined;

export const setCallbacks = (next: InterceptorCallbacks) => {
  callbacks = next;
};

const readResponse = (xhr: XMLHttpRequest): unknown => {
  if (xhr.responseType === '' || xhr.responseType === 'text') {
    try {
      return xhr.responseText;
    } catch {
      // responseText throws for some response types on some platforms
    }
  }
  return xhr.response;
};

export const enableInterception = (): void => {
  if (originals || typeof XMLHttpRequest === 'undefined') return;

  const proto = XMLHttpRequest.prototype;
  const saved: Originals = {
    open: proto.open,
    send: proto.send,
    setRequestHeader: proto.setRequestHeader,
  };
  originals = saved;

  proto.open = function open(
    this: XHRInstance,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    safely(() => callbacks.onOpen(method, String(url), this));
    return (saved.open as (...args: unknown[]) => void).call(
      this,
      method,
      url,
      ...rest
    );
  } as XMLHttpRequest['open'];

  proto.setRequestHeader = function setRequestHeader(
    this: XHRInstance,
    header: string,
    value: string
  ) {
    safely(() => callbacks.onRequestHeader(header, value, this));
    return saved.setRequestHeader.call(this, header, value);
  };

  proto.send = function send(this: XHRInstance, body?: unknown) {
    // eslint-disable-next-line consistent-this -- the listeners below outlive `this`
    const xhr = this;
    safely(() => callbacks.onSend(body, xhr));

    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState === HEADERS_RECEIVED && !xhr.__lensSeenHeaders) {
        xhr.__lensSeenHeaders = true;
        safely(() => {
          const length = Number(xhr.getResponseHeader('content-length'));
          callbacks.onHeadersReceived(
            xhr.status,
            xhr.getResponseHeader('content-type') ?? '',
            Number.isFinite(length) ? length : 0,
            parseResponseHeaders(xhr.getAllResponseHeaders()),
            xhr
          );
        });
      }
      if (xhr.readyState === DONE && !xhr.__lensSeenDone) {
        xhr.__lensSeenDone = true;
        safely(() =>
          callbacks.onResponse(
            xhr.status,
            xhr.timeout,
            readResponse(xhr),
            xhr.responseURL,
            xhr.responseType,
            xhr
          )
        );
      }
    });
    for (const reason of ['error', 'timeout', 'abort'] as const) {
      xhr.addEventListener(reason, () =>
        safely(() => callbacks.onFailure(reason, xhr))
      );
    }

    return saved.send.call(this, body as Parameters<XMLHttpRequest['send']>[0]);
  };
};

export const disableInterception = (): void => {
  if (!originals) return;
  Object.assign(XMLHttpRequest.prototype, originals);
  originals = undefined;
  callbacks = noopCallbacks;
};
