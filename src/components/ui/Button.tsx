import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';

// Object form keeps compatibility with React Native versions before numeric hitSlop.
const HIT_SLOP_SMALL = { top: 6, bottom: 6, left: 6, right: 6 };
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

interface TextButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const TextButton = ({
  label,
  onPress,
  disabled,
  active,
  style,
  textStyle,
}: TextButtonProps) => {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      hitSlop={HIT_SLOP_SMALL}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: active
            ? theme.colors.primary
            : theme.colors.surfaceAlt,
        },
        disabled ? styles.disabled : pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: active ? theme.colors.onPrimary : theme.colors.text },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

interface IconButtonProps {
  /** A unicode glyph; the library ships no image assets. */
  glyph: string;
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  active?: boolean;
}

export const IconButton = ({
  glyph,
  accessibilityLabel,
  onPress,
  disabled,
  active,
}: IconButtonProps) => {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [
        styles.icon,
        active && { backgroundColor: theme.colors.primary },
        disabled ? styles.disabled : pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.glyph,
          { color: active ? theme.colors.onPrimary : theme.colors.text },
        ]}
      >
        {glyph}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, fontWeight: '600' },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.6 },
});
