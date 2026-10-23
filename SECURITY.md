# Security policy

## What this library does

`react-native-network-lens` patches `XMLHttpRequest` and keeps every captured
request **in memory**, including request/response headers (authorization
tokens, cookies) and bodies. It also offers "Share" and "Export" actions that
hand that data to other apps.

Treat it as a development tool:

- Gate it behind `__DEV__` or an internal feature flag. Never enable it for end
  users in production builds.
- Use `ignoredHosts` / `ignoredPatterns` to keep sensitive endpoints out of the
  log if the inspector must run in a shared build.
- `stopNetworkLogging()` restores the original `XMLHttpRequest` and frees all
  captured data.

## Reporting a vulnerability

Please do not open a public issue for security problems. Email
**grahamstains1999@gmail.com** with a description and reproduction steps. You
will get an acknowledgement within a few days, and a fix or mitigation will be
published as soon as it is ready. Reports are credited in the release notes
unless you prefer otherwise.
