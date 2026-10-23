export interface LineMatch {
  line: number;
  start: number;
  end: number;
}

/** Finds every (case-insensitive) occurrence of `query` in `lines`. */
export const findLineMatches = (
  lines: readonly string[],
  query: string
): LineMatch[] => {
  const needle = query.toLowerCase();
  if (!needle) return [];
  const matches: LineMatch[] = [];
  lines.forEach((line, index) => {
    const haystack = line.toLowerCase();
    let from = 0;
    while (from <= haystack.length - needle.length) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) break;
      matches.push({ line: index, start: at, end: at + needle.length });
      from = at + Math.max(needle.length, 1);
    }
  });
  return matches;
};

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

/** Splits `text` into highlighted / plain segments for the given query. */
export const splitHighlights = (text: string, query: string): TextSegment[] => {
  const needle = query.toLowerCase();
  if (!needle || !text) return [{ text, highlighted: false }];
  const haystack = text.toLowerCase();
  const segments: TextSegment[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const at = haystack.indexOf(needle, cursor);
    if (at === -1) break;
    if (at > cursor)
      segments.push({ text: text.slice(cursor, at), highlighted: false });
    segments.push({
      text: text.slice(at, at + needle.length),
      highlighted: true,
    });
    cursor = at + needle.length;
  }
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), highlighted: false });
  return segments;
};

export const MAX_LINE_CHARS = 2000;

/** Splits text into lines, hard-wrapping absurdly long ones so layout stays sane. */
export const toLines = (text: string): string[] => {
  const lines = text.split(/\r?\n/);
  const result: string[] = [];
  for (const line of lines) {
    if (line.length <= MAX_LINE_CHARS) {
      result.push(line);
      continue;
    }
    for (let i = 0; i < line.length; i += MAX_LINE_CHARS) {
      result.push(line.slice(i, i + MAX_LINE_CHARS));
    }
  }
  return result;
};
