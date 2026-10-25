import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CartBar from '@/components/CartBar';
import ChefsPick from '@/components/ChefsPick';
import DeliveryTracker from '@/components/DeliveryTracker';
import HomeBanners from '@/components/HomeBanners';
import MenuSubscribe from '@/components/MenuSubscribe';
import UpdateBanner from '@/components/UpdateBanner';
import { deliveryOf, StatusChip } from '@/components/OrderParts';
import Reveal from '@/components/Reveal';
import { Button, Card, Eyebrow, Text, tap } from '@/components/ui';
import { C, S, shadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { greeting, useHomeIntro } from '@/lib/homeIntro';
import { pickNextDelivery, todayPacific } from '@/lib/nextDelivery';
import { useScrollToTopOnTab } from '@/lib/tabScroll';
import { useHomeMenu } from '@/lib/useHomeMenu';
import { useTabBarSpace } from '@/lib/useTabBarSpace';
import { Order } from '@/types/order';

const GREETING_BOX = 112; // two lines of the display type
const logo = require('../../assets/images/nikfoods-logo.png');

/** Home: where you are delivering, your next delivery, a way into the menu and the menu alerts. */
export default function Home() {
  const scrollRef = useRef<Animated.ScrollView>(null);
  useScrollToTopOnTab('index', () => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  const bottomSpace = useTabBarSpace(true);
  const router = useRouter();
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const { reload } = useHomeMenu();
  const [next, setNext] = useState<Order | null>(null);
  // the day the card shows: the soonest delivery that is today or later
  const [nextDay, setNextDay] = useState<Order['items'][number] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intro = useHomeIntro();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const loadNext = useCallback(async () => {
    if (!user) {
      setNext(null);
      setNextDay(null);
      return;
    }
    try {
      const r = await authenticatedFetch('/api/orders?status=active&limit=5');
      const j = await r.json();
      if (!r.ok || !j.success) return;
      const orders = (j.data.items as Order[]).filter((o) => o.status === 'confirmed' && o.paymentStatus !== 'failed');
      // the order that is delivered first
      // only deliveries from today on: a day that has passed is not "next"
      const pick = pickNextDelivery(orders, todayPacific());
      setNext(pick?.order ?? null);
      setNextDay(pick?.day ?? null);
    } catch {
      // the card just stays hidden
    }
  }, [user, authenticatedFetch]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const first = (user?.name ?? '').trim().split(/\s+/)[0];
  const hello = intro === null ? null : greeting(intro, first);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: bottomSpace, gap: S.xl + 4 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.brand} onRefresh={async () => { setRefreshing(true); await Promise.all([reload(), loadNext()]); setRefreshing(false); }} />}
      >
        <UpdateBanner />
        <Reveal index={0}>
          <Image source={logo} style={{ width: 118, height: 34 }} contentFit="contain" accessibilityLabel="NikFoods" />
          {/* a fixed box: whatever the text is, it shrinks until it fits */}
          <View style={{ height: GREETING_BOX, marginTop: S.xl, justifyContent: 'center' }}>
            {hello === null ? null : 'custom' in hello ? (
              <Text weight="display" size={46} color={C.brandDark} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.4} style={{ maxHeight: GREETING_BOX }}>{hello.custom.map((part, i) => (
                  <Text key={i} weight="display" size={46} color={part.isName ? C.text : C.brandDark}>{part.text}</Text>
                ))}</Text>
            ) : (
              <>
                <Text weight="display" size={46} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{hello.name}</Text>
                <Text weight="display" size={46} color={C.brandDark} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{hello.question}</Text>
              </>
            )}
          </View>
        </Reveal>

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

        <Reveal index={1}>
          <HomeBanners scrollY={scrollY} />
        </Reveal>

        {/* the dishes the admin marked Chef's Pick (nothing is drawn when there are none) */}
        <ChefsPick />

        {next && nextDay && (
          <Reveal index={2} style={{ gap: S.md }}>
            <Pressable onPress={() => router.navigate({ pathname: '/account/orders/[id]', params: { id: next.orderId, from: 'home' } }, { withAnchor: true })} accessibilityRole="button" accessibilityLabel="Your next delivery">
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

        <Reveal index={5}>
          <MenuSubscribe />
        </Reveal>

        {!user && <Button label="Log in / Sign up" variant="outline" onPress={() => router.push('/login')} />}

        <Eyebrow color={C.muted} style={{ textAlign: 'center', letterSpacing: 2 }}>Authentic Indian food delivered to your door.</Eyebrow>

      </Animated.ScrollView>
      <CartBar />
    </SafeAreaView>
  );
}
