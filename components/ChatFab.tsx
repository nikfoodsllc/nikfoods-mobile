import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, TAB_BAR_GAP, TAB_BAR_HEIGHT, shadow } from '@/constants/theme';
import { useCart } from '@/contexts/CartContext';
import { tap } from '@/components/ui';

/**
 * A small round chat button at the bottom left of every page, just above the tab bar. It lifts itself above the sticky bottom bars
 * (View cart, Checkout, Pay, Add address) on the pages that have one, so it never sits on top of them.
 */
export default function ChatFab() {
  const router = useRouter();
  const path = usePathname();
  const { itemCount } = useCart();
  const insets = useSafeAreaInsets();
  const cartBar = itemCount > 0 && (path === '/' || path.startsWith('/menu') || path === '/cart');
  const actionBar = path === '/cart/checkout' || path === '/account/addresses';
  const bottom = Math.max(insets.bottom, 8) + TAB_BAR_GAP - 8 + TAB_BAR_HEIGHT + 10 + (cartBar ? 68 : actionBar ? 84 : 0);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, bottom }}>
      <Pressable
        onPress={() => {
          tap();
          router.push('/chat');
        }}
        accessibilityRole="button"
        accessibilityLabel="Chat with us"
        hitSlop={8}
        style={({ pressed }) => [{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.gold, transform: [{ scale: pressed ? 0.94 : 1 }] }, shadow]}
      >
        <Ionicons name="chatbubble-ellipses" size={22} color={C.brand} />
      </Pressable>
    </View>
  );
}
