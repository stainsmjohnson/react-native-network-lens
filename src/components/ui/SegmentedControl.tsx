import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';

interface Props<T extends string> {
  options: { value: T; label: string; badge?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  style,
}: Props<T>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceAlt },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: selected ? theme.colors.text : theme.colors.textMuted,
                },
                selected && styles.labelSelected,
              ]}
            >
              {option.label}
              {option.badge && (
                <Text style={{ color: theme.colors.primary }}> •</Text>
              )}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segment: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '500' },
  labelSelected: { fontWeight: '700' },
});
