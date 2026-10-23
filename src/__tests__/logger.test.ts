import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import Logger from '../core/Logger';
import { isInterceptorEnabled } from '../core/XHRInterceptor';

/**
 * Minimal fake XMLHttpRequest so we can drive the interceptor deterministically.
 */
class FakeXHR {
  static instances: FakeXHR[] = [];
  readyState = 0;
  status = 0;
  timeout = 0;
  responseType = '';
  responseURL = '';
  response: unknown = null;
  responseText = '';
  private listeners: Record<string, (() => void)[]> = {};
  private responseHeaders = '';

  constructor() {
    FakeXHR.instances.push(this);
  }
  open(_method: string, url: string) {
    this.responseURL = url;
  }
  setRequestHeader(_name: string, _value: string) {}
  send(_body?: unknown) {}
  addEventListener(type: string, listener: () => void) {
    (this.listeners[type] ??= []).push(listener);
  }
  getAllResponseHeaders() {
    return this.responseHeaders;
  }
  getResponseHeader(name: string) {
    const line = this.responseHeaders
      .split('\r\n')
      .find((l) => l.toLowerCase().startsWith(`${name.toLowerCase()}:`));
    return line ? line.slice(line.indexOf(':') + 1).trim() : null;
  }
  // test helpers
  respond(
    status: number,
    body: string,
    headers = 'Content-Type: application/json\r\nContent-Length: 12'
  ) {
    this.responseHeaders = headers;
    this.status = status;
    this.readyState = 2;
    this.listeners.readystatechange?.forEach((l) => l());
    this.readyState = 4;
    this.responseText = body;
    this.response = body;
    this.listeners.readystatechange?.forEach((l) => l());
  }
  fail(reason: 'error' | 'timeout' | 'abort') {
    this.readyState = 4;
    this.status = 0;
    this.listeners.readystatechange?.forEach((l) => l());
    this.listeners[reason]?.forEach((l) => l());
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 60));

describe('Logger', () => {
  let logger: Logger;
  const originalXHR = (globalThis as { XMLHttpRequest?: unknown })
    .XMLHttpRequest;

  beforeEach(() => {
    FakeXHR.instances = [];
    (globalThis as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXHR;
    logger = new Logger();
  });

  afterEach(() => {
    logger.stop();
    (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = originalXHR;
  });

  const request = (method: string, url: string, body?: unknown) => {
    const xhr = new (
      globalThis as unknown as { XMLHttpRequest: new () => FakeXHR }
    ).XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send(body);
    return xhr;
  };

  it('is a no-op when enabled is false', () => {
    logger.start({ enabled: false });
    expect(logger.enabled).toBe(false);
    expect(isInterceptorEnabled()).toBe(false);
    request('GET', 'https://a.com/x');
    expect(logger.getRequests()).toHaveLength(0);
  });

  it('captures a full request lifecycle', async () => {
    logger.start();
    const listener = jest.fn();
    logger.subscribe(listener);

    const xhr = request(
      'POST',
      'https://api.test.com/items?x=1',
      '{"operationName":"Op","a":1}'
    );
    xhr.respond(201, '{"ok":true}');
    await flush();

    expect(listener).toHaveBeenCalled();
    const [captured] = logger.getRequests();
    expect(captured).toBeDefined();
    expect(captured!.method).toBe('POST');
    expect(captured!.host).toBe('api.test.com');
    expect(captured!.path).toBe('/items');
    expect(captured!.status).toBe(201);
    expect(captured!.state).toBe('done');
    expect(captured!.requestHeaders).toEqual({ Accept: 'application/json' });
    expect(captured!.responseHeaders).toEqual({
      'Content-Type': 'application/json',
      'Content-Length': '12',
    });
    expect(captured!.responseSize).toBe(12);
    expect(captured!.gqlOperation).toBe('Op');
    expect(captured!.getRequestBody()).toMatchObject({
      kind: 'json',
      value: { operationName: 'Op', a: 1 },
    });
    await expect(captured!.getResponseBody()).resolves.toMatchObject({
      kind: 'json',
      value: { ok: true },
    });
    expect(captured!.curl).toContain("-H 'Accept: application/json'");
    expect(captured!.curl).toContain("'https://api.test.com/items?x=1'");
  });

  it('measures the body when Content-Length is missing', async () => {
    logger.start();
    const xhr = request('GET', 'https://api.test.com/items');
    xhr.respond(200, '{"ok":true}', 'Content-Type: application/json');
    await flush();
    expect(logger.getRequests()[0]?.responseSize).toBe(11);
  });

  it('marks failures with their reason', async () => {
    logger.start();
    const xhr = request('GET', 'https://api.test.com/slow');
    xhr.fail('timeout');
    await flush();
    expect(logger.getRequests()[0]).toMatchObject({
      state: 'failed',
      failureReason: 'timeout',
      statusGroup: 'failed',
    });
  });

  it('respects ignore rules', async () => {
    logger.start({
      ignoredHosts: ['ignored.com'],
      ignoredUrls: ['https://a.com/exact'],
      ignoredPatterns: [/^GET https:\/\/a\.com\/pattern/],
    });
    request('GET', 'https://ignored.com/x');
    request('GET', 'https://a.com/exact');
    request('GET', 'https://a.com/pattern/1');
    request('POST', 'https://a.com/pattern/1');
    request('GET', 'https://a.com/kept');
    await flush();
    expect(logger.getRequests().map((r) => `${r.method} ${r.url}`)).toEqual([
      'GET https://a.com/kept',
      'POST https://a.com/pattern/1',
    ]);
  });

  it('keeps at most maxRequests, newest first', async () => {
    logger.start({ maxRequests: 2 });
    request('GET', 'https://a.com/1');
    request('GET', 'https://a.com/2');
    request('GET', 'https://a.com/3');
    await flush();
    expect(logger.getRequests().map((r) => r.url)).toEqual([
      'https://a.com/3',
      'https://a.com/2',
    ]);
  });

  it('pauses publishing but keeps capturing', async () => {
    logger.start();
    request('GET', 'https://a.com/1');
    await flush();
    logger.setPaused(true);
    request('GET', 'https://a.com/2');
    await flush();
    expect(logger.getRequests()).toHaveLength(1);
    logger.setPaused(false);
    expect(logger.getRequests()).toHaveLength(2);
  });

  it('restores XMLHttpRequest on stop', () => {
    const before = FakeXHR.prototype.send;
    logger.start();
    expect(FakeXHR.prototype.send).not.toBe(before);
    logger.stop();
    expect(FakeXHR.prototype.send).toBe(before);
    expect(logger.getRequests()).toEqual([]);
  });
});
