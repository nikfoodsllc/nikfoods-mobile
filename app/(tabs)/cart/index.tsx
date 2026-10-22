import React, { useEffect, useRef } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CartLine from '@/components/CartLine';
import DeliveryBar from '@/components/DeliveryBar';
import EmptyCart from '@/components/EmptyCart';
import { useToast } from '@/components/Toast';
import { Button, Card, Divider, Text } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import * as localCart from '@/lib/localStorageCart';
import { useCart } from '@/contexts/CartContext';
import { DEFAULT_MIN_CART_VALUE, getCheckoutMessage } from '@/lib/cartLogic';
import { hasAmount, taxesAndFeesOf, TAXES_FEES_TEXT, TAXES_FEES_TOOLTIP } from '@/lib/orderTotalsDisplay';
import ActionBar, { ACTION_BAR_SPACE } from '@/components/ActionBar';
import { useTabBarSpace } from '@/lib/useTabBarSpace';

export default function CartScreen() {
  const bottomSpace = useTabBarSpace(false);
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { cart, isLoading, updateCartItem, removeCartItem, selectedAddressId, selectedZipcode, zipcodeConfig, refreshCart } = useCart();

  const hasItems = Boolean(cart && cart.days.some((d) => d.items.length > 0));
  const { authenticatedFetch } = useApiClient();
  const { restore, r } = useLocalSearchParams<{ restore?: string; r?: string }>();

  // The cart reminder email's "Complete your order" opens /cart?restore=1&r=...: log in (once), put back the unfinished checkout when
  // this cart is empty, and carry on to checkout (the same steps as the website's cart page).
  const clickSent = useRef(false);
  const prompted = useRef(false);
  const restored = useRef(false);
  useEffect(() => {
    if (restore !== '1' || !r || clickSent.current) return;
    clickSent.current = true;
    fetch('/api/cart-reminder/clicked', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: String(r) }) }).catch(() => undefined);
  }, [restore, r]);
  useEffect(() => {
    if (restore !== '1') return;
    if (!user) {
      if (!prompted.current) {
        prompted.current = true;
        router.push('/login');
      }
      return;
    }
    if (restored.current) return;
    restored.current = true;
    (async () => {
      try {
        if (!localCart.hasItems()) {
          const response = await authenticatedFetch('/api/cart/restore', { method: 'POST' });
          const json = await response.json().catch(() => null);
          const lines = json?.data?.lines;
          if (response.ok && Array.isArray(lines) && lines.length > 0 && localCart.restoreLines(lines) > 0) await refreshCart();
        }
      } catch {
        // the empty cart is shown instead
      } finally {
        router.setParams({ restore: '', r: '' });
        if (localCart.hasItems()) router.push('/cart/checkout');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restore, user]);

  if (isLoading && !cart) {
    return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  if (!hasItems || !cart) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg, paddingBottom: bottomSpace }}>
        <EmptyCart onOrder={() => router.navigate('/menu')} />
      </SafeAreaView>
    );
  }

  const hasAddress = Boolean(selectedAddressId || selectedZipcode);
  const message = hasAddress ? getCheckoutMessage(cart.days, zipcodeConfig?.minCartValue || DEFAULT_MIN_CART_VALUE) : '';
  const fees = taxesAndFeesOf({ taxes: cart.tax, platformFee: cart.platformFee, deliveryFee: cart.deliveryFee });
  const canCheckout = Boolean(cart.canCheckout && hasAddress);
  // when a day already says what is missing ("Add $15.00 worth of items"), the same words are not repeated at the bottom
  const needsMore = cart.days.some((d) => /min/i.test(d.deliveryMessage?.message ?? '')) || /minimum/i.test(message);
  const dayExplains = cart.days.some((d) => d.deliveryMessage && d.deliveryMessage.type !== 'success');
  const confirmRemove = (id: string, name: string) =>
    Alert.alert('Remove from cart?', name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeCartItem(id) },
    ]);

  const go = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push('/cart/checkout');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: bottomSpace + ACTION_BAR_SPACE, gap: S.lg }} showsVerticalScrollIndicator={false}>
        <Text weight="display" size={44}>Cart</Text>
        <DeliveryBar />

        {cart.days.map((day) => (
          <Card key={day._id}>
            <Text weight="bold" size={17}>{(day.formattedDate ?? '').replace(/, \d{4}$/, '')}</Text>
            {day.deliveryMessage && (
              <View style={{ marginTop: S.sm, padding: S.md, borderRadius: R.md, backgroundColor: day.deliveryMessage.type === 'success' ? C.greenBg : day.deliveryMessage.type === 'warning' ? C.amberBg : C.redBg, flexDirection: 'row', gap: S.sm }}>
                <Ionicons name={day.deliveryMessage.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={18} color={day.deliveryMessage.type === 'success' ? C.green : day.deliveryMessage.type === 'warning' ? '#B45309' : C.red} style={{ marginTop: 1 }} />
                <Text size={13} color={C.body} style={{ flex: 1 }}>{day.deliveryMessage.message}</Text>
              </View>
            )}
            {day.items.map((item, i) => (
              <View key={item._id}>
                {i > 0 && <Divider />}
                <CartLine
                  item={item}
                  onPlus={() => void updateCartItem({ cartItemId: item._id, quantity: item.quantity + 1 })}
                  onMinus={() => (item.quantity <= 1 ? void removeCartItem(item._id) : void updateCartItem({ cartItemId: item._id, quantity: item.quantity - 1 }))}
                  onRemove={() => confirmRemove(item._id, item.foodItem.name)}
                />
              </View>
            ))}
          </Card>
        ))}

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text size={15} color={C.body}>Subtotal</Text>
            <Text weight="semibold" size={15}>${cart.subtotal.toFixed(2)}</Text>
          </View>
          {hasAmount(fees) && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: S.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text size={15} color={C.body}>{TAXES_FEES_TEXT}</Text>
                <Ionicons name="information-circle-outline" size={18} color={C.muted} onPress={() => toast(TAXES_FEES_TOOLTIP, 'info')} accessibilityLabel="What is included" />
              </View>
              <Text weight="semibold" size={15}>${fees.toFixed(2)}</Text>
            </View>
          )}
          <Divider style={{ marginVertical: S.md }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text weight="bold" size={17}>Total</Text>
            <Text weight="bold" size={19}>${cart.totalAmount.toFixed(2)}</Text>
          </View>
        </Card>

        {!!message && !dayExplains && (
          <View style={{ padding: S.md, borderRadius: R.md, backgroundColor: C.amberBg, flexDirection: 'row', gap: S.sm }}>
            <Ionicons name="alert-circle" size={18} color="#B45309" style={{ marginTop: 1 }} />
            <Text size={14} color={C.body} style={{ flex: 1 }}>{message}</Text>
          </View>
        )}
        {!hasAddress && <Text size={14} color={C.muted} style={{ textAlign: 'center' }}>Add your zip code to continue</Text>}
      </ScrollView>

      <ActionBar>
        {!user ? (
          <Button label="Log in to check out" onPress={go} />
        ) : !hasAddress ? (
          <Button label="Choose a delivery address first" disabled onPress={go} />
        ) : !canCheckout && needsMore ? (
          // the minimum is not reached: the button says so and takes you back to the menu to add more
          <Button label="Add more items" icon="add" onPress={() => router.navigate('/menu')} />
        ) : !canCheckout ? (
          <Button label="Fix the items above to check out" disabled onPress={go} />
        ) : (
          <Button label={`Checkout  ·  $${cart.totalAmount.toFixed(2)}`} onPress={go} />
        )}
      </ActionBar>
    </SafeAreaView>
  );
}
