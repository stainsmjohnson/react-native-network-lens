import { describe, expect, it } from '@jest/globals';
import {
  parseRequestBody,
  parseResponseBody,
  parseTextBody,
} from '../utils/body';
import { parseUrl } from '../utils/url';
import { findLineMatches, splitHighlights, toLines } from '../utils/search';
import { formatBytes, formatDuration } from '../utils/format';

describe('parseTextBody', () => {
  it('detects JSON objects and pretty prints them', () => {
    const body = parseTextBody('{"a":1,"b":[1,2]}');
    expect(body.kind).toBe('json');
    expect(body.text).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}');
  });
  it('detects url-encoded forms', () => {
    const body = parseTextBody(
      'username=jane&remember=true&note=hello%20world'
    );
    expect(body).toMatchObject({
      kind: 'form',
      value: { username: 'jane', remember: 'true', note: 'hello world' },
    });
  });
  it('falls back to text', () => {
    expect(parseTextBody('<html></html>')).toEqual({
      kind: 'text',
      text: '<html></html>',
    });
    expect(parseTextBody('')).toEqual({ kind: 'empty', text: '' });
  });
});

describe('parseRequestBody', () => {
  it('handles React Native FormData', () => {
    const formData = {
      _parts: [
        ['name', 'x'],
        ['file', { name: 'a.png', type: 'image/png', uri: 'file://a' }],
      ],
    };
    expect(parseRequestBody(formData)).toMatchObject({
      kind: 'form',
      value: { name: 'x', file: '[file a.png (image/png)]' },
    });
  });
  it('describes binary payloads', () => {
    const body = parseRequestBody(new ArrayBuffer(16));
    expect(body).toMatchObject({ kind: 'binary', size: 16 });
  });
});

describe('parseResponseBody', () => {
  it('passes through json responseType objects', async () => {
    const body = await parseResponseBody({ ok: true }, 'json');
    expect(body).toMatchObject({ kind: 'json', value: { ok: true } });
  });
  it('parses text responses that contain JSON', async () => {
    const body = await parseResponseBody('[1,2]', 'text', 'application/json');
    expect(body.kind).toBe('json');
  });
  it('describes non-textual blobs without reading them', async () => {
    const body = await parseResponseBody(
      { size: 1234, type: 'image/png' },
      'blob',
      'image/png'
    );
    expect(body).toMatchObject({
      kind: 'binary',
      size: 1234,
      mimeType: 'image/png',
    });
  });
});

describe('parseUrl', () => {
  it('splits host, path and query without the URL global', () => {
    const parts = parseUrl(
      'https://api.example.com:8443/v1/items?a=1&b=two%20words&a=2#frag'
    );
    expect(parts).toEqual({
      host: 'api.example.com:8443',
      path: '/v1/items',
      query: { a: '1, 2', b: 'two words' },
      hasQuery: true,
    });
  });
  it('copes with relative urls', () => {
    expect(parseUrl('/local/path')).toMatchObject({
      host: '',
      path: '/local/path',
      hasQuery: false,
    });
  });
});

describe('search helpers', () => {
  it('finds matches across lines', () => {
    const lines = ['Foo bar', 'foofoo', 'none'];
    expect(findLineMatches(lines, 'foo')).toEqual([
      { line: 0, start: 0, end: 3 },
      { line: 1, start: 0, end: 3 },
      { line: 1, start: 3, end: 6 },
    ]);
  });
  it('splits highlight segments', () => {
    expect(splitHighlights('a Foo b foo', 'foo')).toEqual([
      { text: 'a ', highlighted: false },
      { text: 'Foo', highlighted: true },
      { text: ' b ', highlighted: false },
      { text: 'foo', highlighted: true },
    ]);
  });
  it('hard wraps absurdly long lines', () => {
    expect(toLines('x'.repeat(4500)).map((l) => l.length)).toEqual([
      2000, 2000, 500,
    ]);
  });
});

describe('format', () => {
  it('formats bytes and durations', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatDuration(42)).toBe('42 ms');
    expect(formatDuration(1500)).toBe('1.50 s');
  });
});
