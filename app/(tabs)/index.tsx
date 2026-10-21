import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CartBar from '@/components/CartBar';
import DeliveryBar from '@/components/DeliveryBar';
import DeliveryTracker from '@/components/DeliveryTracker';
import MenuSubscribe from '@/components/MenuSubscribe';
import { deliveryOf, StatusChip } from '@/components/OrderParts';
import { Button, Card, Text, tap } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { buildMenuSections, categoryOrSubsHaveItems } from '@/lib/homeMenu';
import { useHomeMenu } from '@/lib/useHomeMenu';
import { useVegOnly } from '@/lib/vegOnly';
import { Order } from '@/types/order';

const logo = require('../../assets/images/nikfoods-logo.png');

/** Home: where you are delivering, your next delivery, a way into the menu and the menu alerts. */
export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const { categories, map, availableDates, reload } = useHomeMenu();
  const [vegOnly] = useVegOnly();
  const [next, setNext] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadNext = useCallback(async () => {
    if (!user) {
      setNext(null);
      return;
    }
    try {
      const r = await authenticatedFetch('/api/orders?status=active&limit=5');
      const j = await r.json();
      if (!r.ok || !j.success) return;
      const orders = (j.data.items as Order[]).filter((o) => o.paymentStatus !== 'failed');
      // the order that is delivered first
      const first = (o: Order) => o.items.map((d) => String(d.actualDeliveryDate || d.deliveryDate).slice(0, 10)).sort()[0] ?? '9999';
      setNext(orders.sort((a, b) => first(a).localeCompare(first(b)))[0] ?? null);
    } catch {
      // the card just stays hidden
    }
  }, [user, authenticatedFetch]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const cats = useMemo(
    () => buildMenuSections(categories, map, '', vegOnly, availableDates).filter((s) => s.category && categoryOrSubsHaveItems(s.category)).map((s) => s.meta),
    [categories, map, vegOnly, availableDates]
  );
  const first = (user?.name ?? '').trim().split(/\s+/)[0];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: S.lg, paddingBottom: 140, gap: S.lg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.brand} onRefresh={async () => { setRefreshing(true); await Promise.all([reload(), loadNext()]); setRefreshing(false); }} />}
      >
        <View>
          <Image source={logo} style={{ width: 128, height: 36 }} contentFit="contain" accessibilityLabel="NikFoods" />
          <Text weight="bold" size={28} style={{ marginTop: S.md }}>{first ? `Hi, ${first}` : 'Welcome'}</Text>
        </View>

        <DeliveryBar />

        {next && (
          <View style={{ gap: S.md }}>
            <Pressable onPress={() => router.push({ pathname: '/account/orders/[id]', params: { id: next.orderId } })} accessibilityRole="button" accessibilityLabel="Your next delivery">
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md }}>
                  <Text weight="bold" size={13} color={C.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>Your next delivery</Text>
                  <StatusChip status={next.status} />
                </View>
                <Text weight="bold" size={22} style={{ marginTop: 6 }}>{deliveryOf(next.items.slice().sort((a, b) => String(a.actualDeliveryDate || a.deliveryDate).localeCompare(String(b.actualDeliveryDate || b.deliveryDate)))[0])}</Text>
                <Text size={14} color={C.muted} style={{ marginTop: 2 }}>{next.items.reduce((n, d) => n + d.items.reduce((m, it) => m + it.quantity, 0), 0)} items</Text>
              </Card>
            </Pressable>
            <DeliveryTracker orderId={next.orderId} />
          </View>
        )}

        <Pressable onPress={() => { tap(); router.navigate('/menu'); }} accessibilityRole="button" accessibilityLabel="Order now" style={({ pressed }) => ({ backgroundColor: C.brand, borderRadius: 24, padding: S.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.85 : 1 })}>
          <View style={{ flex: 1 }}>
            <Text weight="bold" size={28} color={C.onBrand} style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>Order now</Text>
            <Text size={15} color={C.onBrand} style={{ marginTop: 2 }}>See the menu</Text>
          </View>
          <Ionicons name="arrow-forward" size={30} color={C.onBrand} />
        </Pressable>

        {cats.length > 0 && (
          <View style={{ gap: S.md }}>
            <Text weight="bold" size={20}>Browse</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.lg, paddingRight: S.lg }}>
              {cats.map((c) => (
                <Pressable key={c._id} onPress={() => { tap(); router.push({ pathname: '/menu/[id]', params: { id: c._id } }); }} accessibilityRole="button" accessibilityLabel={c.name} style={{ width: 92, alignItems: 'center' }}>
                  <View style={{ width: 84, height: 84, borderRadius: 42, overflow: 'hidden', backgroundColor: C.surface }}>
                    {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                  </View>
                  <Text weight="semibold" size={13} numberOfLines={2} maxFontSizeMultiplier={1.2} style={{ marginTop: 6, textAlign: 'center' }}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <MenuSubscribe />

        {!user && <Button label="Log in" variant="outline" onPress={() => router.push('/login')} />}
      </ScrollView>
      <CartBar />
    </SafeAreaView>
  );
}
