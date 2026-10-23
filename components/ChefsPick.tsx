import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMenuCart } from '@/components/useMenuCart';
import { Stepper, Text, VegDot, tap } from '@/components/ui';
import { C, R, S, shadowSm } from '@/constants/theme';
import { useCart } from '@/contexts/CartContext';
import { isFoodCustomizable } from '@/lib/foodItemUtils';
import { chefsPickCells } from '@/lib/chefsPick';
import { buildMenuSections } from '@/lib/homeMenu';
import { useHomeMenu } from '@/lib/useHomeMenu';
import { useVegOnly } from '@/lib/vegOnly';
import { useAutoAdvance } from '@/lib/useAutoAdvance';
import { useIsFocused } from '@react-navigation/native';

const CARD_W = 172;
const GAP = 12;
/** the row moves on by one dish this often (waits while it is touched, off for Reduce Motion) */
const AUTO_ADVANCE_MS = 5000;

/**
 * Home, under the banner: the dishes marked Chef's Pick in the admin (Food Items). Same dish cards and Add buttons as the Menu;
 * nothing is shown when no dish is marked (or none of them is on the menu right now). One row you swipe sideways (so a long list
 * never takes over the page), with a small left and right arrow beside the title.
 */
export default function ChefsPick() {
  const { categories, map, availableDates, loading } = useHomeMenu();
  const [vegOnly] = useVegOnly();
  const { cart } = useCart(); // quantities on the cards follow the cart
  const { dayOf, quantityOf, onAdd, onIncrement, decrement, openItem, sheets } = useMenuCart(availableDates);
  const scroller = useRef<ScrollView>(null);
  const [x, setX] = useState(0);
  const [width, setWidth] = useState(0);
  const [content, setContent] = useState(0);
  const [holding, setHolding] = useState(false);
  const focused = useIsFocused();

  const cells = useMemo(() => {
    const sections = buildMenuSections(categories, map, '', vegOnly, availableDates).map((s) => ({ name: s.meta.name, category: s.category }));
    return chefsPickCells(sections, ({ dayGroup }) => {
      const opt = dayGroup ? dayOf(dayGroup.date) : undefined;
      return Boolean(dayGroup && opt && (opt.dayWisePastCutoff || opt.dayWiseCategoryEnabled === false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, map, availableDates, vegOnly]);

  // every 5 seconds the row moves on by one dish; at the end it goes back to the first
  const step = CARD_W + GAP;
  const page = Math.round(x / step);
  useAutoAdvance(cells.length > 1 && content > width && !holding && focused, AUTO_ADVANCE_MS, page, () => {
    const atEnd = x + width >= content - 4;
    scroller.current?.scrollTo({ x: atEnd ? 0 : Math.min(content - width, (page + 1) * step), animated: true });
  });

  void cart;
  if (loading || cells.length === 0) return null;
  const canLeft = x > 4;
  const canRight = x + width < content - 4;
  const slide = (dir: 1 | -1) => {
    tap();
    scroller.current?.scrollTo({ x: Math.max(0, Math.min(content - width, x + dir * (CARD_W + GAP) * 1.5)), animated: true });
  };
  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text weight="display" size={32}>Chef&apos;s Pick</Text>
        {cells.length > 1 && (
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Arrow dir="left" enabled={canLeft} onPress={() => slide(-1)} />
            <Arrow dir="right" enabled={canRight} onPress={() => slide(1)} />
          </View>
        )}
      </View>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -S.xl }}
        contentContainerStyle={{ paddingHorizontal: S.xl, gap: GAP, paddingBottom: S.sm }}
        scrollEventThrottle={16}
        onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}
        onScrollBeginDrag={() => setHolding(true)}
        onScrollEndDrag={() => setHolding(false)}
        onMomentumScrollEnd={() => setHolding(false)}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContent(w)}
        decelerationRate="fast"
        snapToInterval={CARD_W + GAP}
        snapToAlignment="start"
      >
        {cells.map(({ item, dayGroup }) => {
          const inCart = quantityOf(item._id, dayGroup?.date);
          const custom = isFoodCustomizable(item);
          const price = item.portions?.length && item.portionPrices?.length ? item.portionPrices[0] : item.price || null;
          const qty = custom ? 0 : inCart;
          return (
            <View key={`${item._id}-${dayGroup?.date ?? 'f'}`} style={[{ width: CARD_W, backgroundColor: C.white, borderRadius: R.xl, padding: S.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line }, shadowSm]}>
              <Pressable onPress={() => openItem(item, dayGroup)} accessibilityRole="button" accessibilityLabel={`${item.name}, details`}>
                <View style={{ height: 118, borderRadius: 20, overflow: 'hidden', backgroundColor: C.surface }}>
                  <Image source={item.url ? { uri: item.url } : undefined} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                </View>
                <View pointerEvents="none" style={{ position: 'absolute', top: 6, left: 6 }}>
                  <VegDot veg={item.veg} size={16} />
                </View>
                {inCart > 0 && custom && (
                  <View pointerEvents="none" style={{ position: 'absolute', top: -2, right: -2, minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white }}>
                    <Text weight="bold" size={12} color={C.ivory}>{inCart}</Text>
                  </View>
                )}
                <Text weight="semibold" size={15} numberOfLines={2} style={{ marginTop: S.sm, minHeight: 38, lineHeight: 19 }}>{item.name}</Text>
                <Text size={12} color={C.muted} numberOfLines={1} style={{ minHeight: 16 }}>{dayGroup ? dayGroup.displayName || dayGroup.formattedDate : ' '}</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginTop: 2 }}>
                {price != null ? (
                  <Text weight="semibold" size={15} color={C.brandDark} style={{ flexShrink: 1 }}>{item.portions?.length ? 'From ' : ''}${price.toFixed(2)}</Text>
                ) : (
                  <View />
                )}
                {qty > 0 ? (
                  <Stepper compact value={qty} onMinus={() => decrement(item._id, dayGroup)} onPlus={() => onIncrement(item, dayGroup)} />
                ) : (
                  <Pressable
                    onPress={() => {
                      tap();
                      onAdd(item, dayGroup);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={custom && inCart > 0 ? 'Add more' : 'Add'}
                    hitSlop={6}
                    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}
                  >
                    <Ionicons name="add" size={24} color={C.brand} />
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {sheets}
    </View>
  );
}

/** A small round arrow that nudges the row left or right; dimmed when there is nothing further that way. */
function Arrow({ dir, enabled, onPress }: { dir: 'left' | 'right'; enabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={dir === 'left' ? 'Previous dishes' : 'More dishes'}
      style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, opacity: enabled ? 1 : 0.35 }}
    >
      <Ionicons name={dir === 'left' ? 'chevron-back' : 'chevron-forward'} size={18} color={C.ink} />
    </Pressable>
  );
}
