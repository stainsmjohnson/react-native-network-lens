import { useSyncExternalStore } from 'react';
import type { Theme } from './theme';

/**
 * Tiny in-memory preferences shared by every viewer in the session, e.g. the
 * code font scale the user picks with the "Aa" button.
 */
export type CodeFontScale = 'small' | 'medium' | 'large';

const SCALE_FACTOR: Record<CodeFontScale, number> = {
  small: 0.85,
  medium: 1,
  large: 1.2,
};
const ORDER: CodeFontScale[] = ['small', 'medium', 'large'];

let scale: CodeFontScale = 'medium';
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getScale = () => scale;

export const setCodeFontScale = (next: CodeFontScale) => {
  if (scale === next) return;
  scale = next;
  listeners.forEach((listener) => listener());
};

export const cycleCodeFontScale = () => {
  setCodeFontScale(
    ORDER[(ORDER.indexOf(scale) + 1) % ORDER.length] ?? 'medium'
  );
};

export const useCodeFontScale = (): CodeFontScale =>
  useSyncExternalStore(subscribe, getScale, getScale);

/** Font metrics for code views: the theme's base size times the chosen scale. */
export const useCodeFont = (theme: Theme) => {
  const current = useCodeFontScale();
  const factor = SCALE_FACTOR[current];
  const fontSize = Math.round(theme.sizes.codeFontSize * factor);
  return {
    scale: current,
    fontSize,
    lineHeight: Math.round(fontSize * 1.5),
    /** Average glyph advance for monospace fonts; used to size horizontal scroll areas. */
    charWidth: fontSize * 0.62,
  };
};
