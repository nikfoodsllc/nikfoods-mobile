import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { C, R, S, shadow } from '@/constants/theme';
import { Text, tap } from '@/components/ui';
import { useCart } from '@/contexts/CartContext';

/** Sticky "View cart" bar above the tab bar while the cart has items. */
export default function CartBar() {
  const router = useRouter();
  const { itemCount, summary } = useCart();
  if (!itemCount) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: S.lg, right: S.lg, bottom: S.md }}>
      <Pressable
        onPress={() => {
          tap();
          router.push('/cart');
        }}
        accessibilityRole="button"
        accessibilityLabel="View cart"
        style={[{ flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: R.lg, backgroundColor: C.brand, paddingHorizontal: S.lg, gap: S.md }, shadow]}
      >
        <View style={{ minWidth: 28, height: 28, borderRadius: 14, backgroundColor: C.onBrand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
          <Text weight="bold" size={14} color={C.brand}>{itemCount}</Text>
        </View>
        <Text weight="bold" size={16} color={C.onBrand} style={{ flex: 1 }}>View cart</Text>
        {summary ? <Text weight="bold" size={16} color={C.onBrand}>${summary.subtotal.toFixed(2)}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={C.onBrand} />
      </Pressable>
    </View>
  );
}
