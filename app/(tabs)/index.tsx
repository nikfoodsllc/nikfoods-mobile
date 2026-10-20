import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Switch, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import CartBar from '@/components/CartBar';
import DaySheet, { DaySelection } from '@/components/DaySheet';
import DeliveryBar from '@/components/DeliveryBar';
import FoodCard from '@/components/FoodCard';
import ItemSheet from '@/components/ItemSheet';
import MenuSubscribe from '@/components/MenuSubscribe';
import { useToast } from '@/components/Toast';
import { Button, Text, tap } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useCart } from '@/contexts/CartContext';
import * as localCart from '@/lib/localStorageCart';
import { isFoodCustomizable } from '@/lib/foodItemUtils';
import {
  applyCategoryDisplayFilters,
  categoryHasDisplayItems,
  categoryOrSubsHaveItems,
  CategoryDisplay,
  collectSortedDatesForDayWiseParentWithSubs,
  getItemsForSubOnDate,
  itemTaggedToAnySub,
  normalizeItemId,
  resolveSubCategoriesForDisplay,
} from '@/lib/homeMenu';
import { useHomeMenu } from '@/lib/useHomeMenu';
import { DayType } from '@/types/cart';
import { FoodItem } from '@/types/food';
import { CartCustomizations } from '@/types/localCart';

type DayGroup = CategoryDisplay['dayGroups'][number];
type Cell = { item: FoodItem; dayGroup?: DayGroup };
type Row =
  | { type: 'chips'; key: string }
  | { type: 'cat'; key: string; name: string }
  | { type: 'sub'; key: string; name: string }
  | { type: 'dates'; key: string; catId: string; dates: { date: string; label: string }[]; selected: string }
  | { type: 'pair'; key: string; cells: Cell[] }
  | { type: 'empty'; key: string; text: string };

const logo = require('../../assets/images/nikfoods-logo.png');

export default function Menu() {
  const toast = useToast();
  const { refreshCart, cart } = useCart();
  const { categories, map, availableDates, loading, error, reload } = useHomeMenu();
  const [vegOnly, setVegOnlyState] = useState(() => localStorage.getItem('vegOnly') === '1');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateByCat, setDateByCat] = useState<Record<string, string>>({});
  const [sheet, setSheet] = useState<{ item: FoodItem; dayGroup?: DayGroup } | null>(null);
  const [daySheet, setDaySheet] = useState<{ item: FoodItem; customizations?: CartCustomizations } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const setVegOnly = (v: boolean) => {
    setVegOnlyState(v);
    localStorage.setItem('vegOnly', v ? '1' : '0');
  };

  // ---- cart helpers (same rules as the website's home page) ----
  const dayOf = (date: string) => availableDates.find((d) => d.date === date);
  const quantityOf = (id: string, date?: string): number => {
    if (date) {
      const d = dayOf(date);
      return d?.day ? localCart.getDayQuantity(d.day as DayType, id) : 0;
    }
    return availableDates.reduce((n, d) => n + (d.day ? localCart.getDayQuantity(d.day as DayType, id) : 0), 0);
  };
  const after = async () => {
    await refreshCart();
  };

  const addToDay = (item: FoodItem, dayGroup: DayGroup, customizations: CartCustomizations = {}) => {
    const opt = dayOf(dayGroup.date);
    if (!opt?.day || !opt.dayWiseCategoryEnabled) {
      toast(`${dayGroup.displayName} is not open for orders`, 'error');
      return false;
    }
    const { __dayGroup, ...clean } = item as FoodItem & { __dayGroup?: unknown };
    void __dayGroup;
    localCart.addItem(opt.day as DayType, dayGroup.date, clean as FoodItem, 1, customizations);
    void after();
    return true;
  };

  const incrementOnDay = (item: FoodItem, dayGroup: DayGroup) => {
    const opt = dayOf(dayGroup.date);
    if (!opt?.day || !opt.dayWiseCategoryEnabled) {
      toast(`${dayGroup.displayName} is not open for orders`, 'error');
      return;
    }
    const day = opt.day as DayType;
    const line = localCart.getFirstLineForFoodOnDay(day, item._id);
    if (line) localCart.updateQuantity(day, line.lineId, line.quantity + 1);
    else localCart.addItem(day, dayGroup.date, item, 1, {});
    void after();
  };

  const decrement = (id: string, dayGroup?: DayGroup) => {
    if (dayGroup) {
      const opt = dayOf(dayGroup.date);
      const day = (opt?.day || dayGroup.day) as DayType | undefined;
      if (day && localCart.getDayQuantity(day, id) > 0) {
        localCart.decrementOneUnitForFoodOnDay(day, id);
        void after();
      }
      return;
    }
    for (const d of availableDates) {
      if (!d.day) continue;
      if (localCart.getDayQuantity(d.day as DayType, id) > 0) {
        localCart.decrementOneUnitForFoodOnDay(d.day as DayType, id);
        void after();
        break;
      }
    }
  };

  const onAdd = (item: FoodItem, dayGroup?: DayGroup) => {
    if (isFoodCustomizable(item)) {
      setSheet({ item, dayGroup });
      return;
    }
    if (dayGroup) {
      if (addToDay(item, dayGroup)) tap();
      return;
    }
    setDaySheet({ item });
  };

  const onIncrement = (item: FoodItem, dayGroup?: DayGroup) => {
    if (dayGroup) {
      incrementOnDay(item, dayGroup);
      return;
    }
    setDaySheet({ item });
  };

  const onSheetAdd = (item: FoodItem, customizations: CartCustomizations) => {
    const target = sheet?.dayGroup;
    setSheet(null);
    if (target) {
      if (addToDay(item, target, customizations)) toast('Added');
    } else {
      setDaySheet({ item, customizations });
    }
  };

  const onDaysConfirm = (selected: DaySelection[]) => {
    if (!daySheet) return;
    for (const s of selected) {
      localCart.addItem(s.day, s.date, daySheet.item, s.quantity, { ...(daySheet.customizations ?? {}), listingType: 'flat' });
    }
    setDaySheet(null);
    toast('Added');
    void after();
  };

  // ---- shaping the menu (same rules as the website) ----
  const sections = useMemo(() => {
    const parents = selectedCategory ? categories.filter((c) => c._id === selectedCategory) : categories;
    return parents.map((meta) => {
      const row = map.get(meta._id);
      let merged: CategoryDisplay | null = null;
      if (row) {
        merged = { ...row };
        if (meta.children?.length) {
          const subs = meta.children
            .slice()
            .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
            .map((ch) => map.get(ch._id))
            .filter((x): x is CategoryDisplay => !!x);
          if (subs.length > 0) merged = { ...merged, subCategories: subs };
        }
      }
      return { meta, category: merged ? applyCategoryDisplayFilters(merged, vegOnly, availableDates) : null };
    });
  }, [categories, map, selectedCategory, vegOnly, availableDates]);

  const rows = useMemo(() => {
    const out: Row[] = [{ type: 'chips', key: 'chips' }];
    const pairs = (items: Cell[], key: string) => {
      for (let i = 0; i < items.length; i += 2) out.push({ type: 'pair', key: `${key}-${i}`, cells: items.slice(i, i + 2) });
    };
    for (const { meta, category } of sections) {
      if (!category) continue;
      if (!categoryOrSubsHaveItems(category)) continue;
      out.push({ type: 'cat', key: `cat-${meta._id}`, name: meta.name });
      const subs = resolveSubCategoriesForDisplay(category, categories, map);
      const listing = category.listingType ?? meta.listingType ?? 'flat';

      const dateChips = (catId: string, dates: { date: string; label: string }[]) => {
        const selected = dateByCat[catId] && dates.some((d) => d.date === dateByCat[catId]) ? dateByCat[catId] : dates[0]?.date;
        out.push({ type: 'dates', key: `dates-${catId}`, catId, dates, selected });
        return selected;
      };

      if (listing === 'flat') {
        if (categoryHasDisplayItems(category)) pairs(category.foodItems.map((item) => ({ item })), `f-${meta._id}`);
        for (const sub of subs) {
          if (sub.listingType === 'flat') {
            if (!sub.foodItems.length) continue;
            out.push({ type: 'sub', key: `sub-${sub._id}`, name: sub.name });
            pairs(sub.foodItems.map((item) => ({ item })), `f-${sub._id}`);
          } else if (sub.dayGroups.length) {
            out.push({ type: 'sub', key: `sub-${sub._id}`, name: sub.name });
            const sel = dateChips(sub._id, sub.dayGroups.map((g) => ({ date: g.date, label: g.displayName })));
            const g = sub.dayGroups.find((x) => x.date === sel);
            if (g) pairs(g.foodItems.map((item) => ({ item, dayGroup: g })), `d-${sub._id}-${sel}`);
          }
        }
      } else if (subs.length > 0) {
        const dates = collectSortedDatesForDayWiseParentWithSubs({ ...category, subCategories: subs });
        if (!dates.length) continue;
        const sel = dateChips(meta._id, dates.map((d) => ({ date: d, label: category.dayGroups.find((g) => g.date === d)?.displayName || dayOf(d)?.formattedDate || d })));
        const parentDg = category.dayGroups.find((g) => g.date === sel);
        if (parentDg) {
          const inSub = new Set<string>();
          for (const sub of subs) for (const it of getItemsForSubOnDate(sub, sel, availableDates, parentDg.foodItems)) inSub.add(normalizeItemId(it._id));
          const parentOnly = parentDg.foodItems.filter((it) => !inSub.has(normalizeItemId(it._id)) && !itemTaggedToAnySub(it, subs));
          if (parentOnly.length) pairs(parentOnly.map((item) => ({ item, dayGroup: parentDg })), `p-${meta._id}-${sel}`);
        }
        for (const sub of subs) {
          const items = getItemsForSubOnDate(sub, sel, availableDates, parentDg?.foodItems);
          if (!items.length) continue;
          const dg: DayGroup = sub.dayGroups?.find((g) => g.date === sel) ?? { date: sel, displayName: dayOf(sel)?.formattedDate || sel, formattedDate: dayOf(sel)?.formattedDate || sel, day: parentDg?.day, foodItems: items };
          out.push({ type: 'sub', key: `sub-${sub._id}-${sel}`, name: sub.name });
          pairs(items.map((item) => ({ item, dayGroup: dg })), `s-${sub._id}-${sel}`);
        }
      } else if (category.dayGroups.length) {
        const sel = dateChips(meta._id, category.dayGroups.map((g) => ({ date: g.date, label: g.displayName })));
        const g = category.dayGroups.find((x) => x.date === sel);
        if (g) pairs(g.foodItems.map((item) => ({ item, dayGroup: g })), `d-${meta._id}-${sel}`);
      }
    }
    if (out.length === 1) out.push({ type: 'empty', key: 'empty', text: vegOnly ? 'No vegetarian items right now' : 'Nothing on the menu right now' });
    return out;
  }, [sections, categories, map, availableDates, dateByCat, vegOnly]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  useEffect(() => {
    void cart;
  }, [cart]);

  const renderChips = () => (
    <View style={{ backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.lg, paddingVertical: S.sm, gap: S.md }}>
        {[{ _id: '', name: 'All', imageUrl: '' }, ...categories].map((c) => {
          const on = selectedCategory === c._id;
          return (
            <Pressable key={c._id || 'all'} onPress={() => { tap(); setSelectedCategory(c._id); }} accessibilityRole="button" accessibilityLabel={c.name} style={{ alignItems: 'center', width: 62 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: on ? C.brand : 'transparent', padding: 2 }}>
                <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: on && !c._id ? C.brand : C.surface, alignItems: 'center', justifyContent: 'center' }}>
                  {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text weight="bold" size={15} color={on ? C.onBrand : C.body}>All</Text>}
                </View>
              </View>
              <Text weight={on ? 'bold' : 'medium'} size={11} color={on ? C.text : C.muted} numberOfLines={2} maxFontSizeMultiplier={1.1} style={{ marginTop: 4, textAlign: 'center' }}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderRow = ({ item: row }: { item: Row }) => {
    switch (row.type) {
      case 'chips':
        return renderChips();
      case 'cat':
        return (
          <View style={{ paddingHorizontal: S.lg, paddingTop: S.xl, paddingBottom: S.md }}>
            <Text weight="bold" size={24}>{row.name}</Text>
          </View>
        );
      case 'sub':
        return (
          <View style={{ paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.md, flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: C.brand }} />
            <Text weight="semibold" size={17} color={C.brandDark}>{row.name}</Text>
          </View>
        );
      case 'dates':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.sm, paddingBottom: S.md }}>
            {row.dates.map((d) => {
              const on = d.date === row.selected;
              return (
                <Pressable key={d.date} onPress={() => { tap(); setDateByCat((p) => ({ ...p, [row.catId]: d.date })); }} style={{ height: 40, paddingHorizontal: 16, borderRadius: R.pill, justifyContent: 'center', backgroundColor: on ? C.text : C.surface }}>
                  <Text weight="semibold" size={14} color={on ? C.white : C.body}>{d.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        );
      case 'pair':
        return (
          <View style={{ gap: S.md, paddingHorizontal: S.lg, marginBottom: S.md }}>
            {row.cells.map(({ item, dayGroup }) => {
              const inCart = quantityOf(item._id, dayGroup?.date);
              const custom = isFoodCustomizable(item);
              const opt = dayGroup ? dayOf(dayGroup.date) : undefined;
              const closed = dayGroup ? Boolean(opt && (opt.dayWisePastCutoff || opt.dayWiseCategoryEnabled === false)) : false;
              const price = item.portions?.length && item.portionPrices?.length ? item.portionPrices[0] : item.price || null;
              return (
                <FoodCard
                  key={`${item._id}-${dayGroup?.date ?? 'f'}`}
                  name={item.name}
                  imageUrl={item.url}
                  price={price}
                  starting={Boolean(item.portions?.length)}
                  veg={item.veg}
                  available={item.available}
                  closed={closed}
                  customizable={custom}
                  quantity={custom ? 0 : inCart}
                  inCartCount={inCart}
                  onPress={() => setSheet({ item, dayGroup })}
                  onAdd={() => onAdd(item, dayGroup)}
                  onIncrement={() => onIncrement(item, dayGroup)}
                  onDecrement={() => decrement(item._id, dayGroup)}
                />
              );
            })}
          </View>
        );
      case 'empty':
        return <Text color={C.muted} style={{ textAlign: 'center', padding: S.xxl }}>{row.text}</Text>;
    }
  };

  const header = (
    <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: S.md, gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md }}>
        <Image source={logo} style={{ width: 128, height: 36, flexShrink: 0 }} contentFit="contain" accessibilityLabel="NikFoods" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Text weight="semibold" size={14} color={C.body} maxFontSizeMultiplier={1.1}>Veg only</Text>
          <Switch value={vegOnly} onValueChange={(v) => { tap(); setVegOnly(v); }} trackColor={{ true: C.green, false: '#E5E7EB' }} accessibilityLabel="Veg only" />
        </View>
      </View>
      <MenuSubscribe />
      <DeliveryBar />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
        {header}
        <View style={{ padding: S.lg, gap: S.md }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ height: 108, borderRadius: R.xl, backgroundColor: C.surface }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
        {header}
        <View style={{ alignItems: 'center', padding: S.xxl, gap: S.lg }}>
          <Text weight="semibold" size={17}>{error}</Text>
          <Button label="Try again" onPress={() => { void reload(); }} />
        </View>
      </SafeAreaView>
    );
  }

  const sheetDay = sheet?.dayGroup ? dayOf(sheet.dayGroup.date) : undefined;
  const sheetClosed = sheet?.dayGroup && sheetDay && (sheetDay.dayWisePastCutoff || sheetDay.dayWiseCategoryEnabled === false) ? 'Ordering closed' : undefined;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        ListHeaderComponent={header}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={9}
        extraData={cart}
      />
      <CartBar />
      <ItemSheet item={sheet?.item ?? null} onClose={() => setSheet(null)} onAdd={onSheetAdd} closedLabel={sheetClosed} />
      <DaySheet item={daySheet?.item ?? null} customizations={daySheet?.customizations} onClose={() => setDaySheet(null)} onConfirm={onDaysConfirm} />
    </SafeAreaView>
  );
}
