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
import Reveal from '@/components/Reveal';
import { Button, Card, Eyebrow, Text, tap } from '@/components/ui';
import { C, S, shadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { buildMenuSections, categoryOrSubsHaveItems } from '@/lib/homeMenu';
import { useHomeMenu } from '@/lib/useHomeMenu';
import { useTabBarSpace } from '@/lib/useTabBarSpace';
import { useVegOnly } from '@/lib/vegOnly';
import { Order } from '@/types/order';

const logo = require('../../assets/images/nikfoods-logo.png');

/** "Good evening" by the hour (Pacific time, where the kitchen is). */
function greetingNow(): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Los_Angeles' }).format(new Date())) % 24;
  return hour < 5 ? 'Good evening' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** Home: where you are delivering, your next delivery, a way into the menu and the menu alerts. */
export default function Home() {
  const bottomSpace = useTabBarSpace(true);
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
  const nextDay = next ? next.items.slice().sort((a, b) => String(a.actualDeliveryDate || a.deliveryDate).localeCompare(String(b.actualDeliveryDate || b.deliveryDate)))[0] : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: bottomSpace, gap: S.xl + 4 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.brand} onRefresh={async () => { setRefreshing(true); await Promise.all([reload(), loadNext()]); setRefreshing(false); }} />}
      >
        <Reveal index={0}>
          <Image source={logo} style={{ width: 118, height: 34 }} contentFit="contain" accessibilityLabel="NikFoods" />
          <Eyebrow style={{ marginTop: S.xl }}>{greetingNow()}</Eyebrow>
          <Text weight="display" size={46} style={{ marginTop: 2 }}>{first ? `${first},` : 'Welcome,'}</Text>
          <Text weight="display" size={46} color={C.brandDark}>what shall we cook?</Text>
        </Reveal>

        <Reveal index={1}>
          <DeliveryBar />
        </Reveal>

        {next && nextDay && (
          <Reveal index={2} style={{ gap: S.md }}>
            <Pressable onPress={() => router.push({ pathname: '/account/orders/[id]', params: { id: next.orderId } })} accessibilityRole="button" accessibilityLabel="Your next delivery">
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.md }}>
                  <Eyebrow color={C.muted}>Your next delivery</Eyebrow>
                  <StatusChip status={next.status} />
                </View>
                <Text weight="display" size={34} style={{ marginTop: 6 }}>{deliveryOf(nextDay)}</Text>
                <Text size={14} color={C.muted} style={{ marginTop: 2 }}>{next.items.reduce((n, d) => n + d.items.reduce((m, it) => m + it.quantity, 0), 0)} items</Text>
              </Card>
            </Pressable>
            <DeliveryTracker orderId={next.orderId} />
          </Reveal>
        )}

        <Reveal index={3}>
          <Pressable
            onPress={() => { tap(); router.navigate('/menu'); }}
            accessibilityRole="button"
            accessibilityLabel="Order now"
            style={({ pressed }) => [{ backgroundColor: C.ink, borderRadius: 34, paddingVertical: S.xl, paddingLeft: S.xl + 4, paddingRight: S.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', transform: [{ scale: pressed ? 0.985 : 1 }] }, shadow]}
          >
            <View style={{ flex: 1 }}>
              <Eyebrow color={C.gold}>The menu</Eyebrow>
              <Text weight="display" size={38} color={C.ivory} style={{ marginTop: 2 }}>Order now</Text>
            </View>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-forward" size={26} color={C.onBrand} />
            </View>
          </Pressable>
        </Reveal>

        {cats.length > 0 && (
          <Reveal index={4} style={{ gap: S.lg }}>
            <View>
              <Eyebrow>Browse</Eyebrow>
              <Text weight="display" size={32} style={{ marginTop: 2 }}>By category</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.xl }} contentContainerStyle={{ gap: S.lg, paddingHorizontal: S.xl }}>
              {cats.map((c) => (
                <Pressable key={c._id} onPress={() => { tap(); router.push({ pathname: '/menu/[id]', params: { id: c._id } }); }} accessibilityRole="button" accessibilityLabel={c.name} style={({ pressed }) => ({ width: 112, opacity: pressed ? 0.8 : 1 })}>
                  <View style={[{ width: 112, height: 132, borderRadius: 56, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 3, borderColor: C.white }, shadow]}>
                    {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={250} /> : null}
                  </View>
                  <Text weight="semibold" size={14} numberOfLines={2} maxFontSizeMultiplier={1.2} style={{ marginTop: S.sm, textAlign: 'center' }}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Reveal>
        )}

        <Reveal index={5}>
          <MenuSubscribe />
        </Reveal>

        {!user && <Button label="Log in" variant="outline" onPress={() => router.push('/login')} />}
      </ScrollView>
      <CartBar />
    </SafeAreaView>
  );
}
