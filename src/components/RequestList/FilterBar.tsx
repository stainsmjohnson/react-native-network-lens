import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { methodColor, statusColor, useTheme } from '../../theme';
import type { StatusGroup } from '../../types';
import { TextButton } from '../ui';
import {
  STATUS_GROUPS,
  isFilterActive,
  toggleHost,
  toggleMethod,
  toggleStatusGroup,
  type RequestFilter,
} from './filters';

interface Props {
  filter: RequestFilter;
  onChange: (filter: RequestFilter) => void;
  methods: string[];
  hosts: string[];
  onClear: () => void;
}

const statusGroupColor = (
  theme: ReturnType<typeof useTheme>,
  group: StatusGroup
) => {
  switch (group) {
    case '2xx':
      return statusColor(theme, 200);
    case '3xx':
      return statusColor(theme, 300);
    case '4xx':
      return statusColor(theme, 400);
    case '5xx':
      return statusColor(theme, 500);
    case 'failed':
      return theme.colors.statusBad;
    default:
      return theme.colors.statusPending;
  }
};

const Chip = ({
  label,
  selected,
  color,
  onPress,
}: {
  label: string;
  selected: boolean;
  color: string;
  onPress: () => void;
}) => (
  <TextButton
    label={label}
    onPress={onPress}
    active={selected}
    style={[styles.chip, selected && { backgroundColor: color }]}
    textStyle={!selected ? { color } : undefined}
  />
);

const FilterBar = ({ filter, onChange, methods, hosts, onClear }: Props) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <Row label="Method">
        {methods.map((method) => (
          <Chip
            key={method}
            label={method}
            selected={filter.methods.has(method)}
            color={methodColor(theme, method)}
            onPress={() => onChange(toggleMethod(filter, method))}
          />
        ))}
      </Row>
      <Row label="Status">
        {STATUS_GROUPS.map((group) => (
          <Chip
            key={group}
            label={group}
            selected={filter.statusGroups.has(group)}
            color={statusGroupColor(theme, group)}
            onPress={() => onChange(toggleStatusGroup(filter, group))}
          />
        ))}
      </Row>
      {hosts.length > 1 && (
        <Row label="Host">
          {hosts.map((host) => (
            <Chip
              key={host || '(none)'}
              label={host || '(none)'}
              selected={filter.hosts.has(host)}
              color={theme.colors.primary}
              onPress={() => onChange(toggleHost(filter, host))}
            />
          ))}
        </Row>
      )}
      {isFilterActive(filter) && (
        <TextButton
          label="Clear filters"
          onPress={onClear}
          style={styles.clear}
        />
      )}
    </View>
  );
};

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  rowLabel: {
    width: 64,
    fontSize: 11,
    fontWeight: '700',
    paddingLeft: 12,
    letterSpacing: 0.5,
  },
  chips: { paddingRight: 12 },
  chip: { paddingVertical: 4, paddingHorizontal: 10, marginRight: 6 },
  clear: {
    alignSelf: 'flex-end',
    marginRight: 12,
    marginTop: 4,
    paddingVertical: 4,
  },
});

export default FilterBar;
