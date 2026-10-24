import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useCodeFont } from '../../settings';
import { useTheme, type Theme } from '../../theme';
import { splitHighlights } from '../../utils/search';
import { CodeList } from '../CodeList';
import {
  MAX_VALUE_CHARS,
  ROOT_PATH,
  allPaths,
  collapsedPreview,
  displayValue,
  flattenJson,
  pathsToDepth,
  rowCharCount,
  searchJson,
  subtreePaths,
  type JsonRow,
} from './model';

export interface JsonTreeHandle {
  expandAll: () => void;
  collapseAll: () => void;
}

interface Props {
  value: unknown;
  /** Search query; matching keys/values are highlighted and auto-expanded. */
  query?: string;
  /** Index into the ordered list of matches that should be focused. */
  activeMatch?: number;
  onMatchCountChange?: (count: number) => void;
  onLongPressNode?: (info: { path: string; value: unknown }) => void;
  /** How many levels to open initially. @default 1 */
  initialDepth?: number;
}

const INDENT = 16;
const INDENT_CHARS = 2;

const JsonTreeView = forwardRef<JsonTreeHandle, Props>(
  function JsonTreeViewInner(
    {
      value,
      query = '',
      activeMatch = 0,
      onMatchCountChange,
      onLongPressNode,
      initialDepth = 1,
    },
    ref
  ) {
    const theme = useTheme();
    const font = useCodeFont(theme);
    const [expanded, setExpanded] = useState<Set<string>>(() =>
      pathsToDepth(value, initialDepth)
    );

    // Reset when a different value is shown.
    useEffect(() => {
      setExpanded(pathsToDepth(value, initialDepth));
    }, [value, initialDepth]);

    const hits = useMemo(() => searchJson(value, query), [value, query]);
    const matchedPaths = useMemo(
      () => new Set(hits.map((hit) => hit.path)),
      [hits]
    );

    useEffect(() => {
      onMatchCountChange?.(hits.length);
    }, [hits.length, onMatchCountChange]);

    // Make every hit reachable by expanding its ancestors.
    useEffect(() => {
      if (hits.length === 0) return;
      setExpanded((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const hit of hits) {
          for (const ancestor of hit.ancestors) {
            if (!next.has(ancestor)) {
              next.add(ancestor);
              changed = true;
            }
          }
        }
        return changed ? next : prev;
      });
    }, [hits]);

    useImperativeHandle(
      ref,
      () => ({
        expandAll: () => setExpanded(allPaths(value)),
        collapseAll: () => setExpanded(new Set([ROOT_PATH])),
      }),
      [value]
    );

    const rows = useMemo(() => flattenJson(value, expanded), [value, expanded]);

    const activePath =
      hits[Math.min(activeMatch, Math.max(hits.length - 1, 0))]?.path;
    const activeIndex = useMemo(
      () =>
        activePath ? rows.findIndex((row) => row.path === activePath) : -1,
      [rows, activePath]
    );

    const contentWidth = useMemo(() => {
      let maxChars = 0;
      for (const row of rows)
        maxChars = Math.max(maxChars, rowCharCount(row, INDENT_CHARS));
      return maxChars * font.charWidth + 40;
    }, [rows, font.charWidth]);

    const toggle = useCallback((row: JsonRow) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(row.path)) {
          // Collapse the whole subtree so re-opening starts clean.
          for (const path of subtreePaths(row.value, row.path))
            next.delete(path);
        } else {
          next.add(row.path);
        }
        return next;
      });
    }, []);

    const rowHeight = font.lineHeight + 4;

    const renderItem = useCallback(
      ({ item }: { item: JsonRow }) => (
        <TreeRow
          row={item}
          theme={theme}
          font={font}
          query={query}
          matched={matchedPaths.has(item.path)}
          active={item.path === activePath}
          onToggle={toggle}
          onLongPress={onLongPressNode}
          height={rowHeight}
        />
      ),
      [
        theme,
        font,
        query,
        matchedPaths,
        activePath,
        toggle,
        onLongPressNode,
        rowHeight,
      ]
    );

    return (
      <CodeList
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentWidth={contentWidth}
        rowHeight={rowHeight}
        activeIndex={activeIndex >= 0 ? activeIndex : undefined}
        extraData={`${query}:${activePath ?? ''}`}
      />
    );
  }
);

const keyExtractor = (row: JsonRow) => row.path;

const TreeRow = memo(function TreeRowInner({
  row,
  theme,
  font,
  query,
  matched,
  active,
  onToggle,
  onLongPress,
  height,
}: {
  row: JsonRow;
  theme: Theme;
  font: ReturnType<typeof useCodeFont>;
  query: string;
  matched: boolean;
  active: boolean;
  onToggle: (row: JsonRow) => void;
  onLongPress?: (info: { path: string; value: unknown }) => void;
  height: number;
}) {
  const codeStyle = {
    fontFamily: theme.fonts.mono,
    fontSize: font.fontSize,
    lineHeight: font.lineHeight,
  };
  const valueColor = (() => {
    switch (row.type) {
      case 'string':
        return theme.colors.jsonString;
      case 'number':
        return theme.colors.jsonNumber;
      case 'boolean':
        return theme.colors.jsonBoolean;
      case 'null':
      case 'undefined':
        return theme.colors.jsonNull;
      default:
        return theme.colors.textMuted;
    }
  })();

  let valueText: string;
  if (row.expandable) {
    valueText = row.expanded
      ? row.type === 'array'
        ? `Array(${row.childCount})`
        : `Object (${row.childCount})`
      : collapsedPreview(row.value);
  } else {
    const full = displayValue(row.value);
    valueText =
      full.length > MAX_VALUE_CHARS
        ? `${full.slice(0, MAX_VALUE_CHARS)}… (+${full.length - MAX_VALUE_CHARS})`
        : full;
  }

  const highlightStyle = {
    backgroundColor: active
      ? theme.colors.highlightActive
      : theme.colors.highlight,
    color: theme.colors.onHighlight,
  };

  const renderHighlighted = (text: string, color: string) =>
    matched && query
      ? splitHighlights(text, query).map((segment, index) => (
          <Text
            key={index}
            style={segment.highlighted ? highlightStyle : { color }}
          >
            {segment.text}
          </Text>
        ))
      : text;

  const rowBackground = active
    ? { backgroundColor: `${theme.colors.highlightActive}33` }
    : matched
      ? { backgroundColor: `${theme.colors.highlight}55` }
      : null;

  return (
    <Pressable
      onPress={row.expandable ? () => onToggle(row) : undefined}
      onLongPress={
        onLongPress
          ? () => onLongPress({ path: row.path, value: row.value })
          : undefined
      }
      delayLongPress={350}
      accessibilityRole={row.expandable ? 'button' : 'text'}
      accessibilityState={
        row.expandable ? { expanded: row.expanded } : undefined
      }
      style={[
        styles.row,
        { height, paddingLeft: 8 + row.depth * INDENT },
        rowBackground,
      ]}
    >
      <Text
        style={[styles.arrow, codeStyle, { color: theme.colors.textMuted }]}
      >
        {row.expandable ? (row.expanded ? '▾' : '▸') : ' '}
      </Text>
      <Text numberOfLines={1} style={[codeStyle, { color: theme.colors.text }]}>
        {row.key !== null && (
          <Text style={{ color: theme.colors.jsonKey }}>
            {renderHighlighted(row.key, theme.colors.jsonKey)}
            <Text style={{ color: theme.colors.textMuted }}>: </Text>
          </Text>
        )}
        <Text style={{ color: valueColor }}>
          {renderHighlighted(valueText, valueColor)}
        </Text>
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  arrow: { width: 16, textAlign: 'center' },
});

export default JsonTreeView;
