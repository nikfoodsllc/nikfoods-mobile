import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreditNotice from '@/components/CreditNotice';
import { deliveryOf, StatusChip } from '@/components/OrderParts';
import SearchField from '@/components/SearchField';
import { Button, Card, Text } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { formatOrderDate } from '@/lib/orderHelpers';
import { getNetTotal, getRefundedAmount } from '@/lib/orderRefunds';
import { Order } from '@/types/order';
import { useTabBarSpace } from '@/lib/useTabBarSpace';

export default function Orders() {
  const bottomSpace = useTabBarSpace(false);
  const router = useRouter();
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState(''); // the search the list is showing (after a short typing pause)
  const latest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setApplied(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    async (p: number, replace: boolean, q: string) => {
      // only the newest request may change the list (an older, slower answer must not replace it)
      const mine = ++latest.current;
      try {
        const r = await authenticatedFetch(`/api/orders?page=${p}&status=all&limit=10${q ? `&q=${encodeURIComponent(q)}` : ''}`);
        const j = await r.json();
        if (mine !== latest.current) return;
        if (!r.ok || !j.success) throw new Error('x');
        setOrders((prev) => (replace ? j.data.items : [...prev, ...j.data.items]));
        setPage(p);
        setHasMore(Boolean(j.data.hasNextPage));
        setError('');
      } catch {
        if (mine !== latest.current) return;
        setError("Couldn't load your orders");
      } finally {
        if (mine === latest.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [authenticatedFetch]
  );

  useEffect(() => {
    if (user) void load(1, true, applied);
    else setLoading(false);
  }, [user, load, applied]);

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
        contentContainerStyle={{ padding: S.lg, paddingBottom: bottomSpace, gap: S.md }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: S.md, marginBottom: S.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate('/account'))} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chevron-back" size={22} color={C.text} />
              </Pressable>
              <Text weight="display" size={40}>Orders</Text>
            </View>
            <SearchField value={query} onChangeText={setQuery} placeholder="Search orders" />
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.brand} onRefresh={() => { setRefreshing(true); void load(1, true, applied); }} />}
        onEndReached={() => hasMore && void load(page + 1, false, applied)}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} /> : error ? <Text color={C.muted} style={{ textAlign: 'center', marginTop: 40 }}>{error}</Text> : <Text color={C.muted} style={{ textAlign: 'center', marginTop: 40 }}>{applied ? `No orders match "${applied}"` : 'No orders yet'}</Text>
        }
        renderItem={({ item: o }) => {
          const refunded = getRefundedAmount(o);
          return (
            <Pressable onPress={() => router.push({ pathname: '/account/orders/[id]', params: { id: o.orderId } })} accessibilityRole="button" accessibilityLabel={`Order ${o.orderId}`}>
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
