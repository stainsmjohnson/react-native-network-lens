let appBackHandler: (() => unknown) | undefined;
let lensBackHandler: (() => boolean) | undefined;

/** @internal */
export const setLensBackHandler = (handler?: () => boolean) => {
  lensBackHandler = handler;
};

/** @internal */
export const hasAppBackHandler = () => !!appBackHandler;

const goBack = () => {
  if (lensBackHandler?.()) return;
  appBackHandler?.();
};

/**
 * Wrap your screen's back action so the back button first navigates inside the
 * inspector (details -> list) and only then falls back to your own navigation.
 *
 * ```tsx
 * const onBack = getBackHandler(navigation.goBack);
 * <Button title="Back" onPress={onBack} />
 * ```
 */
export const getBackHandler = (backHandler: () => unknown) => {
  appBackHandler = backHandler;
  return goBack;
};
