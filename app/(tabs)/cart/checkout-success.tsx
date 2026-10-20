import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deliveryOf } from '@/components/OrderParts';
import { Button, Card, Text } from '@/components/ui';
import { C, S } from '@/constants/theme';
import PushPrompt from '@/components/PushPrompt';
import { useApiClient } from '@/hooks/useApiClient';
import { Order } from '@/types/order';

export default function CheckoutSuccess() {
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
      <ScrollView contentContainerStyle={{ padding: S.xl, paddingTop: S.xxl * 1.5, alignItems: 'center' }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.greenBg, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={42} color={C.white} />
          </View>
        </View>
        <Text weight="bold" size={28} style={{ marginTop: S.xl }}>Order placed</Text>
        <Text size={15} color={C.muted} style={{ marginTop: 6, textAlign: 'center' }}>We emailed your confirmation.</Text>
        <Text weight="semibold" size={14} color={C.body} style={{ marginTop: S.md }}>{String(orderId).startsWith('#') ? orderId : `#${orderId}`}</Text>

        {!order ? (
          <ActivityIndicator color={C.brand} style={{ marginTop: S.xl }} />
        ) : (
          <Card style={{ alignSelf: 'stretch', marginTop: S.xl }}>
            {order.items.map((d, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text size={15} color={C.body}>{deliveryOf(d)}</Text>
                <Text size={15} color={C.muted}>{d.items.reduce((n, it) => n + it.quantity, 0)} items</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: C.line, marginVertical: S.sm }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text weight="bold" size={16}>Total</Text>
              <Text weight="bold" size={18}>${order.totalPaid.toFixed(2)}</Text>
            </View>
          </Card>
        )}

        <PushPrompt />
        <View style={{ alignSelf: 'stretch', gap: S.sm, marginTop: S.xl }}>
          <Button label="View order" onPress={() => router.replace({ pathname: '/orders/[id]', params: { id: String(orderId) } })} />
          <Button label="Back to the menu" variant="ghost" onPress={() => router.replace('/')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
