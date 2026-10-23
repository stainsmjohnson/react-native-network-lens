import type {
  FailureReason,
  Headers,
  NetworkRequestRow,
  ParsedBody,
  RequestMethod,
  RequestState,
  StatusGroup,
} from '../types';
import { parseRequestBody, parseResponseBody } from '../utils/body';
import { parseUrl, type UrlParts } from '../utils/url';

const getHeader = (headers: Headers, name: string): string | undefined => {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key];
  }
  return undefined;
};

export const statusGroupOf = (
  status: number,
  state: RequestState
): StatusGroup => {
  if (state === 'failed') return 'failed';
  if (state === 'pending' || status <= 0) return 'pending';
  if (status < 200) return '1xx';
  if (status < 300) return '2xx';
  if (status < 400) return '3xx';
  if (status < 500) return '4xx';
  return '5xx';
};

export default class NetworkRequest {
  readonly id: string;
  readonly type = 'XMLHttpRequest';
  readonly method: RequestMethod;
  readonly url: string;
  status = -1;
  state: RequestState = 'pending';
  failureReason?: FailureReason;
  requestHeaders: Headers = {};
  responseHeaders: Headers = {};
  dataSent: unknown = null;
  response: unknown = null;
  responseType = '';
  responseURL = '';
  responseContentType = '';
  responseSize = 0;
  timeout = 0;
  startTime = 0;
  endTime = 0;
  gqlOperation?: string;
  updatedAt: number;

  private urlParts?: UrlParts;
  private requestBodyCache?: ParsedBody;
  private responseBodyCache?: Promise<ParsedBody>;
  private responseBodyVersion = -1;

  constructor(id: string, method: RequestMethod, url: string) {
    this.id = id;
    this.method = (method || 'GET').toUpperCase();
    this.url = url;
    this.updatedAt = Date.now();
  }

  get duration(): number {
    if (!this.startTime) return -1;
    if (!this.endTime) return -1;
    return this.endTime - this.startTime;
  }

  get parsedUrl(): UrlParts {
    if (!this.urlParts) this.urlParts = parseUrl(this.url);
    return this.urlParts;
  }

  get host(): string {
    return this.parsedUrl.host;
  }

  get path(): string {
    return this.parsedUrl.path;
  }

  get statusGroup(): StatusGroup {
    return statusGroupOf(this.status, this.state);
  }

  get requestContentType(): string | undefined {
    return getHeader(this.requestHeaders, 'content-type');
  }

  update(values: Partial<NetworkRequest>): void {
    Object.assign(this, values);
    if ('dataSent' in values) {
      this.requestBodyCache = undefined;
      const body = this.getRequestBody();
      if (
        body.kind === 'json' &&
        body.value &&
        typeof body.value === 'object'
      ) {
        const op = (body.value as { operationName?: unknown }).operationName;
        if (typeof op === 'string') this.gqlOperation = op;
      }
    }
    this.updatedAt = Date.now();
  }

  getRequestBody(): ParsedBody {
    if (!this.requestBodyCache) {
      this.requestBodyCache = parseRequestBody(
        this.dataSent,
        this.requestContentType
      );
    }
    return this.requestBodyCache;
  }

  /**
   * Resolves the response body. Blob responses are read asynchronously, hence the promise.
   * Result is cached until the response changes.
   */
  getResponseBody(): Promise<ParsedBody> {
    if (
      !this.responseBodyCache ||
      this.responseBodyVersion !== this.updatedAt
    ) {
      this.responseBodyVersion = this.updatedAt;
      this.responseBodyCache = parseResponseBody(
        this.response,
        this.responseType,
        this.responseContentType
      ).catch(
        () =>
          ({
            kind: 'text',
            text: '[Unable to read response body]',
          }) as ParsedBody
      );
    }
    return this.responseBodyCache;
  }

  get curl(): string {
    const parts = ['curl'];
    if (this.method !== 'GET') parts.push(`-X ${this.method}`);
    for (const [key, value] of Object.entries(this.requestHeaders)) {
      parts.push(`-H ${shellQuote(`${key}: ${value}`)}`);
    }
    const body = this.getRequestBody();
    if (body.kind === 'json' || body.kind === 'text') {
      parts.push(
        `--data-raw ${shellQuote(body.kind === 'json' ? JSON.stringify(body.value) : body.text)}`
      );
    } else if (body.kind === 'form') {
      for (const [key, value] of Object.entries(body.value)) {
        parts.push(`-F ${shellQuote(`${key}=${value}`)}`);
      }
    }
    parts.push(shellQuote(this.url));
    return parts.join(' \\\n  ');
  }

  toRow(): NetworkRequestRow {
    return {
      id: this.id,
      method: this.method,
      url: this.url,
      host: this.host,
      path: this.path,
      status: this.status,
      state: this.state,
      statusGroup: this.statusGroup,
      failureReason: this.failureReason,
      duration: this.duration,
      startTime: this.startTime,
      responseSize: this.responseSize,
      gqlOperation: this.gqlOperation,
      updatedAt: this.updatedAt,
    };
  }

  async toJSON(): Promise<Record<string, unknown>> {
    const response = await this.getResponseBody();
    const request = this.getRequestBody();
    return {
      id: this.id,
      method: this.method,
      url: this.url,
      status: this.status,
      state: this.state,
      failureReason: this.failureReason,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      requestHeaders: this.requestHeaders,
      requestBody:
        request.kind === 'json' || request.kind === 'form'
          ? request.value
          : request.text,
      responseHeaders: this.responseHeaders,
      responseBody:
        response.kind === 'json' || response.kind === 'form'
          ? response.value
          : response.text,
      responseSize: this.responseSize,
      responseContentType: this.responseContentType,
    };
  }
}

export const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;
