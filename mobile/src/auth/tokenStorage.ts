/**
 * Persistence of the JWT between app launches.
 *
 * Native builds use the OS keychain through ``expo-secure-store``. The web
 * target falls back to ``localStorage`` because SecureStore is unavailable in
 * browsers, which keeps ``expo start --web`` usable for quick checks.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'parokia.access_token';

async function secureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

function webStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage;
  } catch {
    return null;
  }
}

/** Read the stored JWT, or ``null`` when the session is anonymous. */
export async function readStoredToken(): Promise<string | null> {
  if (await secureStoreAvailable()) {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }
  return webStorage()?.getItem(TOKEN_KEY) ?? null;
}

/** Persist the JWT for the next launch. */
export async function storeToken(token: string): Promise<void> {
  if (await secureStoreAvailable()) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return;
    } catch {
      // Fall through to the web storage so the session is not silently lost.
    }
  }
  webStorage()?.setItem(TOKEN_KEY, token);
}

/** Drop the stored JWT (sign-out or rejected token). */
export async function clearStoredToken(): Promise<void> {
  if (await secureStoreAvailable()) {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Ignore: the token is also removed from memory by the auth provider.
    }
  }
  webStorage()?.removeItem(TOKEN_KEY);
}
