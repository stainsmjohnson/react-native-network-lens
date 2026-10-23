import type { NetworkRequestRow, StatusGroup } from '../../types';

export interface RequestFilter {
  methods: Set<string>;
  statusGroups: Set<StatusGroup>;
  hosts: Set<string>;
}

export const emptyFilter = (): RequestFilter => ({
  methods: new Set(),
  statusGroups: new Set(),
  hosts: new Set(),
});

export const isFilterActive = (filter: RequestFilter): boolean =>
  filter.methods.size > 0 ||
  filter.statusGroups.size > 0 ||
  filter.hosts.size > 0;

export const STATUS_GROUPS: StatusGroup[] = [
  '2xx',
  '3xx',
  '4xx',
  '5xx',
  'pending',
  'failed',
];

export const applyFilter = (
  rows: NetworkRequestRow[],
  search: string,
  filter: RequestFilter
): NetworkRequestRow[] => {
  const needle = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (needle) {
      const haystack =
        `${row.method} ${row.url} ${row.gqlOperation ?? ''} ${row.status}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (filter.methods.size && !filter.methods.has(row.method)) return false;
    if (filter.statusGroups.size && !filter.statusGroups.has(row.statusGroup))
      return false;
    if (filter.hosts.size && !filter.hosts.has(row.host)) return false;
    return true;
  });
};

const toggleIn = <T>(set: Set<T>, value: T): Set<T> => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
};

export const toggleMethod = (
  filter: RequestFilter,
  method: string
): RequestFilter => ({
  ...filter,
  methods: toggleIn(filter.methods, method),
});

export const toggleStatusGroup = (
  filter: RequestFilter,
  group: StatusGroup
): RequestFilter => ({
  ...filter,
  statusGroups: toggleIn(filter.statusGroups, group),
});

export const toggleHost = (
  filter: RequestFilter,
  host: string
): RequestFilter => ({
  ...filter,
  hosts: toggleIn(filter.hosts, host),
});

/** Hosts seen in the captured requests, most frequent first. */
export const collectHosts = (rows: NetworkRequestRow[]): string[] => {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.host, (counts.get(row.host) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([host]) => host);
};

export const collectMethods = (rows: NetworkRequestRow[]): string[] => {
  const seen = new Set<string>();
  for (const row of rows) seen.add(row.method);
  const order = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  return [...seen].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
};
