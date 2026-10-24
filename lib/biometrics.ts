import * as LocalAuthentication from 'expo-local-authentication';

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
  /** what to call it: "Face ID", "Touch ID" or "Passcode" */
  label: string;
}

export async function lockSupport(): Promise<LockSupport> {
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    if (!hasHardware || !enrolled) return { available: false, label: 'Face ID' };
    const label = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? 'Face ID' : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT) ? 'Touch ID' : 'Passcode';
    return { available: true, label };
  } catch {
    return { available: false, label: 'Face ID' };
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
