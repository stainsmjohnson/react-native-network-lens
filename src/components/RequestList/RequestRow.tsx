import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { methodColor, statusColor, useTheme } from '../../theme';
import type { NetworkRequestRow } from '../../types';
import { formatBytes, formatDuration, formatTime } from '../../utils/format';
import { Pill } from '../ui';

interface Props {
  row: NetworkRequestRow;
  compact: boolean;
  onPress: (id: string) => void;
  onLongPress?: (id: string) => void;
}

const RequestRow = ({ row, compact, onPress, onLongPress }: Props) => {
  const theme = useTheme();
  const failed = row.state === 'failed';
  const pending = row.state === 'pending';
  const color = statusColor(theme, row.status, failed);
  const statusLabel = failed
    ? (row.failureReason ?? 'ERR').toUpperCase()
    : row.status > 0
      ? String(row.status)
      : '…';
  const pathAndQuery =
    row.url.slice(row.url.indexOf(row.host) + row.host.length) || row.url;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.method} ${row.url}, status ${statusLabel}`}
      onPress={() => onPress(row.id)}
      onLongPress={onLongPress ? () => onLongPress(row.id) : undefined}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        {
          backgroundColor: pressed
            ? theme.colors.surfaceAlt
            : theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.left}>
        <Pill
          label={row.method}
          color={methodColor(theme, row.method)}
          small
          style={styles.methodPill}
        />
        {pending ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.statusPending}
            style={styles.spinner}
          />
        ) : (
          <Text style={[styles.status, { color }]}>{statusLabel}</Text>
        )}
      </View>
      <View style={styles.center}>
        <Text
          numberOfLines={compact ? 1 : 2}
          style={[
            styles.path,
            { color: failed || row.status >= 400 ? color : theme.colors.text },
          ]}
        >
          {pathAndQuery}
        </Text>
        {!compact && (
          <Text
            numberOfLines={1}
            style={[styles.host, { color: theme.colors.textMuted }]}
          >
            {row.host || '—'}
            {row.gqlOperation ? (
              <Text style={{ color: theme.colors.primary }}>
                {' '}
                gql: {row.gqlOperation}
              </Text>
            ) : null}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
          {formatTime(row.startTime)}
        </Text>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
          {row.duration >= 0
            ? formatDuration(row.duration)
            : pending
              ? 'pending'
              : ''}
        </Text>
        {!compact && row.responseSize > 0 && (
          <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
            {formatBytes(row.responseSize)}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const areEqual = (prev: Props, next: Props) =>
  prev.row.updatedAt === next.row.updatedAt &&
  prev.row.id === next.row.id &&
  prev.compact === next.compact &&
  prev.onPress === next.onPress &&
  prev.onLongPress === next.onLongPress;

export default React.memo(RequestRow, areEqual);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  rowCompact: { paddingVertical: 6, minHeight: 44 },
  accent: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginLeft: 6 },
  left: { width: 64, alignItems: 'center', marginLeft: 6 },
  methodPill: { alignSelf: 'center', minWidth: 52, alignItems: 'center' },
  status: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  spinner: { marginTop: 2, transform: [{ scale: 0.7 }] },
  center: { flex: 1, paddingHorizontal: 8 },
  path: { fontSize: 14, fontWeight: '500', lineHeight: 18 },
  host: { fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end', minWidth: 56 },
  meta: { fontSize: 11, lineHeight: 15, fontVariant: ['tabular-nums'] },
});
