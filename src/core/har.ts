import type NetworkRequest from './NetworkRequest';

const headersToArray = (headers: Record<string, string>) =>
  Object.entries(headers).map(([name, value]) => ({ name, value }));

const createHarEntry = async (request: NetworkRequest) => {
  const requestBody = request.getRequestBody();
  const responseBody = await request.getResponseBody();
  return {
    startedDateTime: new Date(request.startTime || Date.now()).toISOString(),
    time: Math.max(request.duration, 0),
    request: {
      method: request.method,
      url: request.url.replace(/\s/g, '%20'),
      httpVersion: 'HTTP/1.1',
      headers: headersToArray(request.requestHeaders),
      queryString: Object.entries(request.parsedUrl.query).map(
        ([name, value]) => ({
          name,
          value,
        })
      ),
      cookies: [],
      headersSize: -1,
      bodySize: -1,
      ...(requestBody.kind !== 'empty'
        ? {
            postData: {
              mimeType: request.requestContentType ?? 'text/plain',
              text: requestBody.text,
            },
          }
        : {}),
    },
    response: {
      status: Math.max(request.status, 0),
      statusText: '',
      httpVersion: 'HTTP/1.1',
      headers: headersToArray(request.responseHeaders),
      cookies: [],
      content: {
        size: request.responseSize || -1,
        mimeType: request.responseContentType || 'text/plain',
        text: responseBody.text,
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: -1,
    },
    cache: {},
    timings: {
      blocked: -1,
      dns: -1,
      ssl: -1,
      connect: -1,
      send: 0,
      wait: Math.max(request.duration, 0),
      receive: 0,
    },
  };
};

/** Minimal HAR 1.2 document that Chrome/Charles/Proxyman can import. */
export const createHar = async (requests: NetworkRequest[]) => ({
  log: {
    version: '1.2',
    creator: { name: 'react-native-network-lens', version: '1.0' },
    pages: [],
    entries: await Promise.all(requests.map(createHarEntry)),
  },
});
