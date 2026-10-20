import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreditNotice from '@/components/CreditNotice';
import { deliveryOf, StatusChip } from '@/components/OrderParts';
import { Button, Card, Text } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { formatOrderDate } from '@/lib/orderHelpers';
import { getNetTotal, getRefundedAmount } from '@/lib/orderRefunds';
import { Order } from '@/types/order';

export default function Orders() {
  const router = useRouter();
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (p: number, replace: boolean) => {
      try {
        const r = await authenticatedFetch(`/api/orders?page=${p}&status=all&limit=10`);
        const j = await r.json();
        if (!r.ok || !j.success) throw new Error('x');
        setOrders((prev) => (replace ? j.data.items : [...prev, ...j.data.items]));
        setPage(p);
        setHasMore(Boolean(j.data.hasNextPage));
        setError('');
      } catch {
        setError("Couldn't load your orders");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authenticatedFetch]
  );

  useEffect(() => {
    if (user) void load(1, true);
    else setLoading(false);
  }, [user, load]);

  if (!user) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xxl, gap: S.md }}>
          <Ionicons name="receipt-outline" size={48} color={C.faint} />
          <Text weight="bold" size={20}>Log in to see your orders</Text>
          <Button label="Log in" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch', marginTop: S.md }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.surface }}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.orderId}
        contentContainerStyle={{ padding: S.lg, paddingBottom: 40, gap: S.md }}
        ListHeaderComponent={<Text weight="bold" size={30} style={{ marginBottom: S.sm }}>Orders</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.brand} onRefresh={() => { setRefreshing(true); void load(1, true); }} />}
        onEndReached={() => hasMore && void load(page + 1, false)}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} /> : error ? <Text color={C.muted} style={{ textAlign: 'center', marginTop: 40 }}>{error}</Text> : <Text color={C.muted} style={{ textAlign: 'center', marginTop: 40 }}>No orders yet</Text>
        }
        renderItem={({ item: o }) => {
          const refunded = getRefundedAmount(o);
          return (
            <Pressable onPress={() => router.push({ pathname: '/orders/[id]', params: { id: o.orderId } })} accessibilityRole="button" accessibilityLabel={`Order ${o.orderId}`}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md }}>
                  <Text weight="bold" size={15} numberOfLines={1} style={{ flex: 1 }}>{o.orderId.startsWith('#') ? o.orderId : `#${o.orderId}`}</Text>
                  <StatusChip status={o.status} />
                </View>
                <Text size={13} color={C.muted} style={{ marginTop: 2 }}>{o.createdAt ? formatOrderDate(o.createdAt) : ''}</Text>
                <View style={{ marginTop: S.md, gap: 4 }}>
                  {o.items.map((d, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text size={14} color={C.body}>{deliveryOf(d)}</Text>
                      <Text size={14} color={C.muted}>{d.items.reduce((n, it) => n + it.quantity, 0)} items</Text>
                    </View>
                  ))}
                </View>
                <CreditNotice order={o} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: S.md }}>
                  <Text size={13} color={C.muted}>{refunded > 0 ? `Refunded $${refunded.toFixed(2)}` : 'Total paid'}</Text>
                  <Text weight="bold" size={18}>${getNetTotal(o).toFixed(2)}</Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
