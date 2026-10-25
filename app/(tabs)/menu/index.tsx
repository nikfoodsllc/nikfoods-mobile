import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CartBar from '@/components/CartBar';
import DeliveryBar from '@/components/DeliveryBar';
import MenuBrowser from '@/components/MenuBrowser';
import Reveal from '@/components/Reveal';
import SearchField from '@/components/SearchField';
import { Button, Eyebrow, Text, tap } from '@/components/ui';
import { C, R, S, shadow } from '@/constants/theme';
import { buildMenuSections, categoryOrSubsHaveItems, countDishes } from '@/lib/homeMenu';
import { useHomeMenu } from '@/lib/useHomeMenu';
import { useScrollToTopOnTab } from '@/lib/tabScroll';
import { useTabBarSpace } from '@/lib/useTabBarSpace';
import { useVegOnly } from '@/lib/vegOnly';

/** Menu: every category as a big picture row; tap one to see its dishes. Searching shows matching dishes from the whole menu. */
export default function MenuCategories() {
  const listRef = useRef<FlatList>(null);
  useScrollToTopOnTab('menu', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  const bottomSpace = useTabBarSpace(true);
  const router = useRouter();
  const { categories, map, availableDates, loading, error, reload } = useHomeMenu();
  const [vegOnly, setVegOnly] = useVegOnly();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const searching = query.trim().length > 0;

  const rows = useMemo(
    () =>
      buildMenuSections(categories, map, '', vegOnly, availableDates)
        .filter((s) => s.category && categoryOrSubsHaveItems(s.category))
        .map((s) => ({ meta: s.meta, count: countDishes(s.category) })),
    [categories, map, vegOnly, availableDates]
  );

  const top = (
    <View style={{ backgroundColor: C.bg, paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: S.md, gap: S.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Eyebrow>Fresh every week</Eyebrow>
          <Text weight="display" size={44} style={{ marginTop: 2 }}>Menu</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingBottom: 6 }}>
          <Text weight="semibold" size={14} color={C.body} maxFontSizeMultiplier={1.1}>Veg only</Text>
          <Switch value={vegOnly} onValueChange={(v) => { tap(); setVegOnly(v); }} trackColor={{ true: C.green, false: '#E4DED5' }} ios_backgroundColor="#E4DED5" accessibilityLabel="Veg only" />
        </View>
      </View>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search dishes" />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      {top}
      {searching ? (
        <MenuBrowser query={query} />
      ) : loading ? (
        <View style={{ padding: S.xl, gap: S.xl }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ height: 124, borderRadius: R.xl + 8, backgroundColor: C.surface }} />
          ))}
        </View>
      ) : error ? (
        <View style={{ alignItems: 'center', padding: S.xxl, gap: S.lg }}>
          <Text weight="semibold" size={17}>{error}</Text>
          <Button label="Try again" onPress={() => void reload()} />
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => r.meta._id}
            ListHeaderComponent={<View style={{ paddingHorizontal: S.xl, paddingBottom: S.lg }}><DeliveryBar /></View>}
            ListEmptyComponent={<Text color={C.muted} style={{ textAlign: 'center', padding: S.xxl }}>{vegOnly ? 'No vegetarian items right now' : 'Nothing on the menu right now'}</Text>}
            contentContainerStyle={{ paddingBottom: bottomSpace }}
            refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.brand} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginHorizontal: S.xl }} />}
            renderItem={({ item, index }) => (
              <Reveal index={index}>
                <Pressable
                  onPress={() => { tap(); router.push({ pathname: '/menu/[id]', params: { id: item.meta._id } }); }}
                  accessibilityRole="button"
                  accessibilityLabel={item.meta.name}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.xl, paddingHorizontal: S.xl, paddingVertical: S.lg, minHeight: 156, opacity: pressed ? 0.75 : 1 })}
                >
                  <View style={[{ width: 124, height: 124, borderRadius: 36, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 3, borderColor: C.white }, shadow]}>
                    {item.meta.imageUrl ? <Image source={{ uri: item.meta.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={250} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text weight="display" size={33} numberOfLines={3} maxFontSizeMultiplier={1.15} >{item.meta.name}</Text>
                  </View>
                  <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(26,20,16,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-forward" size={17} color={C.ink} />
                  </View>
                </Pressable>
              </Reveal>
            )}
          />
          <CartBar />
        </>
      )}
    </SafeAreaView>
  );
}
