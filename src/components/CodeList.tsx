import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import { useTheme } from '../theme';

interface Props<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  /** Estimated width of the widest row, in px. */
  contentWidth: number;
  rowHeight: number;
  /** Row index that should be scrolled into view (e.g. the active search match). */
  activeIndex?: number;
  extraData?: unknown;
}

/**
 * A vertical FlatList inside a horizontal ScrollView. Rows are fixed height and
 * never wrap, so long JSON lines stay on one line and can be panned sideways,
 * just like a code editor. We measure the container once and size the inner
 * list explicitly, which keeps both scroll axes stable while rows virtualise.
 */
export function CodeList<T>({
  data,
  renderItem,
  keyExtractor,
  contentWidth,
  rowHeight,
  activeIndex,
  extraData,
}: Props<T>) {
  const theme = useTheme();
  const listRef = useRef<FlatList<T>>(null);
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const getItemLayout = useCallback(
    (_: ArrayLike<T> | null | undefined, index: number) => ({
      length: rowHeight,
      offset: rowHeight * index,
      index,
    }),
    [rowHeight]
  );

  useEffect(() => {
    if (
      activeIndex === undefined ||
      activeIndex < 0 ||
      activeIndex >= data.length
    )
      return;
    // Defer so a freshly expanded tree has rendered before we scroll.
    const handle = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: activeIndex,
        viewPosition: 0.3,
        animated: true,
      });
    }, 16);
    return () => clearTimeout(handle);
  }, [activeIndex, data.length]);

  const width = Math.max(contentWidth, layout.width);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setLayout((prev) =>
          prev.width === w && prev.height === h ? prev : { width: w, height: h }
        );
      }}
    >
      {layout.height > 0 && (
        <ScrollView
          horizontal
          bounces={false}
          showsHorizontalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <FlatList
            ref={listRef}
            data={data}
            extraData={extraData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            initialNumToRender={30}
            maxToRenderPerBatch={40}
            windowSize={9}
            removeClippedSubviews={false}
            onScrollToIndexFailed={({ index }) => {
              listRef.current?.scrollToOffset({
                offset: index * rowHeight,
                animated: false,
              });
            }}
            style={{ width, height: layout.height }}
            contentContainerStyle={styles.content}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingVertical: 6 },
});
