import { describe, expect, it } from '@jest/globals';
import {
  applyFilter,
  collectHosts,
  collectMethods,
  emptyFilter,
  toggleMethod,
  toggleStatusGroup,
} from '../components/RequestList/filters';
import type { NetworkRequestRow } from '../types';

const row = (overrides: Partial<NetworkRequestRow>): NetworkRequestRow => ({
  id: '1',
  method: 'GET',
  url: 'https://a.com/x',
  host: 'a.com',
  path: '/x',
  status: 200,
  state: 'done',
  statusGroup: '2xx',
  duration: 10,
  startTime: 0,
  responseSize: 0,
  updatedAt: 0,
  ...overrides,
});

const rows = [
  row({ id: '1' }),
  row({
    id: '2',
    method: 'POST',
    status: 500,
    statusGroup: '5xx',
    host: 'b.com',
    url: 'https://b.com/y',
    gqlOperation: 'Login',
  }),
  row({
    id: '3',
    method: 'DELETE',
    status: -1,
    state: 'pending',
    statusGroup: 'pending',
    host: 'b.com',
  }),
];

describe('applyFilter', () => {
  it('searches url, method, status and gql operation', () => {
    expect(applyFilter(rows, 'login', emptyFilter()).map((r) => r.id)).toEqual([
      '2',
    ]);
    expect(applyFilter(rows, 'delete', emptyFilter()).map((r) => r.id)).toEqual(
      ['3']
    );
    expect(applyFilter(rows, '500', emptyFilter()).map((r) => r.id)).toEqual([
      '2',
    ]);
  });
  it('combines method and status filters', () => {
    let filter = toggleMethod(emptyFilter(), 'POST');
    filter = toggleMethod(filter, 'DELETE');
    expect(applyFilter(rows, '', filter).map((r) => r.id)).toEqual(['2', '3']);
    filter = toggleStatusGroup(filter, 'pending');
    expect(applyFilter(rows, '', filter).map((r) => r.id)).toEqual(['3']);
  });
  it('collects hosts by frequency and methods in conventional order', () => {
    expect(collectHosts(rows)).toEqual(['b.com', 'a.com']);
    expect(collectMethods(rows)).toEqual(['GET', 'POST', 'DELETE']);
  });
});
