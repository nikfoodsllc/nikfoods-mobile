import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import CartBar from '@/components/CartBar';
import DaySheet, { DaySelection } from '@/components/DaySheet';
import DeliveryBar from '@/components/DeliveryBar';
import FoodCard from '@/components/FoodCard';
import ItemSheet from '@/components/ItemSheet';
import MenuSubscribe from '@/components/MenuSubscribe';
import SearchField from '@/components/SearchField';
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
import { searchMenu } from '@/lib/menuSearch';
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
type DatesRow = Extract<Row, { type: 'dates' }>;

const logo = require('../../assets/images/nikfoods-logo.png');

export default function Menu() {
  const toast = useToast();
  const { refreshCart, cart } = useCart();
  const { categories, map, availableDates, loading, error, reload } = useHomeMenu();
  const [vegOnly, setVegOnlyState] = useState(() => localStorage.getItem('vegOnly') === '1');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
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
    // searching looks through the whole menu, whichever category is picked
    const parents = selectedCategory && !searching ? categories.filter((c) => c._id === selectedCategory) : categories;
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
  }, [categories, map, selectedCategory, vegOnly, availableDates, searching]);

  const rows = useMemo(() => {
    const out: Row[] = [{ type: 'chips', key: 'chips' }];
    const pairs = (items: Cell[], key: string) => {
      for (let i = 0; i < items.length; i += 2) out.push({ type: 'pair', key: `${key}-${i}`, cells: items.slice(i, i + 2) });
    };
    if (searching) {
      const groups = searchMenu(sections.map((s) => ({ name: s.meta.name, category: s.category })), query);
      for (const g of groups) {
        out.push({ type: 'cat', key: `sr-${g.date || g.title}`, name: g.title });
        pairs(g.cells, `sr-${g.date || g.title}`);
      }
      if (groups.length === 0) out.push({ type: 'empty', key: 'empty', text: `No dishes match "${query.trim()}"` });
      return out;
    }
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
  }, [sections, categories, map, availableDates, dateByCat, vegOnly, searching, query]);

  // ---- the day chips stay pinned while you scroll through the dishes they apply to ----
  // For every row: the day chips that govern it (the nearest "dates" row above it in the same category), or null.
  const datesFor = useMemo(() => {
    const out: Array<{ row: DatesRow; at: number } | null> = [];
    let cur: { row: DatesRow; at: number } | null = null;
    rows.forEach((r, i) => {
      if (r.type === 'cat') cur = null;
      else if (r.type === 'dates') cur = { row: r, at: i };
      else if (r.type === 'sub' && rows[i + 1]?.type === 'dates') cur = null; // this sub-category has its own day chips right below
      out.push(cur);
    });
    return out;
  }, [rows]);
  const datesForRef = useRef(datesFor);
  datesForRef.current = datesFor;
  const [stickyKey, setStickyKey] = useState<string | null>(null);
  const listRef = useRef<FlatList<Row>>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const datesViews = useRef(new Map<string, View | null>()); // the real day-chip rows, to measure where they are on screen
  const barRef = useRef<View>(null); // the search box + category chips (the part that is always pinned)
  const barHeight = useRef(0);
  const gov = useRef<{ key: string; at: number; top: number } | null>(null);
  const stickyKeyRef = useRef<string | null>(null);
  stickyKeyRef.current = stickyKey;

  // the category row scrolls sideways: a fade and an arrow on the right edge say there is more, until the end is reached
  const chipsRef = useRef<ScrollView>(null);
  const chipsSize = useRef({ content: 0, layout: 0, x: 0 });
  const [chipsMore, setChipsMore] = useState({ left: false, right: true });
  const updateChipsMore = () => {
    const { content, layout, x } = chipsSize.current;
    if (!content || !layout) return;
    const next = { left: x > 8, right: content - layout - x > 8 };
    setChipsMore((p) => (p.left === next.left && p.right === next.right ? p : next));
  };
  // the day chips are pinned once their own row has scrolled out of sight and dishes of that section are on screen
  // When the day-chip row is the top visible row it may be mostly hidden under the pinned bar (it still counts as "visible"):
  // measure where it really is, and pin the chips exactly while the real row is covered, so they are never missing.
  const measurePin = useRef(() => {
    const g = gov.current;
    if (!g || g.top > g.at) return;
    const view = datesViews.current.get(g.key);
    const bar = barRef.current;
    if (!view || !bar) return;
    bar.measureInWindow((_bx, by, _bw, bh) => {
      view.measureInWindow((_vx, vy) => {
        if (gov.current?.key !== g.key) return;
        const covered = vy < by + bh - 1;
        setStickyKey(covered ? g.key : null);
      });
    });
  });
  const scrollTick = useRef(false);
  const onListScroll = useRef(() => {
    if (scrollTick.current || !gov.current || gov.current.top > gov.current.at) return;
    scrollTick.current = true;
    requestAnimationFrame(() => {
      scrollTick.current = false;
      measurePin.current();
    });
  });
  const onViewable = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const idx = viewableItems.map((v) => v.index).filter((i): i is number => i != null && i > 0);
    if (!idx.length) {
      gov.current = null;
      return setStickyKey(null);
    }
    const top = Math.min(...idx);
    const governing = datesForRef.current[top];
    if (governing && top > governing.at) {
      gov.current = { key: governing.row.key, at: governing.at, top };
      return setStickyKey(governing.row.key); // its own row is above the screen
    }
    // The category heading or the day chips themselves are the top rows (they can be mostly hidden under the pinned bar and still
    // count as visible): find the day chips of this category at or below that row, and measure whether they are hidden.
    const all = rowsRef.current;
    let n = -1;
    for (let i = top; i < all.length; i++) {
      if (all[i].type === 'dates') {
        n = i;
        break;
      }
      if (i > top && all[i].type === 'cat') break;
    }
    gov.current = n >= 0 ? { key: all[n].key, at: n, top } : null;
    if (n < 0) return setStickyKey(null);
    measurePin.current();
  });

  // Choosing another day while the day chips are pinned (you are part-way down the list) starts that day's dishes from the top.
  const pickDate = (catId: string, date: string) => {
    tap();
    const pinned = stickyKeyRef.current !== null && rowsRef.current.some((r) => r.type === 'dates' && r.key === stickyKeyRef.current && r.catId === catId);
    setDateByCat((p) => ({ ...p, [catId]: date }));
    if (!pinned) return;
    const index = rowsRef.current.findIndex((r) => r.type === 'dates' && r.catId === catId);
    if (index < 0) return;
    requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, viewOffset: barHeight.current, animated: false }));
  };

  const viewConfig = useRef({ itemVisiblePercentThreshold: 10 });
  const stickyRow = useMemo(() => (stickyKey ? (rows.find((r) => r.type === 'dates' && r.key === stickyKey) as DatesRow | undefined) ?? null : null), [rows, stickyKey]);
  const listExtra = useMemo(() => ({ cart, stickyKey, dateByCat, chipsMore, query }), [cart, stickyKey, dateByCat, chipsMore, query]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  useEffect(() => {
    void cart;
  }, [cart]);

  // the search box and the category chips are ONE sticky bar under the address: they stay on screen while you scroll
  const renderChips = () => (
    <View style={{ backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View ref={barRef} collapsable={false} onLayout={(e) => { barHeight.current = e.nativeEvent.layout.height; }}>
      <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: S.xs }}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search dishes" />
      </View>
      {!searching && (
      <View>
      <ScrollView
        ref={chipsRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          chipsSize.current.x = e.nativeEvent.contentOffset.x;
          updateChipsMore();
        }}
        onLayout={(e) => {
          chipsSize.current.layout = e.nativeEvent.layout.width;
          updateChipsMore();
        }}
        onContentSizeChange={(w) => {
          chipsSize.current.content = w;
          updateChipsMore();
        }}
        contentContainerStyle={{ paddingHorizontal: S.lg, paddingVertical: S.sm, gap: S.md }}
      >
        {[{ _id: '', name: 'All', imageUrl: '' }, ...categories].map((c) => {
          const on = selectedCategory === c._id;
          return (
            <Pressable key={c._id || 'all'} onPress={() => { tap(); setSelectedCategory(c._id); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={c.name} style={{ alignItems: 'center', width: 84 }}>
              <View style={{ width: 66, height: 66, borderRadius: 33, borderWidth: 3, borderColor: on ? C.brand : 'transparent', padding: 3, opacity: on ? 1 : 0.85 }}>
                <View style={{ flex: 1, borderRadius: 30, overflow: 'hidden', backgroundColor: on && !c._id ? C.brand : C.surface, alignItems: 'center', justifyContent: 'center' }}>
                  {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text weight="bold" size={17} color={on ? C.onBrand : C.body}>All</Text>}
                </View>
              </View>
              <Text weight={on ? 'bold' : 'medium'} size={13} color={on ? C.text : C.muted} numberOfLines={2} maxFontSizeMultiplier={1.1} style={{ marginTop: 6, textAlign: 'center' }}>{c.name}</Text>
              <View style={{ height: 3, width: 30, borderRadius: 2, marginTop: 4, backgroundColor: on ? C.brand : 'transparent' }} />
            </Pressable>
          );
        })}
      </ScrollView>
      {chipsMore.left && (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 64, justifyContent: 'center', alignItems: 'flex-start' }}>
          <LinearGradient pointerEvents="none" colors={['#FFFFFF', 'rgba(255,255,255,0)']} start={{ x: 0.3, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <Pressable
            onPress={() => {
              tap();
              chipsRef.current?.scrollTo({ x: Math.max(chipsSize.current.x - 220, 0), animated: true });
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Show earlier categories"
            style={{ width: 28, height: 28, borderRadius: 14, marginLeft: 8, marginBottom: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={16} color={C.body} />
          </Pressable>
        </View>
      )}
      {chipsMore.right && (
        <View pointerEvents="box-none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 64, justifyContent: 'center', alignItems: 'flex-end' }}>
          <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0)', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0 }} style={StyleSheet.absoluteFill} />
          <Pressable
            onPress={() => {
              tap();
              chipsRef.current?.scrollTo({ x: chipsSize.current.x + 220, animated: true });
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Show more categories"
            style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-forward" size={16} color={C.body} />
          </Pressable>
        </View>
      )}
      </View>
      )}
      </View>
      {stickyRow && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderTopWidth: 1, borderTopColor: C.line }} contentContainerStyle={{ paddingHorizontal: S.lg, paddingVertical: 6, gap: S.sm }} keyboardShouldPersistTaps="handled">
          {stickyRow.dates.map((d) => {
            const on = d.date === stickyRow.selected;
            return (
              <Pressable key={d.date} onPress={() => pickDate(stickyRow.catId, d.date)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Delivery day ${d.label}`} style={{ height: 34, paddingHorizontal: 14, borderRadius: R.pill, justifyContent: 'center', backgroundColor: on ? C.text : C.surface }}>
                <Text weight="semibold" size={13} color={on ? C.white : C.body} maxFontSizeMultiplier={1.1}>{d.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
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
          <View ref={(v) => { datesViews.current.set(row.key, v); }} collapsable={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.sm, paddingBottom: S.md }}>
            {row.dates.map((d) => {
              const on = d.date === row.selected;
              return (
                <Pressable key={d.date} onPress={() => pickDate(row.catId, d.date)} style={{ height: 40, paddingHorizontal: 16, borderRadius: R.pill, justifyContent: 'center', backgroundColor: on ? C.text : C.surface }}>
                  <Text weight="semibold" size={14} color={on ? C.white : C.body}>{d.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          </View>
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
        ref={listRef}
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
        extraData={listExtra}
        onViewableItemsChanged={onViewable.current}
        viewabilityConfig={viewConfig.current}
        onScroll={onListScroll.current}
        scrollEventThrottle={16}
        onScrollToIndexFailed={(info) => {
          // the row is not measured yet (it is far above): jump near it, then place it
          listRef.current?.scrollToOffset({ offset: Math.max(0, info.averageItemLength * info.index), animated: false });
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, viewOffset: barHeight.current, animated: false }), 80);
        }}
      />
      <CartBar />
      <ItemSheet item={sheet?.item ?? null} onClose={() => setSheet(null)} onAdd={onSheetAdd} closedLabel={sheetClosed} />
      <DaySheet item={daySheet?.item ?? null} customizations={daySheet?.customizations} onClose={() => setDaySheet(null)} onConfirm={onDaysConfirm} />
    </SafeAreaView>
  );
}
