import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '@/constants/theme';
import { Button, Sheet, Stepper, Text, VegDot, tap } from '@/components/ui';
import { FoodItem } from '@/types/food';
import { DayType } from '@/types/cart';
import { CartCustomizations } from '@/types/localCart';
import { DayOption, generateAvailableDatesFromAPI } from '@/lib/dayAvailabilityClient';

export interface DaySelection {
  day: DayType;
  date: string;
  quantity: number;
}

/** Flat items: pick the delivery days (with a quantity for each), like the website's "Choose Delivery Date". */
export default function DaySheet({
  item,
  customizations,
  onClose,
  onConfirm,
}: {
  item: FoodItem | null;
  customizations?: CartCustomizations;
  onClose: () => void;
  onConfirm: (selected: DaySelection[]) => void;
}) {
  const [days, setDays] = useState<DayOption[] | null>(null);
  const [picked, setPicked] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!item) return;
    let off = false;
    setDays(null);
    setPicked(new Map());
    generateAvailableDatesFromAPI(false).then((all) => {
      if (!off) setDays(all.filter((d) => !d.isPast && !d.flatPastCutoff));
    });
    return () => {
      off = true;
    };
  }, [item]);

  if (!item) return null;
  const unit = customizations?.selectedPortionPrice != null ? customizations.selectedPortionPrice : item.price;
  const unitWithEco = unit + (customizations?.isEcoFriendlyContainer && customizations.ecoContainerCharge ? customizations.ecoContainerCharge : 0);

  const toggle = (date: string) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(date)) next.delete(date);
      else next.set(date, 1);
      return next;
    });
  const setQty = (date: string, q: number) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (q <= 0) next.delete(date);
      else next.set(date, q);
      return next;
    });

  const confirm = () => {
    const byDate = new Map((days ?? []).map((d) => [d.date, d]));
    const out: DaySelection[] = [];
    picked.forEach((quantity, date) => {
      const d = byDate.get(date);
      if (d) out.push({ day: d.day as DayType, date, quantity });
    });
    if (out.length) onConfirm(out);
  };

  const total = Array.from(picked.values()).reduce((n, q) => n + q, 0);

  return (
    <Sheet
      visible
      onClose={onClose}
      title="Delivery day"
      footer={<Button label={total ? `Add ${total} to cart  ·  $${(total * unitWithEco).toFixed(2)}` : 'Pick a day'} disabled={!total} onPress={confirm} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, backgroundColor: C.surface, borderRadius: R.lg, marginBottom: S.lg }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: C.line }}>
          <Image source={item.url ? { uri: item.url } : undefined} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <VegDot veg={item.veg} size={14} />
            <Text weight="semibold" size={15} numberOfLines={2} style={{ flex: 1 }}>{item.name}</Text>
          </View>
          <Text weight="bold" size={15} color={C.brandDark}>${unitWithEco.toFixed(2)}</Text>
        </View>
      </View>

      {days === null ? (
        <View style={{ paddingVertical: S.xxl }}><ActivityIndicator color={C.brand} /></View>
      ) : days.length === 0 ? (
        <Text color={C.muted} style={{ textAlign: 'center', paddingVertical: S.xl }}>No delivery days are open right now.</Text>
      ) : (
        days.map((d) => {
          const q = picked.get(d.date) ?? 0;
          const on = q > 0;
          return (
            <Pressable
              key={d.date}
              onPress={() => {
                tap();
                toggle(d.date);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: S.md, borderRadius: R.lg, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.cream : C.white, marginBottom: S.sm }}
            >
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: on ? C.brand : '#D1D5DB', backgroundColor: on ? C.brand : C.white, alignItems: 'center', justifyContent: 'center', marginRight: S.md }}>
                {on && <Ionicons name="checkmark" size={16} color={C.onBrand} />}
              </View>
              <Text weight="semibold" size={16} style={{ flex: 1 }}>{d.formattedDate}</Text>
              {on && <Stepper compact value={q} onMinus={() => setQty(d.date, q - 1)} onPlus={() => setQty(d.date, q + 1)} />}
            </Pressable>
          );
        })
      )}
    </Sheet>
  );
}
