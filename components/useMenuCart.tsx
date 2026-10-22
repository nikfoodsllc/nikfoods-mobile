import React, { useState } from 'react';
import DaySheet, { DaySelection } from '@/components/DaySheet';
import ItemSheet from '@/components/ItemSheet';
import { useToast } from '@/components/Toast';
import { tap } from '@/components/ui';
import { useCart } from '@/contexts/CartContext';
import * as localCart from '@/lib/localStorageCart';
import { isFoodCustomizable } from '@/lib/foodItemUtils';
import type { CategoryDisplay } from '@/lib/homeMenu';
import type { DayOption } from '@/lib/dayAvailabilityClient';
import { DayType } from '@/types/cart';
import { FoodItem } from '@/types/food';
import { CartCustomizations } from '@/types/localCart';

type DayGroup = CategoryDisplay['dayGroups'][number];

/**
 * Adding dishes to the cart the way the Menu does it (same rules as the website's home page): the quantity of a dish on a day,
 * Add / + / -, the item sheet for dishes with options and the delivery-day sheet for flat dishes. Shared by the Menu tab and the
 * Chef's Pick row on Home, so a dish behaves the same wherever it is shown. Render `sheets` once next to the list of cards.
 */
export function useMenuCart(availableDates: DayOption[]) {
  const toast = useToast();
  const { refreshCart } = useCart();
  const [sheet, setSheet] = useState<{ item: FoodItem; dayGroup?: DayGroup } | null>(null);
  const [daySheet, setDaySheet] = useState<{ item: FoodItem; customizations?: CartCustomizations } | null>(null);

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

  const addToDay = (item: FoodItem, dayGroup: DayGroup, customizations: CartCustomizations = {}, quantity = 1) => {
    const opt = dayOf(dayGroup.date);
    if (!opt?.day || !opt.dayWiseCategoryEnabled) {
      toast(`${dayGroup.displayName} is not open for orders`, 'error');
      return false;
    }
    const { __dayGroup, ...clean } = item as FoodItem & { __dayGroup?: unknown };
    void __dayGroup;
    localCart.addItem(opt.day as DayType, dayGroup.date, clean as FoodItem, quantity, customizations);
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

  const onSheetAdd = (item: FoodItem, customizations: CartCustomizations, quantity: number) => {
    const target = sheet?.dayGroup;
    setSheet(null);
    if (target) {
      if (addToDay(item, target, customizations, quantity)) toast('Added');
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

  const sheetDay = sheet?.dayGroup ? dayOf(sheet.dayGroup.date) : undefined;
  const sheetClosed = sheet?.dayGroup && sheetDay && (sheetDay.dayWisePastCutoff || sheetDay.dayWiseCategoryEnabled === false) ? 'Ordering closed' : undefined;

  const sheets = (
    <>
      <ItemSheet item={sheet?.item ?? null} onClose={() => setSheet(null)} onAdd={onSheetAdd} closedLabel={sheetClosed} withQuantity={Boolean(sheet?.dayGroup)} />
      <DaySheet item={daySheet?.item ?? null} customizations={daySheet?.customizations} onClose={() => setDaySheet(null)} onConfirm={onDaysConfirm} />
    </>
  );

  return { dayOf, quantityOf, onAdd, onIncrement, decrement, openItem: (item: FoodItem, dayGroup?: DayGroup) => setSheet({ item, dayGroup }), sheets };
}
