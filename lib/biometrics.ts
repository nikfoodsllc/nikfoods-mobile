import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** What the phone's own unlock is called when we cannot tell (iPhone: Face ID; Android: Fingerprint). */
export const DEFAULT_LOCK_LABEL = Platform.OS === 'android' ? 'Fingerprint' : 'Face ID';

/**
 * Optional lock for the app (Face ID, Touch ID, or the phone's passcode as the fallback). Off until the customer turns it on in
 * Account. The choice is kept on this phone only.
 */
const KEY = 'appLockEnabled';

export const isLockEnabled = (): boolean => localStorage.getItem(KEY) === '1';
export const setLockEnabled = (on: boolean): void => {
  if (on) localStorage.setItem(KEY, '1');
  else localStorage.removeItem(KEY);
};

/** How long the app can be in the background before it asks again. */
export const RELOCK_AFTER_MS = 30_000;

export interface LockSupport {
  available: boolean;
  /** what to call it: "Face ID", "Touch ID" or "Passcode" (Android: "Face unlock", "Fingerprint" or "Screen lock") */
  label: string;
}

export async function lockSupport(): Promise<LockSupport> {
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    if (!hasHardware || !enrolled) return { available: false, label: DEFAULT_LOCK_LABEL };
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    // most Android phones unlock with a fingerprint; the face option there is often the weaker kind, so the fingerprint name comes first
    const label = Platform.OS === 'android' ? (finger ? 'Fingerprint' : face ? 'Face unlock' : 'Screen lock') : face ? 'Face ID' : finger ? 'Touch ID' : 'Passcode';
    return { available: true, label };
  } catch {
    return { available: false, label: DEFAULT_LOCK_LABEL };
  }
}

/** Asks the phone to check who is holding it. The passcode works too, so nobody is locked out. */
export async function authenticate(reason: string): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Cancel', fallbackLabel: 'Use passcode', disableDeviceFallback: false });
    return r.success;
  } catch {
    return false;
  }
}

/** Should the app ask again after being away since `leftAt` (ms)? */
export function shouldRelock(leftAt: number | null, now: number = Date.now()): boolean {
  return leftAt !== null && now - leftAt > RELOCK_AFTER_MS;
}
