import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PushBridge from '@/components/PushBridge';
import { ToastProvider } from '@/components/Toast';
import { APPLE_MERCHANT_ID, STRIPE_PUBLISHABLE_KEY } from '@/constants/config';
import { C } from '@/constants/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { configureNotifications } from '@/lib/push';
import { initRuntime, onRedirect } from '@/lib/runtime';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();
configureNotifications();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, ...Ionicons.font, ...FontAwesome.font });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initRuntime()
      .catch((e) => console.warn('runtime init failed', e))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && ready) void SplashScreen.hideAsync();
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY || 'pk_test_missing'} merchantIdentifier={APPLE_MERCHANT_ID} urlScheme="nikfoodsmobile">
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Nav />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}

function Nav() {
  const router = useRouter();

  // the website code sends visitors to '/' when a session expired: show the sign-in screen
  useEffect(() => onRedirect(() => router.replace('/login')), [router]);

  return (
    <>
      <PushBridge />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="signup" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="forgot-password" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
