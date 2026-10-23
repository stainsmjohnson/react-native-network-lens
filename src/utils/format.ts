export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

export const formatDuration = (ms: number): string => {
  if (ms < 0) return '';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

const pad = (num: number) => `0${num}`.slice(-2);

export const formatTime = (time: number, withMillis = false): string => {
  if (!time) return '';
  const date = new Date(time);
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
  if (!withMillis) return base;
  return `${base}.${`00${date.getMilliseconds()}`.slice(-3)}`;
};

export const formatDateTime = (time: number): string => {
  if (!time) return '';
  return new Date(time).toISOString();
};

/** Approximate size of a string in bytes (UTF-8). */
export const byteLength = (text: string): number => {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
};
