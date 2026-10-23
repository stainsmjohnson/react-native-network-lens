/**
 * Tiny URL helpers that do not rely on the `URL` global, because React Native's
 * implementation is incomplete (no `searchParams`, throws on relative urls).
 */

export interface UrlParts {
  host: string;
  path: string;
  query: Record<string, string>;
  hasQuery: boolean;
}

export const extractHost = (url: string): string => {
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url);
  return match?.[1] ?? '';
};

export const parseQueryString = (search: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const trimmed = search.replace(/^\?/, '');
  if (!trimmed) return result;
  for (const pair of trimmed.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    const key = safeDecode(rawKey);
    const value = safeDecode(rawValue);
    // Keep duplicates readable: `a=1&a=2` -> `a: "1, 2"`
    result[key] = key in result ? `${result[key]}, ${value}` : value;
  }
  return result;
};

export const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

export const parseUrl = (url: string): UrlParts => {
  const host = extractHost(url);
  const afterHost = host ? url.slice(url.indexOf(host) + host.length) : url;
  const hashIndex = afterHost.indexOf('#');
  const withoutHash =
    hashIndex === -1 ? afterHost : afterHost.slice(0, hashIndex);
  const qIndex = withoutHash.indexOf('?');
  const path =
    (qIndex === -1 ? withoutHash : withoutHash.slice(0, qIndex)) || '/';
  const search = qIndex === -1 ? '' : withoutHash.slice(qIndex + 1);
  return {
    host,
    path,
    query: parseQueryString(search),
    hasQuery: search.length > 0,
  };
};
