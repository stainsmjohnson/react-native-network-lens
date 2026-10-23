import { useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useLoggerEnabled, useNetworkRequests } from '../hooks';
import { ThemeContext, useTheme, type ThemeInput } from '../theme';
import NetworkLens, {
  type NetworkLensHandle,
  type NetworkLensProps,
} from './NetworkLens';
import { IconButton } from './ui';

export interface NetworkLensOverlayProps extends Omit<
  NetworkLensProps,
  'enabled' | 'theme' | 'header'
> {
  /**
   * Render nothing when `false`, e.g.
   * `<NetworkLensOverlay enabled={__DEV__ || flags.networkInspector} />`
   * @default true
   */
  enabled?: boolean;
  theme?: ThemeInput;
  /** Corner for the floating button. @default 'bottom-right' */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Distance from the screen edges in px. @default { x: 16, y: 32 } */
  offset?: { x?: number; y?: number };
  /** Controlled visibility of the inspector sheet. */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** Hide the floating button when you open the sheet from your own dev menu. */
  hideButton?: boolean;
  /** Title of the inspector sheet. @default 'Network' */
  title?: string;
}

/**
 * Drop-in overlay: a floating badge with the number of captured requests that
 * opens the inspector in a modal. Place it once near the root of your app.
 */
const NetworkLensOverlay = ({
  enabled = true,
  theme = 'auto',
  ...props
}: NetworkLensOverlayProps) => {
  if (!enabled) return null;
  return (
    <ThemeContext.Provider value={theme}>
      <Overlay {...props} theme={theme} />
    </ThemeContext.Provider>
  );
};

const Overlay = ({
  theme,
  position = 'bottom-right',
  offset,
  visible,
  onVisibleChange,
  hideButton,
  title = 'Network',
  ...lensProps
}: Omit<NetworkLensOverlayProps, 'enabled'> & { theme: ThemeInput }) => {
  const t = useTheme();
  const lensRef = useRef<NetworkLensHandle>(null);
  const [internalVisible, setInternalVisible] = useState(false);
  const open = visible ?? internalVisible;
  const setOpen = (next: boolean) => {
    if (visible === undefined) setInternalVisible(next);
    onVisibleChange?.(next);
  };

  const requests = useNetworkRequests();
  const loggingEnabled = useLoggerEnabled();
  const hasErrors = requests.some(
    (r) => r.state === 'failed' || r.status >= 400
  );

  const placement: ViewStyle = {
    [position.startsWith('bottom') ? 'bottom' : 'top']: offset?.y ?? 32,
    [position.endsWith('right') ? 'right' : 'left']: offset?.x ?? 16,
  };

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: t.colors.text }]}>{title}</Text>
      <IconButton
        glyph="✕"
        accessibilityLabel="Close network inspector"
        onPress={() => setOpen(false)}
      />
    </View>
  );

  return (
    <>
      {!hideButton && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open network inspector, ${requests.length} requests`}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.fab,
            placement,
            {
              backgroundColor: hasErrors
                ? t.colors.statusBad
                : t.colors.primary,
            },
            pressed && styles.fabPressed,
          ]}
        >
          <Text style={[styles.fabCount, { color: t.colors.onPrimary }]}>
            {loggingEnabled ? requests.length : '•'}
          </Text>
          <Text style={[styles.fabCaption, { color: t.colors.onPrimary }]}>
            NET
          </Text>
        </Pressable>
      )}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={() => {
          // Android back button: step back inside the inspector first, then close.
          if (!lensRef.current?.goBack()) setOpen(false);
        }}
      >
        <View style={[styles.sheet, { backgroundColor: t.colors.surface }]}>
          <NetworkLens
            ref={lensRef}
            {...lensProps}
            theme={theme}
            header={header}
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 9999,
  },
  fabPressed: { opacity: 0.8 },
  fabCount: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  fabCaption: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: -2,
  },
  sheet: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingBottom: 6,
  },
  title: { fontSize: 17, fontWeight: '700' },
});

export default NetworkLensOverlay;
