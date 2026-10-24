import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deliveryOf } from '@/components/OrderParts';
import { Button, Card, Text } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useTabBarSpace } from '@/lib/useTabBarSpace';
import { useApiClient } from '@/hooks/useApiClient';
import { askForPush, markAsked, pushState, registerPush, wasAskedBefore } from '@/lib/push';
import { Order } from '@/types/order';

// The notification question is asked here, after the customer's first order (when updates about it matter), not when the app opens.
function NotifyAsk() {
  const { authenticatedFetch } = useApiClient();
  const [show, setShow] = useState(false);
  useEffect(() => {
    (async () => {
      if (wasAskedBefore() || (await pushState()) !== 'undetermined') return;
      setShow(true);
    })();
  }, []);
  if (!show) return null;
  const answer = async (yes: boolean) => {
    setShow(false);
    markAsked();
    if (!yes) return;
    const state = await askForPush();
    // also when the answer was No: the site is told either way
    if (state !== 'unavailable') void registerPush(authenticatedFetch);
  };
  return (
    <Card style={{ alignSelf: 'stretch', marginTop: S.lg }}>
      <Text weight="bold" size={17}>Get order and menu updates?</Text>
      <Text size={14} color={C.muted} style={{ marginTop: 4 }}>We will tell you when your order is on its way and delivered, and when the new menu is out.</Text>
      <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.md }}>
        <View style={{ flex: 1 }}><Button small variant="outline" label="Not now" onPress={() => void answer(false)} /></View>
        <View style={{ flex: 1 }}><Button small label="Turn on" onPress={() => void answer(true)} /></View>
      </View>
    </Card>
  );
}

export default function CheckoutSuccess() {
  const bottomSpace = useTabBarSpace(false);
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { authenticatedFetch } = useApiClient();
  const [order, setOrder] = useState<Order | null>(null);

  // the confirmation belongs to this moment only: when it goes out of view (another tab, View order), the Cart tab goes back to its list
  const navigation = useNavigation() as unknown as { addListener: (e: 'blur', cb: () => void) => () => void; popToTop?: () => void };
  useEffect(() => navigation.addListener('blur', () => navigation.popToTop?.()), [navigation]);

  useEffect(() => {
    (async () => {
      try {
        const r = await authenticatedFetch(`/api/orders/${encodeURIComponent(String(orderId))}`);
        const j = await r.json();
        if (r.ok && j.success) setOrder(j.data);
      } catch {
        // the confirmation still shows without the details
      }
    })();
  }, [orderId, authenticatedFetch]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.xl, paddingTop: S.xxl * 1.5, paddingBottom: bottomSpace, alignItems: 'center' }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.greenBg, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={42} color={C.white} />
          </View>
        </View>
        <Text weight="display" size={42} style={{ marginTop: S.xl }}>Order placed</Text>
        <Text size={15} color={C.muted} style={{ marginTop: 6, textAlign: 'center' }}>We emailed your confirmation.</Text>
        <Text weight="semibold" size={14} color={C.body} style={{ marginTop: S.md }}>{String(orderId).startsWith('#') ? orderId : `#${orderId}`}</Text>

        {!order ? (
          <ActivityIndicator color={C.brand} style={{ marginTop: S.xl }} />
        ) : (
          <Card style={{ alignSelf: 'stretch', marginTop: S.xl }}>
            {order.items.map((d, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text size={15} color={C.body} style={{ flex: 1 }}>{deliveryOf(d)}</Text>
                <Text size={15} color={C.muted} style={{ marginLeft: S.md }}>{d.items.reduce((n, it) => n + it.quantity, 0)} items</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: C.line, marginVertical: S.sm }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text weight="bold" size={16}>Total</Text>
              <Text weight="bold" size={18}>${order.totalPaid.toFixed(2)}</Text>
            </View>
          </Card>
        )}

        <NotifyAsk />

        <View style={{ alignSelf: 'stretch', gap: S.sm, marginTop: S.xl }}>
          <Button label="View order" onPress={() => router.replace({ pathname: '/account/orders/[id]', params: { id: String(orderId) } })} />
          <Button label="Back to the menu" variant="ghost" onPress={() => router.replace('/menu')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
