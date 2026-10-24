import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface Props {
  label: string;
  color: string;
  filled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Fixed-height badge so filled and outlined variants align on one row. */
export const Pill = ({ label, color, filled, small, style }: Props) => (
  <View
    style={[
      styles.pill,
      small && styles.pillSmall,
      { borderColor: color },
      filled ? { backgroundColor: color } : styles.outline,
      style,
    ]}
  >
    <Text
      numberOfLines={1}
      style={[
        styles.text,
        small && styles.textSmall,
        filled ? styles.textFilled : { color },
      ]}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    height: 24,
    minWidth: 44,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pillSmall: {
    height: 20,
    minWidth: 40,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  outline: { backgroundColor: 'transparent' },
  text: { fontSize: 12, lineHeight: 14, fontWeight: '700', letterSpacing: 0.3 },
  textSmall: { fontSize: 11, lineHeight: 13 },
  textFilled: { color: '#ffffff' },
});
