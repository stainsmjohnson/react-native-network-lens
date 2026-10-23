import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type NetworkRequest from '../../core/NetworkRequest';
import { useAsyncValue } from '../../hooks';
import { methodColor, statusColor, useTheme } from '../../theme';
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatTime,
} from '../../utils/format';
import BodyViewer from '../BodyViewer';
import {
  IconButton,
  KeyValueList,
  Pill,
  Section,
  SegmentedControl,
  TextButton,
} from '../ui';

type Tab = 'overview' | 'request' | 'response';

interface Props {
  request: NetworkRequest;
  onClose: () => void;
  copyToClipboard?: (text: string) => void;
}

const share = (text: string) =>
  Share.share({ message: text }).catch(() => undefined);

const statusLabel = (request: NetworkRequest) => {
  if (request.state === 'failed')
    return (request.failureReason ?? 'failed').toUpperCase();
  return request.status > 0 ? String(request.status) : 'PENDING';
};

const RequestDetails = ({ request, onClose, copyToClipboard }: Props) => {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('overview');
  const [urlExpanded, setUrlExpanded] = useState(false);

  const failed = request.state === 'failed';
  const requestBody = request.getRequestBody();
  const { value: responseBody, loading } = useAsyncValue(
    () => request.getResponseBody(),
    [request, request.updatedAt]
  );

  const summary = [
    request.duration >= 0 && formatDuration(request.duration),
    request.responseSize > 0 && formatBytes(request.responseSize),
    formatTime(request.startTime, true),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pill
            label={request.method}
            color={methodColor(theme, request.method)}
            filled
          />
          <Pill
            label={statusLabel(request)}
            color={statusColor(theme, request.status, failed)}
          />
          <Text
            style={[styles.summary, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {summary}
          </Text>
          <IconButton
            glyph="✕"
            accessibilityLabel="Back to list"
            onPress={onClose}
          />
        </View>
        <Pressable
          onPress={() => setUrlExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Toggle full URL"
        >
          <Text
            selectable
            numberOfLines={urlExpanded ? undefined : 2}
            style={[styles.url, { color: theme.colors.text }]}
          >
            {request.url}
          </Text>
        </Pressable>
        {request.gqlOperation ? (
          <Text style={[styles.gql, { color: theme.colors.primary }]}>
            gql: {request.gqlOperation}
          </Text>
        ) : null}
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          style={styles.tabs}
          options={[
            { value: 'overview', label: 'Overview' },
            {
              value: 'request',
              label: 'Request',
              badge: requestBody.kind !== 'empty',
            },
            {
              value: 'response',
              label: 'Response',
              badge: !!responseBody && responseBody.kind !== 'empty',
            },
          ]}
        />
      </View>

      {tab === 'overview' && (
        <OverviewTab request={request} copyToClipboard={copyToClipboard} />
      )}
      {tab === 'request' && (
        <BodyViewer
          body={requestBody}
          emptyTitle="No request body"
          emptySubtitle={`${request.method} requests usually carry no payload.`}
          copyToClipboard={copyToClipboard}
        />
      )}
      {tab === 'response' && (
        <BodyViewer
          body={responseBody}
          loading={loading || request.state === 'pending'}
          emptyTitle={
            failed
              ? `Request ${request.failureReason ?? 'failed'}`
              : 'No response body'
          }
          emptySubtitle={
            failed
              ? 'The server never answered, so there is nothing to show.'
              : undefined
          }
          copyToClipboard={copyToClipboard}
        />
      )}
    </View>
  );
};

const OverviewTab = ({
  request,
  copyToClipboard,
}: {
  request: NetworkRequest;
  copyToClipboard?: (text: string) => void;
}) => {
  const theme = useTheme();
  const query = Object.entries(request.parsedUrl.query);

  const general: [string, string][] = [
    ['URL', request.url],
    ['Method', request.method],
    [
      'Status',
      request.state === 'failed'
        ? `Failed (${request.failureReason ?? 'error'})`
        : statusLabel(request),
    ],
    [
      'Duration',
      request.duration >= 0 ? formatDuration(request.duration) : '—',
    ],
    ['Started', request.startTime ? formatDateTime(request.startTime) : '—'],
    [
      'Response size',
      request.responseSize > 0 ? formatBytes(request.responseSize) : '—',
    ],
    ['Content type', request.responseContentType || '—'],
  ];
  if (request.responseURL && request.responseURL !== request.url) {
    general.push(['Final URL', request.responseURL]);
  }

  const actions = (text: string) => (
    <View style={styles.sectionActions}>
      {copyToClipboard && (
        <TextButton
          label="Copy"
          onPress={() => copyToClipboard(text)}
          style={styles.smallButton}
        />
      )}
      <TextButton
        label="Share"
        onPress={() => share(text)}
        style={styles.smallButton}
      />
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={styles.overview}
      keyboardShouldPersistTaps="handled"
    >
      <Section title="General">
        <KeyValueList entries={general} />
      </Section>
      {query.length > 0 && (
        <Section
          title="Query parameters"
          right={actions(JSON.stringify(request.parsedUrl.query, null, 2))}
        >
          <KeyValueList entries={query} mono />
        </Section>
      )}
      <Section
        title={`Request headers (${Object.keys(request.requestHeaders).length})`}
        right={actions(JSON.stringify(request.requestHeaders, null, 2))}
      >
        <KeyValueList
          entries={Object.entries(request.requestHeaders)}
          mono
          emptyLabel="No request headers"
        />
      </Section>
      <Section
        title={`Response headers (${Object.keys(request.responseHeaders).length})`}
        right={actions(JSON.stringify(request.responseHeaders, null, 2))}
      >
        <KeyValueList
          entries={Object.entries(request.responseHeaders)}
          mono
          emptyLabel="No response headers yet"
        />
      </Section>
      <Section title="Export">
        <View style={styles.exportRow}>
          <TextButton
            label="Share as cURL"
            onPress={() => share(request.curl)}
            style={styles.exportButton}
          />
          <TextButton
            label="Share full request"
            onPress={async () =>
              share(JSON.stringify(await request.toJSON(), null, 2))
            }
            style={styles.exportButton}
          />
          {copyToClipboard && (
            <TextButton
              label="Copy cURL"
              onPress={() => copyToClipboard(request.curl)}
              style={styles.exportButton}
            />
          )}
        </View>
      </Section>
      <Text style={[styles.footer, { color: theme.colors.textMuted }]}>
        Request #{request.id}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summary: { flex: 1, fontSize: 12, fontVariant: ['tabular-nums'] },
  url: { fontSize: 14, marginTop: 8, lineHeight: 19 },
  gql: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  tabs: { marginTop: 10 },
  overview: { paddingBottom: 24 },
  sectionActions: { flexDirection: 'row', gap: 6 },
  smallButton: { paddingVertical: 3, paddingHorizontal: 8 },
  exportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  exportButton: { paddingVertical: 8 },
  footer: { textAlign: 'center', fontSize: 11, marginTop: 20 },
});

export default RequestDetails;
