import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import CartBar from '@/components/CartBar';
import FoodCard from '@/components/FoodCard';
import { useMenuCart } from '@/components/useMenuCart';
import { Button, Text, tap } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useCart } from '@/contexts/CartContext';
import { isFoodCustomizable } from '@/lib/foodItemUtils';
import {
  buildMenuSections,
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
import { useVegOnly } from '@/lib/vegOnly';
import { FoodItem } from '@/types/food';
import { useTabBarSpace } from '@/lib/useTabBarSpace';

type DayGroup = CategoryDisplay['dayGroups'][number];
type Cell = { item: FoodItem; dayGroup?: DayGroup };
type Row =
  | { type: 'cat'; key: string; name: string }
  | { type: 'sub'; key: string; name: string }
  | { type: 'dates'; key: string; catId: string; dates: { date: string; label: string }[]; selected: string }
  | { type: 'pair'; key: string; cells: Cell[] }
  | { type: 'empty'; key: string; text: string };
type DatesRow = Extract<Row, { type: 'dates' }>;


/**
 * The menu's dishes (day chips, pinned day chips, add to cart, item sheets) for one category, or for a search across everything.
 * Used by the Menu tab: the category page passes categoryId, the search passes query. The parent draws the page title / search box.
 */
export default function MenuBrowser({ categoryId = '', query = '', header = null }: { categoryId?: string; query?: string; header?: React.ReactElement | null }) {
  const bottomSpace = useTabBarSpace(true);
  const { cart } = useCart();
  const { categories, map, availableDates, loading, error, reload } = useHomeMenu();
  const [vegOnly] = useVegOnly();
  const selectedCategory = categoryId;
  const searching = query.trim().length > 0;
  const [dateByCat, setDateByCat] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  // ---- cart helpers (shared with the Chef's Pick row on Home) ----
  const { dayOf, quantityOf, onAdd, onIncrement, decrement, openItem, sheets } = useMenuCart(availableDates);

  // ---- shaping the menu (same rules as the website) ----
  const sections = useMemo(
    // searching looks through the whole menu, whichever category is open
    () => buildMenuSections(categories, map, searching ? '' : selectedCategory, vegOnly, availableDates),
    [categories, map, selectedCategory, vegOnly, availableDates, searching]
  );

  const rows = useMemo(() => {
    const out: Row[] = [];
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
      if (!categoryId) out.push({ type: 'cat', key: `cat-${meta._id}`, name: meta.name });
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
    if (out.length === 0) out.push({ type: 'empty', key: 'empty', text: vegOnly ? 'No vegetarian items right now' : 'Nothing on the menu right now' });
    return out;
  }, [sections, categories, map, availableDates, dateByCat, vegOnly, searching, query, categoryId]);

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
  const boxRef = useRef<View>(null); // the whole list area: the pinned part sits at its top
  const gov = useRef<{ key: string; at: number; top: number } | null>(null);
  const stickyKeyRef = useRef<string | null>(null);
  stickyKeyRef.current = stickyKey;

  // ---- sub-category tabs: always on top of a category that has sub-categories; the one you are reading is marked, tapping one scrolls there ----
  const subRows = useMemo(() => rows.flatMap((r, index) => (r.type === 'sub' ? [{ key: r.key, name: r.name, index }] : [])), [rows]);
  const showSubTabs = !searching && Boolean(categoryId) && subRows.length >= 2;
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const subTabsRef = useRef<ScrollView>(null);
  const subTabX = useRef(new Map<string, { x: number; w: number }>());
  const barHeight = useRef(54); // the pinned day chips, when they are showing, cover the top of the list by this much
  const pendingOffset = useRef(0);
  const subLockUntil = useRef(0); // after tapping a tab the marked one stays put while the list scrolls there
  const subRowsRef = useRef(subRows);
  subRowsRef.current = subRows;
  const showSubTabsRef = useRef(showSubTabs);
  showSubTabsRef.current = showSubTabs;

  const goToSub = (key: string) => {
    const target = subRowsRef.current.find((x) => x.key === key);
    if (!target) return;
    tap();
    setActiveSub(key);
    subLockUntil.current = Date.now() + 900;
    // under the pinned day chips the heading would be hidden: leave room for them when they govern this part of the list
    const covered = datesForRef.current[target.index] ? barHeight.current : 0;
    pendingOffset.current = covered;
    listRef.current?.scrollToIndex({ index: target.index, viewOffset: covered, animated: true });
  };
  // keep the marked tab in view
  useEffect(() => {
    const at = activeSub ? subTabX.current.get(activeSub) : null;
    if (at) subTabsRef.current?.scrollTo({ x: Math.max(0, at.x - 40), animated: true });
  }, [activeSub]);

  // the day chips are pinned once their own row has scrolled out of sight and dishes of that section are on screen
  // When the day-chip row is the top visible row it may be mostly hidden under the pinned bar (it still counts as "visible"):
  // measure where it really is, and pin the chips exactly while the real row is covered, so they are never missing.
  const measurePin = useRef(() => {
    const g = gov.current;
    if (!g || g.top > g.at) return;
    const view = datesViews.current.get(g.key);
    const box = boxRef.current;
    if (!view || !box) return;
    box.measureInWindow((_bx, by) => {
      view.measureInWindow((_vx, vy) => {
        if (gov.current?.key !== g.key) return;
        // the real day chips are covered once their top edge has gone above the top of the list
        const covered = vy < by - 1;
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
    const idx = viewableItems.map((v) => v.index).filter((i): i is number => i != null);
    if (!idx.length) {
      gov.current = null;
      return setStickyKey(null);
    }
    const top = Math.min(...idx);
    if (showSubTabsRef.current) {
      // the sub-category being read: the last heading at or above the top row (the first one while still above them all)
      const list = subRowsRef.current;
      // (one row of look-ahead: the row at the very top can be half hidden under the pinned day chips)
      const here = [...list].reverse().find((x) => x.index <= top + 1) ?? list[0];
      if (here && Date.now() > subLockUntil.current) setActiveSub((p) => (p === here.key ? p : here.key));
    }
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
    requestAnimationFrame(() => { pendingOffset.current = barHeight.current; listRef.current?.scrollToIndex({ index, viewOffset: barHeight.current, animated: false }); });
  };

  const viewConfig = useRef({ itemVisiblePercentThreshold: 10 });
  const stickyRow = useMemo(() => (stickyKey ? (rows.find((r) => r.type === 'dates' && r.key === stickyKey) as DatesRow | undefined) ?? null : null), [rows, stickyKey]);
  const listExtra = useMemo(() => ({ cart, stickyKey, dateByCat, query }), [cart, stickyKey, dateByCat, query]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  useEffect(() => {
    void cart;
  }, [cart]);

  // The pinned day chips are an overlay on top of the list, NOT a row of it: a row would change the list's height the moment it
  // appears and push every dish down (the jump you saw at the start of a scroll). It is laid out exactly like the real chip row,
  // so when the real row slides under it nothing seems to change.
  const pinnedBar = stickyRow ? (
    <View pointerEvents="box-none" onLayout={(e) => { barHeight.current = e.nativeEvent.layout.height; }} style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.bg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.xl, gap: S.sm, paddingBottom: S.md }} keyboardShouldPersistTaps="handled">
        {stickyRow.dates.map((d) => {
          const on = d.date === stickyRow.selected;
          return (
            <Pressable key={d.date} onPress={() => pickDate(stickyRow.catId, d.date)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Delivery day ${d.label}`} style={{ height: 42, paddingHorizontal: 18, borderRadius: R.pill, justifyContent: 'center', backgroundColor: on ? C.ink : C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: on ? C.ink : C.line }}>
              <Text weight="semibold" size={14} color={on ? C.ivory : C.body}>{d.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ) : null;

  const renderRow = ({ item: row }: { item: Row }) => {
    switch (row.type) {
      case 'cat':
        return (
          <View style={{ paddingHorizontal: S.xl, paddingTop: S.xl, paddingBottom: S.md }}>
            <Text weight="display" size={32}>{row.name}</Text>
          </View>
        );
      case 'sub':
        return (
          <View style={{ paddingHorizontal: S.xl, paddingTop: S.xl, paddingBottom: S.md, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Text weight="display" size={28}>{row.name}</Text>
            <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.gold, opacity: 0.6 }} />
          </View>
        );
      case 'dates':
        return (
          <View ref={(v) => { datesViews.current.set(row.key, v); }} collapsable={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.xl, gap: S.sm, paddingBottom: S.md }}>
            {row.dates.map((d) => {
              const on = d.date === row.selected;
              return (
                <Pressable key={d.date} onPress={() => pickDate(row.catId, d.date)} style={{ height: 42, paddingHorizontal: 18, borderRadius: R.pill, justifyContent: 'center', backgroundColor: on ? C.ink : C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: on ? C.ink : C.line }}>
                  <Text weight="semibold" size={14} color={on ? C.ivory : C.body}>{d.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          </View>
        );
      case 'pair':
        return (
          <View style={{ gap: S.md, paddingHorizontal: S.xl, marginBottom: S.md }}>
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
                  onPress={() => openItem(item, dayGroup)}
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {header}
        <View style={{ padding: S.lg, gap: S.md }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ height: 108, borderRadius: R.xl, backgroundColor: C.surface }} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {header}
        <View style={{ alignItems: 'center', padding: S.xxl, gap: S.lg }}>
          <Text weight="semibold" size={17}>{error}</Text>
          <Button label="Try again" onPress={() => { void reload(); }} />
        </View>
      </View>
    );
  }

  const subTabs = showSubTabs ? (
    <View style={{ backgroundColor: C.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line }}>
      <ScrollView ref={subTabsRef} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: S.xl, gap: 26 }}>
        {subRows.map((x) => {
          const on = x.key === (activeSub ?? subRows[0]?.key);
          return (
            <Pressable
              key={x.key}
              onPress={() => goToSub(x.key)}
              onLayout={(e) => subTabX.current.set(x.key, { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={x.name}
              style={{ paddingTop: 10, paddingBottom: 9, borderBottomWidth: 3, borderBottomColor: on ? C.gold : 'transparent' }}
            >
              <Text weight={on ? 'bold' : 'medium'} size={15} color={on ? C.ink : C.muted} numberOfLines={1}>{x.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    {subTabs}
    <View ref={boxRef} collapsable={false} style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottomSpace }}
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
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, viewOffset: pendingOffset.current, animated: false }), 80);
        }}
      />
      {pinnedBar}
      <CartBar />
      {sheets}
    </View>
    </View>
  );
}
