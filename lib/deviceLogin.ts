import * as SecureStore from 'expo-secure-store';
import { lockSupport } from '@/lib/biometrics';

/**
 * Sign in with Face ID. After a normal sign-in the site gives this phone a long random key; it is kept in the iPhone Keychain
 * behind Face ID (the password is never stored). On the sign-in screen Face ID releases the key and the site answers with a normal
 * login. The key is cancelled by the site when the password is changed or reset, and by turning the switch off.
 */
const KEY_NAME = 'nikfoodsDeviceKey';
const ENABLED_FLAG = 'faceIdSignIn'; // known without asking Face ID
const DECLINED_FLAG = 'faceIdSignInDeclined';

export const isFaceIdSignInOn = (): boolean => localStorage.getItem(ENABLED_FLAG) === '1';
export const wasFaceIdOfferDeclined = (): boolean => localStorage.getItem(DECLINED_FLAG) === '1';
export const rememberFaceIdOfferDeclined = (): void => localStorage.setItem(DECLINED_FLAG, '1');

export interface SignInResult {
  user: { id: string; email: string; name?: string; phone?: string; role: string; isCompleted?: boolean };
  token: string;
  refreshToken: string;
}

/** Customer is signed in: ask the site for this phone's key and lock it behind Face ID. Returns false if anything went wrong. */
export async function turnOnFaceIdSignIn(deviceName: string): Promise<boolean> {
  try {
    const support = await lockSupport();
    if (!support.available) return false;
    const accessToken = localStorage.getItem('accessToken') || '';
    if (!accessToken) return false;
    const r = await fetch('/api/auth/biometric', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ deviceName }) });
    const j = await r.json().catch(() => ({}));
    const key = j?.data?.deviceKey;
    if (!r.ok || typeof key !== 'string') return false;
    await SecureStore.setItemAsync(KEY_NAME, key, { requireAuthentication: true, authenticationPrompt: 'Turn on Face ID sign-in' });
    localStorage.setItem(ENABLED_FLAG, '1');
    localStorage.removeItem(DECLINED_FLAG);
    return true;
  } catch {
    return false;
  }
}

/** Forget this phone's key (here and on the site). Face ID is asked to read it so the site can cancel it too; if that is not possible it is still removed here. */
export async function turnOffFaceIdSignIn(): Promise<void> {
  try {
    const key = await SecureStore.getItemAsync(KEY_NAME, { requireAuthentication: true, authenticationPrompt: 'Turn off Face ID sign-in' }).catch(() => null);
    if (key) await fetch('/api/auth/biometric', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceKey: key }) }).catch(() => undefined);
  } finally {
    await SecureStore.deleteItemAsync(KEY_NAME).catch(() => undefined);
    localStorage.removeItem(ENABLED_FLAG);
  }
}

/** The account is gone or signed out for good: drop this phone's key without asking Face ID (the site already cancelled it). */
export async function forgetFaceIdSignInHere(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_NAME).catch(() => undefined);
  localStorage.removeItem(ENABLED_FLAG);
}

export type FaceIdOutcome = { ok: true; result: SignInResult } | { ok: false; reason: 'cancelled' | 'expired' | 'network' };

/** Face ID, then the site's answer. 'expired': the key no longer works (password changed, or Face ID changed): use the password once. */
export async function signInWithFaceId(): Promise<FaceIdOutcome> {
  let key: string | null = null;
  try {
    key = await SecureStore.getItemAsync(KEY_NAME, { requireAuthentication: true, authenticationPrompt: 'Sign in to NikFoods' });
  } catch {
    // the key can no longer be opened (for example Face ID was reset): the password is needed once
    await SecureStore.deleteItemAsync(KEY_NAME).catch(() => undefined);
    localStorage.removeItem(ENABLED_FLAG);
    return { ok: false, reason: 'expired' };
  }
  if (!key) return { ok: false, reason: 'cancelled' };
  try {
    const r = await fetch('/api/auth/biometric/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceKey: key }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) {
      await SecureStore.deleteItemAsync(KEY_NAME).catch(() => undefined);
      localStorage.removeItem(ENABLED_FLAG);
      return { ok: false, reason: 'expired' };
    }
    if (!r.ok || !j?.data?.user || !j?.data?.token) return { ok: false, reason: 'network' };
    return { ok: true, result: { user: j.data.user, token: j.data.token, refreshToken: j.data.refreshToken } };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
