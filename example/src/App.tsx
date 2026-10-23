import { useEffect, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import {
  NetworkLens,
  NetworkLensOverlay,
  startNetworkLogging,
  stopNetworkLogging,
  type ThemeName,
} from 'react-native-network-lens';

/**
 * The flag that decides whether the inspector exists at all. In a real app this
 * could be `__DEV__`, a remote config value or a hidden developer setting.
 */
const INITIAL_ENABLED = true;

startNetworkLogging({ enabled: INITIAL_ENABLED, ignoredHosts: ['localhost'] });

const JSON_API = 'https://jsonplaceholder.typicode.com';
const HTTPBIN = 'https://httpbin.org';

const demoRequests: { label: string; run: () => Promise<unknown> }[] = [
  {
    label: 'GET list (large JSON)',
    run: () => fetch(`${JSON_API}/photos?_limit=120`).then((r) => r.json()),
  },
  {
    label: 'GET nested object',
    run: () => fetch(`${JSON_API}/users/1`).then((r) => r.json()),
  },
  {
    label: 'POST JSON',
    run: () =>
      fetch(`${JSON_API}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo': 'network-lens',
        },
        body: JSON.stringify({
          title: 'Hello',
          body: 'Testing the network lens',
          userId: 7,
          tags: ['a', 'b', 'c'],
          meta: { nested: { deep: { value: 42, flag: true, nothing: null } } },
        }),
      }).then((r) => r.json()),
  },
  {
    label: 'PUT with query string',
    run: () =>
      fetch(`${JSON_API}/posts/1?include=comments&sort=desc&page=2`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1, title: 'updated' }),
      }).then((r) => r.json()),
  },
  {
    label: 'POST form-urlencoded',
    run: () =>
      fetch(`${HTTPBIN}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=jane&remember=true&note=hello%20world',
      }).then((r) => r.json()),
  },
  {
    label: 'GraphQL-style POST',
    run: () =>
      fetch(`${HTTPBIN}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationName: 'GetViewer',
          query: 'query GetViewer { viewer { id name } }',
          variables: { first: 10 },
        }),
      }).then((r) => r.json()),
  },
  {
    label: 'DELETE',
    run: () => fetch(`${JSON_API}/posts/1`, { method: 'DELETE' }),
  },
  { label: '404 Not found', run: () => fetch(`${HTTPBIN}/status/404`) },
  { label: '500 Server error', run: () => fetch(`${HTTPBIN}/status/500`) },
  {
    label: 'Slow (3s)',
    run: () => fetch(`${HTTPBIN}/delay/3`).then((r) => r.json()),
  },
  {
    label: 'Network failure',
    run: () =>
      fetch('https://this-host-does-not-exist.invalid/x').catch(() => null),
  },
  {
    label: 'Image (binary)',
    run: () => fetch(`${HTTPBIN}/image/png`).then((r) => r.blob()),
  },
  {
    label: 'Plain text',
    run: () => fetch(`${HTTPBIN}/robots.txt`).then((r) => r.text()),
  },
  {
    label: 'XMLHttpRequest with timeout',
    run: () =>
      new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${HTTPBIN}/delay/5`);
        xhr.timeout = 1500;
        xhr.onloadend = () => resolve(null);
        xhr.send();
      }),
  },
];

export default function App() {
  const scheme = useColorScheme();
  const [enabled, setEnabled] = useState(INITIAL_ENABLED);
  const [theme, setTheme] = useState<ThemeName>('auto');
  const [showInline, setShowInline] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (enabled)
      startNetworkLogging({ enabled: true, ignoredHosts: ['localhost'] });
    else stopNetworkLogging();
  }, [enabled]);

  const dark = theme === 'dark' || (theme === 'auto' && scheme === 'dark');
  const colors = dark
    ? {
        bg: '#0f1115',
        card: '#181b21',
        text: '#e6e8eb',
        muted: '#9aa3af',
        accent: '#60a5fa',
        border: '#2d323c',
      }
    : {
        bg: '#f2f3f5',
        card: '#ffffff',
        text: '#161a21',
        muted: '#6b7280',
        accent: '#2563eb',
        border: '#e5e7eb',
      };

  const fire = async (label: string, run: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await run();
    } catch {
      // errors are expected for some demos
    } finally {
      setBusy(null);
    }
  };

  const fireAll = async () => {
    setBusy('all');
    await Promise.allSettled(demoRequests.slice(0, 9).map((d) => d.run()));
    setBusy(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {showInline ? (
        <View style={styles.inline}>
          <View style={[styles.inlineHeader, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Inline inspector
            </Text>
            <Pressable onPress={() => setShowInline(false)} hitSlop={8}>
              <Text style={[styles.link, { color: colors.accent }]}>Done</Text>
            </Pressable>
          </View>
          <NetworkLens theme={theme} enabled={enabled} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>
            react-native-network-lens
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Fire some requests, then tap the floating NET button to inspect
            them.
          </Text>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Row label="Inspector enabled (feature flag)" color={colors.text}>
              <Switch value={enabled} onValueChange={setEnabled} />
            </Row>
            <Row label="Theme" color={colors.text}>
              <View style={styles.segment}>
                {(['auto', 'light', 'dark'] as ThemeName[]).map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => setTheme(name)}
                    style={[
                      styles.segmentItem,
                      theme === name && { backgroundColor: colors.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        theme === name
                          ? styles.primaryLabel
                          : { color: colors.text },
                      ]}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Row>
            <Pressable
              onPress={() => setShowInline(true)}
              style={[styles.button, { borderColor: colors.accent }]}
            >
              <Text style={[styles.buttonLabel, { color: colors.accent }]}>
                Open inspector inline (as a screen)
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.muted }]}>
            DEMO REQUESTS
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Pressable
              onPress={fireAll}
              style={[
                styles.button,
                styles.primary,
                { backgroundColor: colors.accent },
              ]}
            >
              <Text style={[styles.buttonLabel, styles.primaryLabel]}>
                {busy === 'all' ? 'Firing…' : 'Fire the first 9 at once'}
              </Text>
            </Pressable>
            {demoRequests.map((demo) => (
              <Pressable
                key={demo.label}
                onPress={() => fire(demo.label, demo.run)}
                style={[styles.item, { borderTopColor: colors.border }]}
              >
                <Text style={[styles.itemLabel, { color: colors.text }]}>
                  {demo.label}
                </Text>
                <Text style={{ color: colors.muted }}>
                  {busy === demo.label ? '…' : '›'}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* The overlay is the one-liner most apps will use. `enabled` is the flag. */}
      <NetworkLensOverlay enabled={enabled && !showInline} theme={theme} />
    </View>
  );
}

const Row = ({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: ReactNode;
}) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, { color }]}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 59 : (StatusBar.currentHeight ?? 24),
  },
  content: { padding: 16, paddingBottom: 120 },
  inline: { flex: 1 },
  inlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  link: { fontSize: 16, fontWeight: '600' },
  card: { borderRadius: 12, padding: 12, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 15, flex: 1, marginRight: 12 },
  segment: { flexDirection: 'row', gap: 4 },
  segmentLabel: { fontSize: 13 },
  primaryLabel: { color: '#fff' },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primary: { borderWidth: 0, marginBottom: 8 },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemLabel: { fontSize: 15 },
});
