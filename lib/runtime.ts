/**
 * Makes the website's browser-style code (cart, sign-in, zip lookups) run unchanged on the phone:
 *  - localStorage: kept in memory, written through to AsyncStorage (the two sign-in tokens go to the iOS Keychain)
 *  - relative '/api/...' fetches go to the site address of this build (dev or live, see constants/config.ts)
 *  - window.location / document.visibilityState: just enough for the code that redirects to the home page
 * Call `await initRuntime()` once before the app renders.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { SITE_URL } from '@/constants/config';

const SECURE_KEYS = new Set(['accessToken', 'refreshToken']);
const memory = new Map<string, string>();
let started = false;

type Listener = () => void;
const redirectListeners = new Set<(path: string) => void>();
/** Called when the website code sends the visitor to another page (for example to '/' after the session expired). */
export function onRedirect(listener: (path: string) => void): () => void {
  redirectListeners.add(listener);
  return () => redirectListeners.delete(listener);
}

/** The website code does `window.location.href = '/'` when a session expires: here it asks the app to show the sign-in screen. */
export function redirectHome(path = '/'): void {
  redirectListeners.forEach((l) => l(path));
}

export async function initRuntime(): Promise<void> {
  if (started) return;
  started = true;

  const keys = (await AsyncStorage.getAllKeys()).filter((k) => !SECURE_KEYS.has(k));
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [k, v] of pairs) if (v != null) memory.set(k, v);
  for (const k of SECURE_KEYS) {
    try {
      const v = await SecureStore.getItemAsync(k);
      if (v != null) memory.set(k, v);
    } catch {}
  }

  const storage = {
    get length() {
      return memory.size;
    },
    key: (i: number) => Array.from(memory.keys())[i] ?? null,
    getItem: (k: string) => (memory.has(k) ? (memory.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      const value = String(v);
      memory.set(k, value);
      if (SECURE_KEYS.has(k)) void SecureStore.setItemAsync(k, value).catch(() => {});
      else void AsyncStorage.setItem(k, value).catch(() => {});
    },
    removeItem: (k: string) => {
      memory.delete(k);
      if (SECURE_KEYS.has(k)) void SecureStore.deleteItemAsync(k).catch(() => {});
      else void AsyncStorage.removeItem(k).catch(() => {});
    },
    clear: () => {
      const all = Array.from(memory.keys());
      memory.clear();
      for (const k of all) {
        if (SECURE_KEYS.has(k)) void SecureStore.deleteItemAsync(k).catch(() => {});
        else void AsyncStorage.removeItem(k).catch(() => {});
      }
    },
  };
  (globalThis as any).localStorage = storage;

  // relative API calls from the website code
  const realFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((input: any, init?: any) => {
    if (typeof input === 'string' && input.startsWith('/')) return realFetch(`${SITE_URL}${input}`, init);
    return realFetch(input, init);
  }) as typeof fetch;

  // document.visibilityState / visibilitychange (used to refresh the profile when the app comes back)
  try {
    const visibility = new Set<Listener>();
    (globalThis as any).document = {
      get visibilityState() {
        return AppState.currentState === 'active' ? 'visible' : 'hidden';
      },
      addEventListener: (type: string, l: Listener) => {
        if (type === 'visibilitychange') visibility.add(l);
      },
      removeEventListener: (type: string, l: Listener) => {
        if (type === 'visibilitychange') visibility.delete(l);
      },
    };
    AppState.addEventListener('change', () => visibility.forEach((l) => l()));
  } catch (e) {
    console.warn('runtime: document shim failed', e);
  }
}
