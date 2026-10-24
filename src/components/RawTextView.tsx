import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCodeFont } from '../settings';
import { useTheme, type Theme } from '../theme';
import { findLineMatches, splitHighlights, toLines } from '../utils/search';
import { CodeList } from './CodeList';

interface Props {
  text: string;
  query?: string;
  activeMatch?: number;
  onMatchCountChange?: (count: number) => void;
}

/**
 * Renders text one line per row with line numbers, no wrapping and horizontal
 * scrolling, so pretty-printed JSON keeps its indentation structure intact.
 */
const RawTextView = ({
  text,
  query = '',
  activeMatch = 0,
  onMatchCountChange,
}: Props) => {
  const theme = useTheme();
  const font = useCodeFont(theme);
  const lines = useMemo(() => toLines(text), [text]);
  const matches = useMemo(() => findLineMatches(lines, query), [lines, query]);

  useEffect(() => {
    onMatchCountChange?.(matches.length);
  }, [matches.length, onMatchCountChange]);

  const matchedLines = useMemo(
    () => new Set(matches.map((m) => m.line)),
    [matches]
  );
  const activeLine =
    matches[Math.min(activeMatch, Math.max(matches.length - 1, 0))]?.line;

  const gutterChars = String(lines.length).length;
  const charWidth = font.charWidth;
  const contentWidth = useMemo(() => {
    let max = 0;
    for (const line of lines) if (line.length > max) max = line.length;
    return (max + gutterChars + 3) * charWidth + 32;
  }, [lines, gutterChars, charWidth]);

  const rowHeight = font.lineHeight;

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <Line
        text={item}
        index={index}
        gutterChars={gutterChars}
        theme={theme}
        font={font}
        query={query}
        matched={matchedLines.has(index)}
        active={index === activeLine}
        height={rowHeight}
      />
    ),
    [gutterChars, theme, font, query, matchedLines, activeLine, rowHeight]
  );

  return (
    <CodeList
      data={lines}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentWidth={contentWidth}
      rowHeight={rowHeight}
      activeIndex={activeLine}
      extraData={`${query}:${activeLine ?? ''}`}
    />
  );
};

const keyExtractor = (_: string, index: number) => String(index);

const Line = React.memo(function LineInner({
  text,
  index,
  gutterChars,
  theme,
  font,
  query,
  matched,
  active,
  height,
}: {
  text: string;
  index: number;
  gutterChars: number;
  theme: Theme;
  font: ReturnType<typeof useCodeFont>;
  query: string;
  matched: boolean;
  active: boolean;
  height: number;
}) {
  const codeStyle = {
    fontFamily: theme.fonts.mono,
    fontSize: font.fontSize,
    lineHeight: font.lineHeight,
  };
  const segments = matched ? splitHighlights(text, query) : null;
  return (
    <View
      style={[
        styles.line,
        { height },
        active
          ? { backgroundColor: `${theme.colors.highlightActive}33` }
          : matched
            ? { backgroundColor: `${theme.colors.highlight}55` }
            : null,
      ]}
    >
      <Text
        style={[
          codeStyle,
          styles.gutter,
          {
            color: theme.colors.textMuted,
            width: (gutterChars + 1) * font.charWidth + 8,
          },
        ]}
      >
        {index + 1}
      </Text>
      <Text
        numberOfLines={1}
        selectable
        style={[codeStyle, { color: theme.colors.text }]}
      >
        {segments
          ? segments.map((segment, i) => (
              <Text
                key={i}
                style={
                  segment.highlighted
                    ? {
                        backgroundColor: active
                          ? theme.colors.highlightActive
                          : theme.colors.highlight,
                        color: theme.colors.onHighlight,
                      }
                    : undefined
                }
              >
                {segment.text}
              </Text>
            ))
          : text}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  gutter: { textAlign: 'right', paddingRight: 8, marginRight: 8, opacity: 0.8 },
});

export default RawTextView;
