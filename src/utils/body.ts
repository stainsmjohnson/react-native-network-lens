import type { ParsedBody } from '../types';
import { byteLength } from './format';
import { parseQueryString } from './url';

const EMPTY: ParsedBody = { kind: 'empty', text: '' };

type FormDataLike = { _parts?: unknown[] };

const isFormDataLike = (value: unknown): value is FormDataLike =>
  !!value &&
  typeof value === 'object' &&
  Array.isArray((value as FormDataLike)._parts);

const formPartsToRecord = (parts: unknown[]): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const part of parts) {
    if (!Array.isArray(part)) continue;
    const [name, value] = part as [unknown, unknown];
    const key = String(name);
    if (value && typeof value === 'object') {
      const file = value as { name?: string; type?: string; uri?: string };
      result[key] = `[file${file.name ? ` ${file.name}` : ''}${
        file.type ? ` (${file.type})` : ''
      }]`;
    } else {
      result[key] = String(value);
    }
  }
  return result;
};

const looksLikeUrlEncoded = (text: string, contentType?: string) => {
  if (contentType?.includes('application/x-www-form-urlencoded')) return true;
  if (text.length > 10_000) return false;
  if (/[\s{}[\]"]/.test(text)) return false;
  return /^[^=&]+=[^&]*(&[^=&]+=[^&]*)*$/.test(text);
};

export const stringifyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2) ?? '';
  } catch {
    return String(value);
  }
};

export const tryParseJson = (
  text: string
): { ok: true; value: unknown } | { ok: false } => {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false };
  const first = trimmed[0];
  if (
    first !== '{' &&
    first !== '[' &&
    first !== '"' &&
    !/^[-\d tfn]/.test(first ?? '')
  ) {
    return { ok: false };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return { ok: false };
  }
};

export const parseTextBody = (
  text: string,
  contentType?: string
): ParsedBody => {
  if (!text) return EMPTY;
  const json = tryParseJson(text);
  if (
    json.ok &&
    (typeof json.value === 'object' || Array.isArray(json.value))
  ) {
    return { kind: 'json', value: json.value, text: stringifyJson(json.value) };
  }
  if (looksLikeUrlEncoded(text, contentType)) {
    const value = parseQueryString(text);
    return { kind: 'form', value, text: stringifyJson(value) };
  }
  return { kind: 'text', text };
};

const describeBinary = (value: unknown, mimeType?: string): ParsedBody => {
  let size = 0;
  let label = 'binary';
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    size = value.byteLength;
    label = 'ArrayBuffer';
  } else if (value && typeof value === 'object') {
    const v = value as { size?: number; byteLength?: number; type?: string };
    size = v.size ?? v.byteLength ?? 0;
    label = typeof v.size === 'number' ? 'Blob' : label;
    mimeType = mimeType || v.type;
  }
  const text = `[${label}${mimeType ? ` ${mimeType}` : ''}${
    size ? `, ${size} bytes` : ''
  }]`;
  return { kind: 'binary', text, size, mimeType };
};

/**
 * Normalises whatever was passed to `xhr.send()`.
 */
export const parseRequestBody = (
  data: unknown,
  contentType?: string
): ParsedBody => {
  if (data === null || data === undefined || data === '') return EMPTY;
  if (typeof data === 'string') return parseTextBody(data, contentType);
  if (isFormDataLike(data)) {
    const value = formPartsToRecord(data._parts ?? []);
    return { kind: 'form', value, text: stringifyJson(value) };
  }
  if (typeof data === 'object') {
    if (
      typeof ArrayBuffer !== 'undefined' &&
      (data instanceof ArrayBuffer || ArrayBuffer.isView(data))
    ) {
      return describeBinary(data, contentType);
    }
    if ('size' in (data as object) && 'type' in (data as object)) {
      return describeBinary(data, contentType);
    }
    return { kind: 'json', value: data, text: stringifyJson(data) };
  }
  return parseTextBody(String(data), contentType);
};

const readBlobAsText = (blob: unknown): Promise<string> =>
  new Promise((resolve, reject) => {
    const Reader = (globalThis as { FileReader?: new () => FileReaderLike })
      .FileReader;
    if (!Reader) {
      reject(new Error('FileReader is not available'));
      return;
    }
    const reader = new Reader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read blob'));
    try {
      reader.readAsText(blob as Blob);
    } catch (error) {
      reject(error);
    }
  });

interface FileReaderLike {
  result: unknown;
  error: unknown;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  readAsText: (blob: Blob) => void;
}

const TEXTUAL_MIME =
  /json|text|xml|javascript|x-www-form-urlencoded|graphql|html/i;

/**
 * Normalises an XHR response. Blob responses are only decoded when they look textual.
 */
export const parseResponseBody = async (
  response: unknown,
  responseType: string,
  contentType?: string
): Promise<ParsedBody> => {
  if (response === null || response === undefined || response === '')
    return EMPTY;
  if (typeof response === 'string') return parseTextBody(response, contentType);
  if (responseType === 'blob') {
    const mime = contentType || (response as { type?: string }).type;
    if (!mime || TEXTUAL_MIME.test(mime)) {
      try {
        const text = await readBlobAsText(response);
        if (text) return parseTextBody(text, mime);
      } catch {
        // fall through to the binary description
      }
    }
    return describeBinary(response, mime);
  }
  if (responseType === 'arraybuffer' || response instanceof ArrayBuffer) {
    return describeBinary(response, contentType);
  }
  // responseType 'json' (or anything else that is already an object)
  return { kind: 'json', value: response, text: stringifyJson(response) };
};

export const bodySize = (body: ParsedBody): number =>
  body.kind === 'binary' ? body.size : byteLength(body.text);
