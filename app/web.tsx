import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Text } from '@/components/ui';
import { SITE_URL } from '@/constants/config';
import { C, S } from '@/constants/theme';

const SITE_HOSTS = new Set(['www.nikfoods.com', 'nikfoods.com', new URL(SITE_URL).host]);

/**
 * Any page of the NikFoods website opened from a link (Terms, Privacy, FAQs, ...): shown inside the app, fully working. Only
 * pages of the site itself open here; a link to somewhere else goes to Safari.
 */
export default function Web() {
  const router = useRouter();
  const { path } = useLocalSearchParams<{ path?: string }>();
  const raw = String(path ?? '/');
  // only a path of this site (never a full address someone else chose)
  const safe = raw.startsWith('/') && !raw.startsWith('//') && !/[\s\\]/.test(raw) ? raw : '/';
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.white }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.sm }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={22} color={C.ink} />
        </Pressable>
        <Text weight="bold" size={17} numberOfLines={1} style={{ flex: 1 }}>{title || 'NikFoods'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: `${SITE_URL}${safe}` }}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(s) => s.title && setTitle(s.title.replace(/\s*[|-]\s*NikFoods.*$/i, ''))}
          onShouldStartLoadWithRequest={(req) => {
            try {
              const host = new URL(req.url).host;
              if (SITE_HOSTS.has(host) || req.url.startsWith('about:')) return true;
            } catch {
              // not a web address: let the phone decide below
            }
            void Linking.openURL(req.url).catch(() => undefined);
            return false;
          }}
          allowsBackForwardNavigationGestures
        />
        {loading && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
            <ActivityIndicator color={C.brand} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
