import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/AuthContext';
import { openStore } from '@/lib/appUpdate';
import { useApiClient } from '@/hooks/useApiClient';
import { askForPush, markAsked, pushState, registerPush, targetForNotification, wasAskedBefore, type NotificationTarget } from '@/lib/push';

/**
 * Lives inside the app (renders nothing): keeps this phone registered for the signed-in customer (when they allowed
 * notifications) and opens the right screen when a notification is tapped, also when the app was closed.
 */
export default function PushBridge() {
  const router = useRouter();
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const handledColdStart = useRef(false);
  // the latest signed-in customer, for callbacks that outlive a render (the permission answer can arrive much later)
  const userRef = useRef(user);
  userRef.current = user;

  const open = (target: NotificationTarget | null) => {
    if (!target) return;
    // the list goes underneath first, so Back from the order lands on All orders (not on the menu)
    if (target.kind === 'order') {
      router.navigate('/account/orders');
      setTimeout(() => router.push({ pathname: '/account/orders/[id]', params: { id: target.id, from: 'push' } }), 50);
    }
    else if (target.kind === 'pay') void WebBrowser.openBrowserAsync(target.url);
    else if (target.kind === 'cart') router.navigate('/cart');
    else if (target.kind === 'update') openStore();
    else router.navigate('/');
  };
  const openRef = useRef(open);
  openRef.current = open;

  // coming back to the app (also after the question or iPhone Settings): register this phone if it is allowed now
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && userRef.current) void registerPush(authenticatedFetch);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a signed-in customer who allowed notifications: (re)register this phone (the token can change)
  useEffect(() => {
    if (!user) return;
    void registerPush(authenticatedFetch);
    // first sign-in: ask once (our own question first, so iPhone's one-time box is only used when they say yes)
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled || wasAskedBefore() || (await pushState()) !== 'undetermined') return;
      markAsked();
      Alert.alert('Get order and menu updates?', 'We will tell you when your order is on its way and delivered, and when the new menu is out.', [
        { text: 'Not now', style: 'cancel', onPress: () => void registerPush(authenticatedFetch) },
        { text: 'Turn on', onPress: async () => {
          const state = await askForPush();
          if (state !== 'unavailable') void registerPush(authenticatedFetch);
        } },
      ]);
    }, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => openRef.current(targetForNotification(response.notification.request.content.data)));
    if (!handledColdStart.current) {
      handledColdStart.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) openRef.current(targetForNotification(response.notification.request.content.data));
      });
    }
    return () => sub.remove();
  }, []);

  return null;
}
