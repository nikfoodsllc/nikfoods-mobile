import React from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CartLine from '@/components/CartLine';
import DeliveryBar from '@/components/DeliveryBar';
import { useToast } from '@/components/Toast';
import { Button, Card, Divider, Text } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { DEFAULT_MIN_CART_VALUE, getCheckoutMessage } from '@/lib/cartLogic';
import { hasAmount, taxesAndFeesOf, TAXES_FEES_TEXT, TAXES_FEES_TOOLTIP } from '@/lib/orderTotalsDisplay';

export default function CartScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { cart, isLoading, updateCartItem, removeCartItem, selectedAddressId, selectedZipcode, zipcodeConfig } = useCart();

  const hasItems = Boolean(cart && cart.days.some((d) => d.items.length > 0));

  if (isLoading && !cart) {
    return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  if (!hasItems || !cart) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xxl, gap: S.md }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="bag-outline" size={44} color={C.brandDark} />
          </View>
          <Text weight="bold" size={22}>Your cart is empty</Text>
          <Button label="Browse the menu" onPress={() => router.navigate('/')} style={{ marginTop: S.md, alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  const hasAddress = Boolean(selectedAddressId || selectedZipcode);
  const message = hasAddress ? getCheckoutMessage(cart.days, zipcodeConfig?.minCartValue || DEFAULT_MIN_CART_VALUE) : '';
  const fees = taxesAndFeesOf({ taxes: cart.tax, platformFee: cart.platformFee, deliveryFee: cart.deliveryFee });
  const canCheckout = Boolean(cart.canCheckout && hasAddress);

  const go = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push('/cart/checkout');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 160, gap: S.lg }} showsVerticalScrollIndicator={false}>
        <Text weight="bold" size={30}>Cart</Text>
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
                  onRemove={() => void removeCartItem(item._id)}
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

        {!!message && (
          <View style={{ padding: S.md, borderRadius: R.md, backgroundColor: C.amberBg, flexDirection: 'row', gap: S.sm }}>
            <Ionicons name="alert-circle" size={18} color="#B45309" style={{ marginTop: 1 }} />
            <Text size={14} color={C.body} style={{ flex: 1 }}>{message}</Text>
          </View>
        )}
        {!hasAddress && <Text size={14} color={C.muted} style={{ textAlign: 'center' }}>Add your zip code to continue</Text>}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: S.lg, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line }}>
        <Button label={user ? `Checkout  ·  $${cart.totalAmount.toFixed(2)}` : 'Log in to check out'} disabled={user ? !canCheckout : false} onPress={go} />
      </View>
    </SafeAreaView>
  );
}
