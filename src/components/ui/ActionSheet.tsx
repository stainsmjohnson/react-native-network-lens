import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../theme';

export interface ActionItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  actions: ActionItem[];
  title?: string;
}

/** Cross-platform bottom sheet built on Modal, so no native dependency is needed. */
export const ActionSheet = ({ visible, onClose, actions, title }: Props) => {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close menu"
      />
      <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
        {title ? (
          <Text
            numberOfLines={1}
            style={[styles.title, { color: theme.colors.textMuted }]}
          >
            {title}
          </Text>
        ) : null}
        <ScrollView bounces={false}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                action.onPress();
              }}
              style={({ pressed }) => [
                styles.item,
                { borderTopColor: theme.colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: action.destructive
                      ? theme.colors.statusBad
                      : theme.colors.text,
                  },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: '70%',
  },
  title: { fontSize: 12, fontWeight: '700', padding: 12, letterSpacing: 0.6 },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 16, fontWeight: '500' },
  pressed: { opacity: 0.6 },
});
