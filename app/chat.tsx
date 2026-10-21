import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Text } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { CRISP_BASE_URL, crispPageHtml, isCrispUrl } from '@/lib/crisp';

/** Chat with us: the website's Crisp chat inside the app. Opened from Account, or from an order ("Need help?"). */
export default function Chat() {
  const router = useRouter();
  const { user } = useAuth();
  const { order } = useLocalSearchParams<{ order?: string }>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const html = useRef(crispPageHtml({ name: user?.name, email: user?.email, orderId: typeof order === 'string' ? order : undefined })).current;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.white }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.md }}>
        <Text weight="bold" size={22} style={{ flex: 1 }}>Chat with us</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close chat" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={22} color={C.text} />
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        {failed ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl, gap: S.md }}>
            <Ionicons name="cloud-offline-outline" size={40} color={C.faint} />
            <Text weight="semibold" size={16} style={{ textAlign: 'center' }}>Chat is not available right now</Text>
            <Text size={14} color={C.muted} style={{ textAlign: 'center' }}>Please try again in a moment.</Text>
          </View>
        ) : (
          <WebView
            source={{ html, baseUrl: CRISP_BASE_URL }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            keyboardDisplayRequiresUserAction={false}
            hideKeyboardAccessoryView
            setSupportMultipleWindows={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => setFailed(true)}
            onHttpError={() => undefined}
            onShouldStartLoadWithRequest={(req) => {
              if (isCrispUrl(req.url)) return true;
              void Linking.openURL(req.url).catch(() => undefined); // a link an agent sent
              return false;
            }}
            onMessage={(e) => {
              if (e.nativeEvent.data === 'closed') router.back();
            }}
            style={{ flex: 1, backgroundColor: C.white }}
          />
        )}
        {loading && !failed && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={C.brand} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
