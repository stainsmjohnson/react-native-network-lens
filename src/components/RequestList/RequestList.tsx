import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { FlatList, Share, StyleSheet, Text, View } from 'react-native';
import type NetworkRequest from '../../core/NetworkRequest';
import { useTheme } from '../../theme';
import type { NetworkRequestRow } from '../../types';
import {
  ActionSheet,
  EmptyState,
  IconButton,
  SearchInput,
  type ActionItem,
} from '../ui';
import FilterBar from './FilterBar';
import RequestRow from './RequestRow';
import {
  applyFilter,
  collectHosts,
  collectMethods,
  emptyFilter,
  isFilterActive,
  type RequestFilter,
} from './filters';

interface Props {
  requests: NetworkRequest[];
  sort: 'asc' | 'desc';
  compact: boolean;
  maxRows?: number;
  paused: boolean;
  loggingEnabled: boolean;
  onPressItem: (id: string) => void;
  menuActions: ActionItem[];
  /** Optional row rendered above the search bar (used by the overlay for title + close). */
  header?: ReactNode;
}

const keyExtractor = (row: NetworkRequestRow) => row.id;

const summaryText = (total: number, shown: number, failed: number) => {
  const parts = [`${total} request${total === 1 ? '' : 's'}`];
  if (shown !== total) parts.push(`${shown} shown`);
  if (failed) parts.push(`${failed} with errors`);
  return parts.join(' · ');
};

const RequestList = ({
  requests,
  sort,
  compact,
  maxRows,
  paused,
  loggingEnabled,
  onPressItem,
  menuActions,
  header,
}: Props) => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RequestFilter>(emptyFilter);
  const [showFilters, setShowFilters] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const rows = useMemo(() => {
    const mapped = requests.map((request) => request.toRow());
    return sort === 'asc' ? mapped.reverse() : mapped;
  }, [requests, sort]);

  const filtered = useMemo(() => {
    const result = applyFilter(rows, search, filter);
    return maxRows ? result.slice(0, maxRows) : result;
  }, [rows, search, filter, maxRows]);

  const methods = useMemo(() => collectMethods(rows), [rows]);
  const hosts = useMemo(() => collectHosts(rows), [rows]);
  const failedCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.statusGroup === 'failed' ||
          r.statusGroup === '4xx' ||
          r.statusGroup === '5xx'
      ).length,
    [rows]
  );

  const onLongPress = useCallback(
    (id: string) => {
      const request = requests.find((r) => r.id === id);
      if (request)
        Share.share({ message: request.curl }).catch(() => undefined);
    },
    [requests]
  );

  const renderItem = useCallback(
    ({ item }: { item: NetworkRequestRow }) => (
      <RequestRow
        row={item}
        compact={compact}
        onPress={onPressItem}
        onLongPress={onLongPress}
      />
    ),
    [compact, onPressItem, onLongPress]
  );

  const emptyState = !loggingEnabled ? (
    <EmptyState
      title="Network logging is disabled"
      subtitle="Call startNetworkLogging() with enabled: true before rendering the inspector."
    />
  ) : rows.length === 0 ? (
    <EmptyState
      title="No requests yet"
      subtitle="Requests made with fetch, axios or XMLHttpRequest will appear here."
    />
  ) : (
    <EmptyState
      title="No matching requests"
      subtitle="Try a different search term or clear the filters."
    />
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        {header}
        <View style={styles.searchRow}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Filter by URL, method or status"
            style={styles.search}
          />
          <IconButton
            glyph="≡"
            accessibilityLabel="Toggle filters"
            active={showFilters || isFilterActive(filter)}
            onPress={() => setShowFilters((v) => !v)}
          />
          <IconButton
            glyph="⋮"
            accessibilityLabel="More options"
            onPress={() => setMenuVisible(true)}
          />
        </View>
      </View>
      {showFilters && (
        <FilterBar
          filter={filter}
          onChange={setFilter}
          methods={methods}
          hosts={hosts}
          onClear={() => setFilter(emptyFilter())}
        />
      )}
      <View
        style={[
          styles.statusBar,
          {
            backgroundColor: paused
              ? theme.colors.statusWarning
              : theme.colors.surfaceAlt,
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            paused
              ? styles.statusTextPaused
              : { color: theme.colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {paused
            ? 'Paused — new requests are captured but hidden until you resume'
            : summaryText(rows.length, filtered.length, failedCount)}
        </Text>
      </View>
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={15}
        windowSize={7}
        ListEmptyComponent={emptyState}
        contentContainerStyle={filtered.length === 0 && styles.emptyContent}
      />
      <ActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        actions={menuActions}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  search: { flex: 1 },
  statusBar: { paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextPaused: { color: '#ffffff' },
  emptyContent: { flexGrow: 1 },
});

export default RequestList;
