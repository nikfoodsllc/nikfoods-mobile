import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CartBar from '@/components/CartBar';
import DeliveryBar from '@/components/DeliveryBar';
import MenuBrowser from '@/components/MenuBrowser';
import SearchField from '@/components/SearchField';
import { Button, Text, tap } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { buildMenuSections, categoryOrSubsHaveItems, countDishes } from '@/lib/homeMenu';
import { useHomeMenu } from '@/lib/useHomeMenu';
import { useVegOnly } from '@/lib/vegOnly';

/** Menu: every category as a big picture row; tap one to see its dishes. Searching shows matching dishes from the whole menu. */
export default function MenuCategories() {
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
    <View style={{ backgroundColor: C.bg, paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: S.md, gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text weight="bold" size={32}>Menu</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Text weight="semibold" size={14} color={C.body} maxFontSizeMultiplier={1.1}>Veg only</Text>
          <Switch value={vegOnly} onValueChange={(v) => { tap(); setVegOnly(v); }} trackColor={{ true: C.green, false: '#E5E7EB' }} accessibilityLabel="Veg only" />
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
        <View style={{ padding: S.lg, gap: S.lg }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ height: 112, borderRadius: R.xl, backgroundColor: C.surface }} />
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
            data={rows}
            keyExtractor={(r) => r.meta._id}
            ListHeaderComponent={<View style={{ paddingHorizontal: S.lg, paddingBottom: S.sm }}><DeliveryBar /></View>}
            ListEmptyComponent={<Text color={C.muted} style={{ textAlign: 'center', padding: S.xxl }}>{vegOnly ? 'No vegetarian items right now' : 'Nothing on the menu right now'}</Text>}
            contentContainerStyle={{ paddingBottom: 140 }}
            refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.brand} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { tap(); router.push({ pathname: '/menu/[id]', params: { id: item.meta._id } }); }}
                accessibilityRole="button"
                accessibilityLabel={`${item.meta.name}, ${item.count} dishes`}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.lg, paddingHorizontal: S.lg, paddingVertical: S.md, minHeight: 132, opacity: pressed ? 0.7 : 1 })}
              >
                <View style={{ width: 112, height: 112, borderRadius: 30, overflow: 'hidden', backgroundColor: C.surface }}>
                  {item.meta.imageUrl ? <Image source={{ uri: item.meta.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text weight="bold" size={26} numberOfLines={3} maxFontSizeMultiplier={1.2} style={{ textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 30, color: C.text }}>{item.meta.name}</Text>
                  <Text size={14} color={C.muted} style={{ marginTop: 4 }}>{item.count} {item.count === 1 ? 'dish' : 'dishes'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={C.faint} />
              </Pressable>
            )}
          />
          <CartBar />
        </>
      )}
    </SafeAreaView>
  );
}
