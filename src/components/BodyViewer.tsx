import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import type { ParsedBody } from '../types';
import { bodySize, stringifyJson } from '../utils/body';
import { formatBytes } from '../utils/format';
import JsonTreeView, { type JsonTreeHandle } from './JsonTree/JsonTreeView';
import RawTextView from './RawTextView';
import {
  ActionSheet,
  EmptyState,
  SearchInput,
  SegmentedControl,
  TextButton,
} from './ui';

type ViewMode = 'tree' | 'raw';

interface Props {
  body: ParsedBody | undefined;
  loading?: boolean;
  emptyTitle: string;
  emptySubtitle?: string;
  copyToClipboard?: (text: string) => void;
}

const KIND_LABEL: Record<ParsedBody['kind'], string> = {
  json: 'JSON',
  form: 'Form data',
  text: 'Text',
  binary: 'Binary',
  empty: 'Empty',
};

const share = (text: string) =>
  Share.share({ message: text }).catch(() => undefined);
const valueText = (value: unknown) =>
  typeof value === 'string' ? value : stringifyJson(value);

/**
 * Payload viewer used by the Request and Response tabs. Structured bodies can
 * be shown as a collapsible tree or as pretty-printed raw text; both keep lines
 * unwrapped, scroll horizontally and support search with next/previous.
 */
const BodyViewer = ({
  body,
  loading,
  emptyTitle,
  emptySubtitle,
  copyToClipboard,
}: Props) => {
  const theme = useTheme();
  const structured = body?.kind === 'json' || body?.kind === 'form';
  const [mode, setMode] = useState<ViewMode>('tree');
  const [query, setQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [matchIndex, setMatchIndex] = useState(0);
  const [nodeMenu, setNodeMenu] = useState<{
    path: string;
    value: unknown;
  } | null>(null);
  const treeRef = useRef<JsonTreeHandle>(null);

  const effectiveMode: ViewMode = structured ? mode : 'raw';

  useEffect(() => setMatchIndex(0), [query, effectiveMode, body]);

  const onMatchCountChange = useCallback((count: number) => {
    setMatchCount(count);
    setMatchIndex((index) => (count === 0 ? 0 : Math.min(index, count - 1)));
  }, []);

  const matches = {
    count: matchCount,
    index: matchIndex,
    onNext: () => matchCount && setMatchIndex((i) => (i + 1) % matchCount),
    onPrev: () =>
      matchCount && setMatchIndex((i) => (i - 1 + matchCount) % matchCount),
  };

  const meta = useMemo(() => {
    if (!body || body.kind === 'empty') return '';
    const parts = [KIND_LABEL[body.kind]];
    if (body.kind === 'binary' && body.mimeType) parts.push(body.mimeType);
    const size = bodySize(body);
    if (size) parts.push(formatBytes(size));
    if (body.kind !== 'binary')
      parts.push(`${body.text.split('\n').length} lines`);
    return parts.join(' · ');
  }, [body]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (!body || body.kind === 'empty') {
    return <EmptyState title={emptyTitle} subtitle={emptySubtitle} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        {structured ? (
          <SegmentedControl<ViewMode>
            value={effectiveMode}
            onChange={setMode}
            options={[
              { value: 'tree', label: 'Tree' },
              { value: 'raw', label: 'Raw' },
            ]}
            style={styles.modeSwitch}
          />
        ) : (
          <Text
            style={[styles.meta, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {meta}
          </Text>
        )}
        <View style={styles.spacer} />
        {effectiveMode === 'tree' && (
          <>
            <TextButton
              label="Expand"
              onPress={() => treeRef.current?.expandAll()}
            />
            <TextButton
              label="Collapse"
              onPress={() => treeRef.current?.collapseAll()}
            />
          </>
        )}
        {copyToClipboard && body.kind !== 'binary' && (
          <TextButton label="Copy" onPress={() => copyToClipboard(body.text)} />
        )}
        <TextButton label="Share" onPress={() => share(body.text)} />
      </View>
      {body.kind !== 'binary' && (
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={
            effectiveMode === 'tree' ? 'Search keys and values' : 'Search text'
          }
          matches={matches}
          style={styles.search}
        />
      )}
      {structured && (
        <Text
          style={[
            styles.meta,
            styles.metaBelow,
            { color: theme.colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {meta}
        </Text>
      )}
      <View style={[styles.viewer, { borderColor: theme.colors.border }]}>
        {body.kind === 'binary' ? (
          <EmptyState title="Binary content" subtitle={body.text} />
        ) : effectiveMode === 'tree' && structured ? (
          <JsonTreeView
            ref={treeRef}
            value={body.value}
            query={query}
            activeMatch={matchIndex}
            onMatchCountChange={onMatchCountChange}
            onLongPressNode={setNodeMenu}
          />
        ) : (
          <RawTextView
            text={body.text}
            query={query}
            activeMatch={matchIndex}
            onMatchCountChange={onMatchCountChange}
          />
        )}
      </View>
      <ActionSheet
        visible={nodeMenu !== null}
        onClose={() => setNodeMenu(null)}
        title={nodeMenu?.path}
        actions={
          nodeMenu
            ? [
                ...(copyToClipboard
                  ? [
                      {
                        label: 'Copy value',
                        onPress: () =>
                          copyToClipboard(valueText(nodeMenu.value)),
                      },
                    ]
                  : []),
                {
                  label: 'Share value',
                  onPress: () => share(valueText(nodeMenu.value)),
                },
                ...(copyToClipboard
                  ? [
                      {
                        label: 'Copy path',
                        onPress: () => copyToClipboard(nodeMenu.path),
                      },
                    ]
                  : []),
              ]
            : []
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 6,
  },
  modeSwitch: { width: 130 },
  spacer: { flex: 1 },
  search: { marginHorizontal: 12, marginTop: 8 },
  meta: { fontSize: 12, flexShrink: 1 },
  metaBelow: { paddingHorizontal: 14, paddingTop: 6 },
  viewer: { flex: 1, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
});

export default BodyViewer;
