import { describe, expect, it } from '@jest/globals';
import {
  allPaths,
  collapsedPreview,
  flattenJson,
  getAtPath,
  pathsToDepth,
  searchJson,
  subtreePaths,
} from '../components/JsonTree/model';

const sample = {
  id: 1,
  name: 'Lens',
  tags: ['a', 'b'],
  meta: { nested: { deep: true, nothing: null }, count: 3 },
};

describe('flattenJson', () => {
  it('shows only the root when nothing is expanded', () => {
    const rows = flattenJson(sample, new Set());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      path: '$',
      expandable: true,
      expanded: false,
      childCount: 4,
    });
  });

  it('shows direct children when the root is expanded', () => {
    const rows = flattenJson(sample, new Set(['$']));
    expect(rows.map((r) => r.key)).toEqual([
      null,
      'id',
      'name',
      'tags',
      'meta',
    ]);
    expect(rows.find((r) => r.key === 'tags')).toMatchObject({
      type: 'array',
      childCount: 2,
      expanded: false,
    });
  });

  it('uses bracket paths for array items', () => {
    const rows = flattenJson(sample, new Set(['$', '$.tags']));
    expect(rows.map((r) => r.path)).toContain('$.tags[0]');
    expect(rows.find((r) => r.path === '$.tags[1]')).toMatchObject({
      key: '1',
      value: 'b',
      depth: 2,
    });
  });

  it('treats empty containers as not expandable', () => {
    const rows = flattenJson({ a: [], b: {} }, new Set(['$']));
    expect(rows.slice(1).every((r) => !r.expandable)).toBe(true);
  });
});

describe('expansion helpers', () => {
  it('pathsToDepth(1) opens the root and its children only', () => {
    expect([...pathsToDepth(sample, 1)].sort()).toEqual([
      '$',
      '$.meta',
      '$.tags',
    ]);
  });
  it('allPaths includes every container', () => {
    expect([...allPaths(sample)].sort()).toEqual([
      '$',
      '$.meta',
      '$.meta.nested',
      '$.tags',
    ]);
  });
  it('subtreePaths returns containers below a node', () => {
    expect([...subtreePaths(sample.meta, '$.meta')].sort()).toEqual([
      '$.meta',
      '$.meta.nested',
    ]);
  });
  it('getAtPath resolves object and array segments', () => {
    expect(getAtPath(sample, '$.meta.nested.deep')).toBe(true);
    expect(getAtPath(sample, '$.tags[1]')).toBe('b');
    expect(getAtPath(sample, '$.missing.x')).toBeUndefined();
  });
});

describe('searchJson', () => {
  it('matches keys and primitive values case-insensitively with ancestors', () => {
    const hits = searchJson(sample, 'DEEP');
    expect(hits).toEqual([
      {
        path: '$.meta.nested.deep',
        ancestors: ['$', '$.meta', '$.meta.nested'],
      },
    ]);
  });
  it('matches values', () => {
    expect(searchJson(sample, 'lens').map((h) => h.path)).toEqual(['$.name']);
    expect(searchJson(sample, 'null').map((h) => h.path)).toEqual([
      '$.meta.nested.nothing',
    ]);
  });
  it('returns hits in document order and nothing for empty query', () => {
    expect(searchJson(sample, 'n').map((h) => h.path)).toEqual([
      '$.name',
      '$.meta.nested',
      '$.meta.nested.nothing',
      '$.meta.count',
    ]);
    expect(searchJson(sample, '  ')).toEqual([]);
  });
});

describe('collapsedPreview', () => {
  it('summarises objects and arrays like a devtools console', () => {
    expect(collapsedPreview(sample)).toBe('{id, name, tags, meta}');
    expect(collapsedPreview([1, 'two', null, { a: 1 }, [1], 6, 7])).toBe(
      '(7) [1, "two", null, {…}, Array(1), …]'
    );
    expect(collapsedPreview({})).toBe('{}');
  });
});
