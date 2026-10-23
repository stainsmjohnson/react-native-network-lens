/**
 * Pure helpers that turn a JSON value into a flat list of visible rows, the way
 * a browser devtools console renders objects. Keeping this free of React makes it
 * easy to test and lets the UI virtualise the rows with a FlatList.
 */

export type JsonValueType =
  'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'undefined';

export interface JsonRow {
  /** Stable identifier: JSON-pointer-like path, e.g. `$.data.items[2].id` */
  path: string;
  key: string | null;
  depth: number;
  type: JsonValueType;
  value: unknown;
  expandable: boolean;
  expanded: boolean;
  childCount: number;
}

export const typeOf = (value: unknown): JsonValueType => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'object') return 'object';
  if (t === 'string') return 'string';
  if (t === 'number' || t === 'bigint') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'undefined';
};

export const isExpandable = (value: unknown): boolean => {
  const type = typeOf(value);
  if (type === 'array') return (value as unknown[]).length > 0;
  if (type === 'object') return Object.keys(value as object).length > 0;
  return false;
};

export const childEntries = (value: unknown): [string, unknown][] => {
  if (Array.isArray(value))
    return value.map((item, index) => [String(index), item]);
  if (value && typeof value === 'object')
    return Object.entries(value as object);
  return [];
};

export const childPath = (
  parent: string,
  key: string,
  parentIsArray: boolean
) => (parentIsArray ? `${parent}[${key}]` : `${parent}.${key}`);

export const ROOT_PATH = '$';

/**
 * Walks the value and returns the rows that are currently visible given the set
 * of expanded paths.
 */
export const flattenJson = (
  value: unknown,
  expanded: ReadonlySet<string>
): JsonRow[] => {
  const rows: JsonRow[] = [];
  const visit = (
    node: unknown,
    key: string | null,
    path: string,
    depth: number
  ) => {
    const type = typeOf(node);
    const expandable = isExpandable(node);
    const isExpanded = expandable && expanded.has(path);
    const children = expandable ? childEntries(node) : [];
    rows.push({
      path,
      key,
      depth,
      type,
      value: node,
      expandable,
      expanded: isExpanded,
      childCount: children.length,
    });
    if (isExpanded) {
      const isArray = type === 'array';
      for (const [childKey, childValue] of children) {
        visit(
          childValue,
          childKey,
          childPath(path, childKey, isArray),
          depth + 1
        );
      }
    }
  };
  visit(value, null, ROOT_PATH, 0);
  return rows;
};

/** Paths of every expandable node up to (and including) `maxDepth`. */
export const pathsToDepth = (value: unknown, maxDepth: number): Set<string> => {
  const result = new Set<string>();
  const visit = (node: unknown, path: string, depth: number) => {
    if (!isExpandable(node)) return;
    if (depth > maxDepth) return;
    result.add(path);
    const isArray = Array.isArray(node);
    for (const [key, child] of childEntries(node)) {
      visit(child, childPath(path, key, isArray), depth + 1);
    }
  };
  visit(value, ROOT_PATH, 0);
  return result;
};

export const allPaths = (value: unknown): Set<string> =>
  pathsToDepth(value, Number.POSITIVE_INFINITY);

/** Paths of every expandable node in the whole tree below `path` (inclusive). */
export const subtreePaths = (value: unknown, path: string): Set<string> => {
  const result = new Set<string>();
  const visit = (node: unknown, nodePath: string) => {
    if (!isExpandable(node)) return;
    result.add(nodePath);
    const isArray = Array.isArray(node);
    for (const [key, child] of childEntries(node))
      visit(child, childPath(nodePath, key, isArray));
  };
  visit(value, path);
  return result;
};

/** Looks a node up by path, walking from the root. */
export const getAtPath = (root: unknown, path: string): unknown => {
  if (path === ROOT_PATH) return root;
  const segments = path
    .slice(ROOT_PATH.length)
    .split(/\.|\[|\]/)
    .filter(Boolean);
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

export interface SearchHit {
  path: string;
  /** Ancestor paths that must be expanded for the hit to be visible. */
  ancestors: string[];
}

const primitiveText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  return String(value);
};

/**
 * Finds every node whose key or primitive value contains `query` (case-insensitive).
 * Returns hits in document order along with the ancestors to expand.
 */
export const searchJson = (value: unknown, query: string): SearchHit[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];
  const visit = (
    node: unknown,
    key: string | null,
    path: string,
    ancestors: string[]
  ) => {
    const keyMatches = key !== null && key.toLowerCase().includes(needle);
    const expandable = isExpandable(node);
    const valueMatches =
      !expandable && primitiveText(node).toLowerCase().includes(needle);
    if (keyMatches || valueMatches) hits.push({ path, ancestors });
    if (expandable) {
      const isArray = Array.isArray(node);
      const nextAncestors = [...ancestors, path];
      for (const [childKey, child] of childEntries(node)) {
        visit(
          child,
          childKey,
          childPath(path, childKey, isArray),
          nextAncestors
        );
      }
    }
  };
  visit(value, null, ROOT_PATH, []);
  return hits;
};

const MAX_PREVIEW_ITEMS = 5;
const MAX_STRING_PREVIEW = 60;

export const previewString = (
  value: string,
  max = MAX_STRING_PREVIEW
): string => (value.length > max ? `${value.slice(0, max)}…` : value);

/** Short inline summary used for collapsed objects/arrays, like `{id, name, …}`. */
export const collapsedPreview = (value: unknown): string => {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value
      .slice(0, MAX_PREVIEW_ITEMS)
      .map((item) => inlineValue(item));
    const more = value.length > MAX_PREVIEW_ITEMS ? ', …' : '';
    return `(${value.length}) [${items.join(', ')}${more}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value as object);
    if (keys.length === 0) return '{}';
    const shown = keys.slice(0, MAX_PREVIEW_ITEMS).join(', ');
    const more = keys.length > MAX_PREVIEW_ITEMS ? ', …' : '';
    return `{${shown}${more}}`;
  }
  return inlineValue(value);
};

export const inlineValue = (value: unknown): string => {
  switch (typeOf(value)) {
    case 'array':
      return `Array(${(value as unknown[]).length})`;
    case 'object':
      return '{…}';
    case 'string':
      return `"${previewString(value as string, 24)}"`;
    case 'null':
      return 'null';
    case 'undefined':
      return 'undefined';
    default:
      return String(value);
  }
};

/** Rough character count of a row, used to size the horizontal scroll area. */
export const rowCharCount = (row: JsonRow, indentChars: number): number => {
  const keyPart = row.key === null ? 0 : row.key.length + 2;
  let valuePart: number;
  if (row.expandable) {
    valuePart = row.expanded
      ? row.type === 'array'
        ? `Array(${row.childCount})`.length
        : `Object (${row.childCount})`.length
      : collapsedPreview(row.value).length;
  } else {
    valuePart = Math.min(displayValue(row.value).length, MAX_VALUE_CHARS);
  }
  return row.depth * indentChars + 2 + keyPart + valuePart;
};

export const MAX_VALUE_CHARS = 400;

export const displayValue = (value: unknown): string => {
  if (typeof value === 'string') return `"${value}"`;
  if (Array.isArray(value)) return '[]'; // only empty arrays reach here
  if (value && typeof value === 'object') return '{}'; // only empty objects reach here
  return primitiveText(value);
};
