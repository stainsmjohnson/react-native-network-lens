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
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  pillSmall: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  outline: { backgroundColor: 'transparent' },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  textSmall: { fontSize: 11 },
  textFilled: { color: '#ffffff' },
});
