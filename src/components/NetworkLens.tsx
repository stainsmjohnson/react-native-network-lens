import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { BackHandler, Share, StyleSheet, View } from 'react-native';
import { setLensBackHandler } from '../backHandler';
import { createHar } from '../core/har';
import logger from '../core/loggerSingleton';
import {
  useLoggerEnabled,
  useLoggerPaused,
  useNetworkRequests,
} from '../hooks';
import { ThemeContext, useTheme, type ThemeInput } from '../theme';
import RequestDetails from './RequestDetails/RequestDetails';
import RequestList from './RequestList/RequestList';
import type { ActionItem } from './ui';

export interface NetworkLensProps {
  /**
   * Render nothing when `false`, e.g. `enabled={__DEV__ || featureFlag}`.
   * @default true
   */
  enabled?: boolean;
  /** `'light' | 'dark' | 'auto'` or a partial theme object. @default 'auto' */
  theme?: ThemeInput;
  /** Newest first (`desc`) or oldest first (`asc`). @default 'desc' */
  sort?: 'asc' | 'desc';
  /** Single-line rows. @default false */
  compact?: boolean;
  /** Limit the number of rows rendered. */
  maxRows?: number;
  /**
   * Hook up your clipboard library to get "Copy" buttons, e.g.
   * `copyToClipboard={Clipboard.setString}`.
   */
  copyToClipboard?: (text: string) => void;
}

export interface NetworkLensHandle {
  /** Returns to the list if a request is open. Returns `true` when it handled the action. */
  goBack: () => boolean;
}

const NetworkLens = forwardRef<NetworkLensHandle, NetworkLensProps>(
  function NetworkLensRoot(
    {
      enabled = true,
      theme = 'auto',
      sort = 'desc',
      compact = false,
      maxRows,
      copyToClipboard,
    },
    ref
  ) {
    if (!enabled) return null;
    return (
      <ThemeContext.Provider value={theme}>
        <Inspector
          ref={ref}
          sort={sort}
          compact={compact}
          maxRows={maxRows}
          copyToClipboard={copyToClipboard}
        />
      </ThemeContext.Provider>
    );
  }
);

type InspectorProps = Required<Pick<NetworkLensProps, 'sort' | 'compact'>> &
  Pick<NetworkLensProps, 'maxRows' | 'copyToClipboard'>;

const Inspector = forwardRef<NetworkLensHandle, InspectorProps>(
  function InspectorInner({ sort, compact, maxRows, copyToClipboard }, ref) {
    const theme = useTheme();
    const requests = useNetworkRequests();
    const loggingEnabled = useLoggerEnabled();
    const paused = useLoggerPaused();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selected = useMemo(
      () =>
        selectedId === null
          ? undefined
          : (requests.find((r) => r.id === selectedId) ??
            logger.getRequest(selectedId)),
      [requests, selectedId]
    );

    const goBack = useCallback(() => {
      if (selectedId === null) return false;
      setSelectedId(null);
      return true;
    }, [selectedId]);

    useImperativeHandle(ref, () => ({ goBack }), [goBack]);

    // Android hardware back and the optional `getBackHandler()` integration.
    useEffect(() => {
      if (selectedId === null) return undefined;
      setLensBackHandler(goBack);
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        goBack
      );
      return () => {
        subscription.remove();
        setLensBackHandler(undefined);
      };
    }, [selectedId, goBack]);

    const menuActions = useMemo<ActionItem[]>(
      () => [
        {
          label: paused ? 'Resume capturing' : 'Pause capturing',
          onPress: () => logger.setPaused(!paused),
        },
        {
          label: 'Export all as HAR',
          onPress: async () => {
            const har = await createHar(logger.getRequests());
            Share.share({ message: JSON.stringify(har) }).catch(
              () => undefined
            );
          },
        },
        { label: 'Clear requests', onPress: logger.clear, destructive: true },
      ],
      [paused]
    );

    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {selected ? (
          <RequestDetails
            request={selected}
            onClose={goBack}
            copyToClipboard={copyToClipboard}
          />
        ) : (
          <RequestList
            requests={requests}
            sort={sort}
            compact={compact}
            maxRows={maxRows}
            paused={paused}
            loggingEnabled={loggingEnabled}
            onPressItem={setSelectedId}
            menuActions={menuActions}
          />
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({ container: { flex: 1 } });

export default NetworkLens;
