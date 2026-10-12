/**
 * Runtime configuration for the Parokia mobile client.
 *
 * The API base URL is resolved once at import time, in this order:
 *  1. ``EXPO_PUBLIC_API_URL`` — explicit override, mandatory for production builds.
 *  2. The host serving the Expo bundler, so a phone on the parish Wi-Fi reaches the
 *     backend running on the developer machine without editing code.
 *  3. Platform defaults: ``10.0.2.2`` for the Android emulator, ``localhost`` otherwise.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Default port of the FastAPI backend (``backend/.env.example`` → ``PORT``). */
export const API_PORT = 8000;

const RAW_ENV_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function expoDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } | null }).expoGoConfig
      ?.debuggerHost ??
    null;
  if (typeof hostUri !== 'string' || hostUri.length === 0) {
    return null;
  }
  const host = hostUri.split('://').pop()?.split(':')[0] ?? '';
  return host.length > 0 ? host : null;
}

/** Absolute base URL of the Parokia REST API, without a trailing slash. */
export const API_BASE_URL: string = (() => {
  if (RAW_ENV_URL.length > 0) {
    return trimTrailingSlashes(RAW_ENV_URL);
  }
  const host = expoDevHost();
  if (host !== null) {
    return `http://${host}:${API_PORT}`;
  }
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}`
    : `http://localhost:${API_PORT}`;
})();

/** True when the URL was provided through ``EXPO_PUBLIC_API_URL``. */
export const API_BASE_URL_IS_EXPLICIT = RAW_ENV_URL.length > 0;

/** Milliseconds before an API request is aborted. */
export const REQUEST_TIMEOUT_MS = 15000;
