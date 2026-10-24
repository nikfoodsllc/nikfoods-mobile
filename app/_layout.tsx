import { CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppLock from '@/components/AppLock';
import PushBridge from '@/components/PushBridge';
import { ToastProvider } from '@/components/Toast';
import { APP_SCHEME, APPLE_MERCHANT_ID, STRIPE_PUBLISHABLE_KEY } from '@/constants/config';
import { C } from '@/constants/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { routeForIncomingLink } from '@/lib/deepLink';
import { configureNotifications } from '@/lib/push';
import { prefetchMenu } from '@/lib/useHomeMenu';
import { initRuntime, onRedirect } from '@/lib/runtime';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();
configureNotifications();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold, ...Ionicons.font, ...FontAwesome.font });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initRuntime()
      .catch((e) => console.warn('runtime init failed', e))
      .finally(() => {
        setReady(true);
        prefetchMenu(); // the menu is ready by the time someone opens it
      });
  }, []);

  useEffect(() => {
    if (fontsLoaded && ready) void SplashScreen.hideAsync();
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY || 'pk_test_missing'} merchantIdentifier={APPLE_MERCHANT_ID} urlScheme={APP_SCHEME}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <AppLock>
                <Nav />
              </AppLock>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}

let launchLinkHandled = false;

function Nav() {
  const router = useRouter();

  // The link that LAUNCHED the app (a View my order link tapped while the app was closed): the root layout draws nothing until the
  // fonts and storage are ready, and by then the router has dropped it, so the app opened on the menu. Look at it again here, once.
  useEffect(() => {
    if (launchLinkHandled) return;
    launchLinkHandled = true;
    void Linking.getInitialURL().then((url) => {
      if (!url) return;
      const target = routeForIncomingLink(url);
      if (target && target !== '/') router.navigate(target as never);
    });
  }, [router]);

  // the website code sends visitors to '/' when a session expired: show the sign-in screen
  // (pushed over the screen that needed it, not replacing it: after signing in you are back on that screen, for example the order
  // a "View my order" link opened)
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  useEffect(() => onRedirect(() => { if (pathRef.current !== '/login') router.push('/login'); }), [router]);

  return (
    <>
      <PushBridge />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="signup" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="forgot-password" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="chat" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="pay/[orderId]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="web" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
