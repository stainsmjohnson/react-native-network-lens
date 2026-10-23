import { createContext, useContext } from 'react';
import { Platform, useColorScheme } from 'react-native';
import type { DeepPartial } from './types';

export type ThemeName = 'light' | 'dark' | 'auto';

export type Theme = {
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    primary: string;
    onPrimary: string;
    statusGood: string;
    statusRedirect: string;
    statusWarning: string;
    statusBad: string;
    statusPending: string;
    methodGet: string;
    methodPost: string;
    methodPut: string;
    methodPatch: string;
    methodDelete: string;
    methodOther: string;
    jsonKey: string;
    jsonString: string;
    jsonNumber: string;
    jsonBoolean: string;
    jsonNull: string;
    highlight: string;
    highlightActive: string;
    onHighlight: string;
  };
  fonts: {
    mono: string;
  };
  sizes: {
    codeFontSize: number;
    codeLineHeight: number;
  };
};

const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const lightTheme: Theme = {
  colors: {
    background: '#f2f3f5',
    surface: '#ffffff',
    surfaceAlt: '#eaecf0',
    border: '#d9dce1',
    text: '#161a21',
    textMuted: '#6b7280',
    primary: '#2563eb',
    onPrimary: '#ffffff',
    statusGood: '#15803d',
    statusRedirect: '#0e7490',
    statusWarning: '#c2410c',
    statusBad: '#b91c1c',
    statusPending: '#6b7280',
    methodGet: '#2563eb',
    methodPost: '#15803d',
    methodPut: '#b45309',
    methodPatch: '#7c3aed',
    methodDelete: '#b91c1c',
    methodOther: '#475569',
    jsonKey: '#881391',
    jsonString: '#c41a16',
    jsonNumber: '#1c00cf',
    jsonBoolean: '#0d22aa',
    jsonNull: '#808080',
    highlight: '#fde68a',
    highlightActive: '#f59e0b',
    onHighlight: '#1f2937',
  },
  fonts: { mono: mono ?? 'monospace' },
  sizes: { codeFontSize: 13, codeLineHeight: 20 },
};

export const darkTheme: Theme = {
  colors: {
    background: '#0f1115',
    surface: '#181b21',
    surfaceAlt: '#22262e',
    border: '#2d323c',
    text: '#e6e8eb',
    textMuted: '#9aa3af',
    primary: '#60a5fa',
    onPrimary: '#0b1220',
    statusGood: '#4ade80',
    statusRedirect: '#22d3ee',
    statusWarning: '#fb923c',
    statusBad: '#f87171',
    statusPending: '#9aa3af',
    methodGet: '#60a5fa',
    methodPost: '#4ade80',
    methodPut: '#fbbf24',
    methodPatch: '#c084fc',
    methodDelete: '#f87171',
    methodOther: '#94a3b8',
    jsonKey: '#e2a8ff',
    jsonString: '#ff8a80',
    jsonNumber: '#9ecbff',
    jsonBoolean: '#9ecbff',
    jsonNull: '#9aa3af',
    highlight: '#5b4a12',
    highlightActive: '#d97706',
    onHighlight: '#fef3c7',
  },
  fonts: { mono: mono ?? 'monospace' },
  sizes: { codeFontSize: 13, codeLineHeight: 20 },
};

export type ThemeInput = ThemeName | DeepPartial<Theme>;

export const ThemeContext = createContext<ThemeInput>('auto');

const merge = (base: Theme, override: DeepPartial<Theme>): Theme => ({
  colors: { ...base.colors, ...(override.colors as Partial<Theme['colors']>) },
  fonts: { ...base.fonts, ...(override.fonts as Partial<Theme['fonts']>) },
  sizes: { ...base.sizes, ...(override.sizes as Partial<Theme['sizes']>) },
});

export const resolveTheme = (
  input: ThemeInput,
  systemScheme: 'light' | 'dark'
): Theme => {
  if (input === 'auto') return systemScheme === 'dark' ? darkTheme : lightTheme;
  if (input === 'dark') return darkTheme;
  if (input === 'light') return lightTheme;
  return merge(systemScheme === 'dark' ? darkTheme : lightTheme, input);
};

export const useTheme = (): Theme => {
  const input = useContext(ThemeContext);
  const scheme = useColorScheme();
  return resolveTheme(input, scheme === 'dark' ? 'dark' : 'light');
};

export const methodColor = (theme: Theme, method: string): string => {
  switch (method) {
    case 'GET':
      return theme.colors.methodGet;
    case 'POST':
      return theme.colors.methodPost;
    case 'PUT':
      return theme.colors.methodPut;
    case 'PATCH':
      return theme.colors.methodPatch;
    case 'DELETE':
      return theme.colors.methodDelete;
    default:
      return theme.colors.methodOther;
  }
};

export const statusColor = (
  theme: Theme,
  status: number,
  failed = false
): string => {
  if (failed) return theme.colors.statusBad;
  if (status <= 0) return theme.colors.statusPending;
  if (status < 300) return theme.colors.statusGood;
  if (status < 400) return theme.colors.statusRedirect;
  if (status < 500) return theme.colors.statusWarning;
  return theme.colors.statusBad;
};
