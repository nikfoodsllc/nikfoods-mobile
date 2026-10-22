import React, { useMemo } from 'react';
import { View } from 'react-native';
import FoodCard from '@/components/FoodCard';
import { useMenuCart } from '@/components/useMenuCart';
import { Text } from '@/components/ui';
import { S } from '@/constants/theme';
import { useCart } from '@/contexts/CartContext';
import { isFoodCustomizable } from '@/lib/foodItemUtils';
import { chefsPickCells } from '@/lib/chefsPick';
import { buildMenuSections } from '@/lib/homeMenu';
import { useHomeMenu } from '@/lib/useHomeMenu';
import { useVegOnly } from '@/lib/vegOnly';

/**
 * Home, under the banner: the dishes marked Chef's Pick in the admin (Food Items). Same dish cards and Add buttons as the Menu;
 * nothing is shown when no dish is marked (or none of them is on the menu right now).
 */
export default function ChefsPick() {
  const { categories, map, availableDates, loading } = useHomeMenu();
  const [vegOnly] = useVegOnly();
  const { cart } = useCart(); // quantities on the cards follow the cart
  const { dayOf, quantityOf, onAdd, onIncrement, decrement, openItem, sheets } = useMenuCart(availableDates);

  const cells = useMemo(() => {
    const sections = buildMenuSections(categories, map, '', vegOnly, availableDates).map((s) => ({ name: s.meta.name, category: s.category }));
    return chefsPickCells(sections, ({ dayGroup }) => {
      const opt = dayGroup ? dayOf(dayGroup.date) : undefined;
      return Boolean(dayGroup && opt && (opt.dayWisePastCutoff || opt.dayWiseCategoryEnabled === false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, map, availableDates, vegOnly]);

  void cart;
  if (loading || cells.length === 0) return null;
  return (
    <View style={{ gap: S.md }}>
      <Text weight="display" size={32}>Chef&apos;s Pick</Text>
      {cells.map(({ item, dayGroup }) => {
        const inCart = quantityOf(item._id, dayGroup?.date);
        const custom = isFoodCustomizable(item);
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
            note={dayGroup ? dayGroup.displayName || dayGroup.formattedDate : undefined}
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
      {sheets}
    </View>
  );
}
