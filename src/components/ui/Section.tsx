import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

export const Section = ({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textMuted }]}>
          {title.toUpperCase()}
        </Text>
        {right}
      </View>
      <View style={[styles.body, { backgroundColor: theme.colors.surface }]}>
        {children}
      </View>
    </View>
  );
};

export const KeyValueList = ({
  entries,
  emptyLabel = 'None',
  mono,
}: {
  entries: [string, string][];
  emptyLabel?: string;
  mono?: boolean;
}) => {
  const theme = useTheme();
  if (entries.length === 0) {
    return (
      <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
        {emptyLabel}
      </Text>
    );
  }
  return (
    <View>
      {entries.map(([key, value], index) => (
        <View
          key={`${key}-${index}`}
          style={[
            styles.row,
            index > 0 && {
              borderTopColor: theme.colors.border,
              borderTopWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Text
            selectable
            style={[styles.key, { color: theme.colors.textMuted }]}
          >
            {key}
          </Text>
          <Text
            selectable
            style={[
              styles.value,
              { color: theme.colors.text },
              mono && [styles.mono, { fontFamily: theme.fonts.mono }],
            ]}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
};

export const EmptyState = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => {
  const theme = useTheme();
  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 14, paddingHorizontal: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  title: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  body: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  row: { paddingVertical: 8 },
  key: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  value: { fontSize: 14 },
  mono: { fontSize: 12 },
  empty: { fontSize: 13, paddingVertical: 10, fontStyle: 'italic' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
