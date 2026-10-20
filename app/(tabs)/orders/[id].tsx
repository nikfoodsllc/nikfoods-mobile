import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreditNotice from '@/components/CreditNotice';
import { deliveryOf, ItemRow, StatusChip } from '@/components/OrderParts';
import { useToast } from '@/components/Toast';
import { Card, Divider, Text } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useApiClient } from '@/hooks/useApiClient';
import { formatOrderDate } from '@/lib/orderHelpers';
import { getNetTotal, getRefundedAmount } from '@/lib/orderRefunds';
import { hasAmount, taxesAndFeesOf, TAXES_FEES_TEXT, TAXES_FEES_TOOLTIP } from '@/lib/orderTotalsDisplay';
import { Order } from '@/types/order';

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { authenticatedFetch } = useApiClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await authenticatedFetch(`/api/orders/${encodeURIComponent(String(id))}`);
        const j = await r.json();
        if (!r.ok || !j.success) throw new Error(r.status === 403 || r.status === 404 ? 'This order is not on your account' : 'Could not load the order');
        setOrder(j.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load the order');
      }
    })();
  }, [id, authenticatedFetch]);

  const body = () => {
    if (error) return <Text color={C.muted} style={{ textAlign: 'center', marginTop: 40 }}>{error}</Text>;
    if (!order) return <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} />;
    const refunded = getRefundedAmount(order);
    const fees = taxesAndFeesOf({ taxes: order.taxes, platformFee: order.platformFee, deliveryFee: order.deliveryFee });
    const a = order.address;
    return (
      <View style={{ gap: S.md }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md }}>
            <Text weight="bold" size={17} numberOfLines={1} style={{ flex: 1 }}>{order.orderId.startsWith('#') ? order.orderId : `#${order.orderId}`}</Text>
            <StatusChip status={order.status} />
          </View>
          <Text size={13} color={C.muted} style={{ marginTop: 2 }}>{order.createdAt ? formatOrderDate(order.createdAt) : ''}</Text>
          <CreditNotice order={order} />
        </Card>

        {order.items.map((d, i) => (
          <Card key={i}>
            <Text weight="bold" size={15} color={C.brandDark}>Delivery {deliveryOf(d)}</Text>
            <View style={{ marginTop: S.sm }}>{d.items.map((it, j) => <ItemRow key={j} item={it} />)}</View>
          </Card>
        ))}

        <Card>
          <Row label="Subtotal" value={order.subtotal} />
          {hasAmount(fees) && <Row label={TAXES_FEES_TEXT} value={fees} info={() => toast(TAXES_FEES_TOOLTIP, 'info')} />}
          {hasAmount(order.tip) && <Row label="Tip" value={order.tip} />}
          <Divider style={{ marginVertical: S.sm }} />
          <Row label="Total" value={order.totalPaid} bold />
          {refunded > 0 && <Row label="Refunded" value={-refunded} green />}
          {refunded > 0 && <Row label="Total after refund" value={getNetTotal(order)} bold />}
        </Card>

        <Card>
          <Text weight="bold" size={15}>Delivery address</Text>
          <Text size={14} color={C.body} style={{ marginTop: 6 }}>{[a.street, a.apartment].filter(Boolean).join(', ')}</Text>
          <Text size={14} color={C.body}>{[a.city, a.state, a.zipCode].filter(Boolean).join(', ')}</Text>
          {!!a.entrance && <Text size={13} color={C.muted} style={{ marginTop: 4 }}>Gate code {a.entrance}</Text>}
          {!!a.floor && <Text size={13} color={C.muted} style={{ marginTop: 2 }}>{a.floor}</Text>}
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, paddingVertical: S.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text weight="bold" size={22} style={{ marginLeft: S.md }}>Order</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>{body()}</ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold, green, info }: { label: string; value: number; bold?: boolean; green?: boolean; info?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text weight={bold ? 'bold' : 'regular'} size={bold ? 17 : 15} color={bold ? C.text : C.body}>{label}</Text>
        {info && <Ionicons name="information-circle-outline" size={18} color={C.muted} onPress={info} accessibilityLabel="What is included" />}
      </View>
      <Text weight={bold ? 'bold' : 'semibold'} size={bold ? 18 : 15} color={green ? C.green : C.text}>{value < 0 ? '-' : ''}${Math.abs(value).toFixed(2)}</Text>
    </View>
  );
}
