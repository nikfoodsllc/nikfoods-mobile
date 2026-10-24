import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S, TAB_BAR_GAP, TAB_BAR_HEIGHT, shadow } from '@/constants/theme';
import { Text, tap } from '@/components/ui';
import { useCart } from '@/contexts/CartContext';

/** Sticky "View cart" bar above the tab bar while the cart has items. */
export default function CartBar() {
  const router = useRouter();
  const { itemCount, summary } = useCart();
  const insets = useSafeAreaInsets();
  if (!itemCount) return null;
  // sits just above the floating tab bar
  const bottom = Math.max(insets.bottom, 8) + TAB_BAR_GAP - 8 + TAB_BAR_HEIGHT + 10;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom }}>
      <Pressable
        onPress={() => {
          tap();
          router.push('/cart');
        }}
        accessibilityRole="button"
        accessibilityLabel="View cart"
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 29, backgroundColor: C.ink, paddingLeft: 8, paddingRight: S.xl, gap: S.md, transform: [{ scale: pressed ? 0.985 : 1 }] }, shadow]}
      >
        <View style={{ minWidth: 42, height: 42, borderRadius: 21, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
          <Text weight="bold" size={15} color={C.onBrand}>{itemCount}</Text>
        </View>
        <Text weight="semibold" size={16} color={C.ivory} style={{ flex: 1, letterSpacing: 0.2 }}>View cart</Text>
        {summary ? <Text weight="semibold" size={16} color={C.ivory}>${summary.subtotal.toFixed(2)}</Text> : null}
        <Ionicons name="arrow-forward" size={18} color={C.brand} />
      </Pressable>
    </View>
  );
}
