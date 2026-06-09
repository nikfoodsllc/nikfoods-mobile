import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';

export {
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Step 1: Logo scales up and fades in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Step 2: Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Step 3: Subtitle fades in
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          // Step 4: Hold for 1000ms then fade out
          setTimeout(() => {
            Animated.timing(splashOpacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }).start(() => {
              onFinish();
            });
          }, 1000);
        });
      });
    });
  }, []);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
      {/* Dark card behind logo for contrast */}
      <View style={styles.logoCard}>
        <Animated.View style={{
          transform: [{ scale: logoScale }],
          opacity: logoOpacity,
          alignItems: 'center',
        }}>
          <Image
            source={require('../assets/images/nikfoods-logo.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Animated.Text style={[styles.splashTagline, { opacity: taglineOpacity }]}>
        Authentic Indian food
      </Animated.Text>

      <Animated.Text style={[styles.splashSubtitle, { opacity: subtitleOpacity }]}>
        Eat Healthy, Live Happy
      </Animated.Text>
    </Animated.View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <AnimatedSplash onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#E07B39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCard: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  splashLogo: {
    width: 260,
    height: 100,
  },
  splashTagline: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 15,
    color: '#FFE5D0',
    fontWeight: '400',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
});