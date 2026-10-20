import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { SITE_URL } from '@/constants/config';

/**

 * sends order updates, menu alerts and cart reminders to it. The customer decides in iPhone Settings and in the app
 * (Account > Notifications). The question is asked once, the first time the app opens (PushBridge); after that
 * the customer uses Account > Notifications.
 */
export type PushState = 'granted' | 'denied' | 'undetermined' | 'unavailable';
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const TOKEN_KEY = 'pushToken';
const ASKED_KEY = 'pushAsked';

/** A notification shown while the app is open appears as a banner, like any other. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Notifications need a real iPhone (the simulator cannot get a push token). */
export async function pushState(): Promise<PushState> {
  if (Platform.OS !== 'ios' || !Device.isDevice) return 'unavailable';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  if (p.status === 'denied' || p.canAskAgain === false) return 'denied';
  return 'undetermined';
}

/** Shows iOS's own "Allow notifications?" question (only the first time; after that the customer uses iPhone Settings). */
export async function askForPush(): Promise<PushState> {
  const before = await pushState();
  if (before !== 'undetermined') return before;
  localStorage.setItem(ASKED_KEY, '1');
  await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  return pushState();
}

export const wasAskedBefore = (): boolean => localStorage.getItem(ASKED_KEY) === '1';
export const markAsked = (): void => localStorage.setItem(ASKED_KEY, '1');
export const openPhoneSettings = (): Promise<void> => Linking.openSettings();

async function expoToken(): Promise<string | null> {
  try {
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    const t = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return t.data;
  } catch (error) {
    console.warn('push token failed', error instanceof Error ? error.message : error);
    return null;
  }
}

/** Tells the site about this phone (when the customer allowed notifications). Quiet: returns false when it cannot. */
export async function registerPush(authenticatedFetch: Fetcher): Promise<boolean> {
  if ((await pushState()) !== 'granted') return false;
  const token = await expoToken();
  if (!token) return false;
  try {
    const r = await authenticatedFetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: 'ios', deviceName: Device.deviceName ?? '', appVersion: Constants.expoConfig?.version ?? '' }),
    });
    if (r.ok) localStorage.setItem(TOKEN_KEY, token);
    return r.ok;
  } catch {
    return false;
  }
}

/** The customer logged out: this phone stops getting their notifications. */
export async function unregisterPush(authenticatedFetch: Fetcher): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    await authenticatedFetch('/api/push/register', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
  } catch {
    // the site also forgets a phone that Apple says is gone
  }
  localStorage.removeItem(TOKEN_KEY);
}

export type NotificationTarget = { kind: 'order'; id: string } | { kind: 'pay'; url: string } | { kind: 'cart' } | { kind: 'menu' };

/** What to open when a notification is tapped, from the data the site sent with it. Only our own site's pay links are opened. */
export function targetForNotification(data: unknown): NotificationTarget | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { type?: unknown; orderId?: unknown; url?: unknown };
  if (d.type === 'order' && typeof d.orderId === 'string' && d.orderId) return { kind: 'order', id: d.orderId };
  if (d.type === 'pay' && typeof d.url === 'string') {
    try {
      if (new URL(d.url).host === new URL(SITE_URL).host && new URL(d.url).protocol.startsWith('http')) return { kind: 'pay', url: d.url };
    } catch {
      return null;
    }
    return null;
  }
  if (d.type === 'cart') return { kind: 'cart' };
  if (d.type === 'menu') return { kind: 'menu' };
  return null;
}
