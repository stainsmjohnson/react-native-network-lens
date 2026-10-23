import Logger from './Logger';

const KEY = '__reactNativeNetworkLens__';

type GlobalWithLogger = typeof globalThis & { [KEY]?: Logger };

/**
 * One logger per JS runtime. It lives on `globalThis` so that Fast Refresh
 * (which re-evaluates modules) keeps the same instance and the same patched
 * XMLHttpRequest instead of silently creating a fresh, disabled one.
 */
const logger: Logger = ((globalThis as GlobalWithLogger)[KEY] ??= new Logger());

export default logger;
