import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { IconButton } from './Button';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** When provided, shows "n/m" and previous/next buttons. */
  matches?: {
    count: number;
    index: number;
    onPrev: () => void;
    onNext: () => void;
  };
  style?: StyleProp<ViewStyle>;
}

export const SearchInput = ({
  value,
  onChangeText,
  placeholder = 'Search',
  matches,
  style,
}: Props) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceAlt },
        style,
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={matches?.onNext}
        style={[styles.input, { color: theme.colors.text }]}
      />
      {matches && value.length > 0 && (
        <Text style={[styles.count, { color: theme.colors.textMuted }]}>
          {matches.count === 0 ? '0' : `${matches.index + 1}/${matches.count}`}
        </Text>
      )}
      {matches && (
        <>
          <IconButton
            glyph="↑"
            accessibilityLabel="Previous match"
            onPress={matches.onPrev}
            disabled={!matches.count}
          />
          <IconButton
            glyph="↓"
            accessibilityLabel="Next match"
            onPress={matches.onNext}
            disabled={!matches.count}
          />
        </>
      )}
      {value.length > 0 && (
        <IconButton
          glyph="✕"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingLeft: 10,
    paddingRight: 2,
    minHeight: 38,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 6, paddingHorizontal: 0 },
  count: { fontSize: 12, marginHorizontal: 4, fontVariant: ['tabular-nums'] },
});
