import React from 'react';
import { View } from 'react-native';
import { C, R, S } from '@/constants/theme';
import { Text } from '@/components/ui';
import { Order, OrderDay, OrderDayItem } from '@/types/order';
import { getStatusColor, getStatusLabel } from '@/lib/orderHelpers';
import { formatSpiceLevel } from '@/utils/formatters';
import { getSectionSpice } from '@/lib/comboSpice';

export function StatusChip({ status }: { status: Order['status'] }) {
  const color = getStatusColor(status);
  return (
    <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: `${color}1A`, alignItems: 'center', justifyContent: 'center' }}>
      <Text weight="bold" size={12} color={color}>{getStatusLabel(status)}</Text>
    </View>
  );
}

/** "Wed, Oct 21" from a stored date (date-only strings are not shifted by the time zone). */
export function dayLabel(value: Date | string | undefined): string {
  if (!value) return '';
  const s = typeof value === 'string' ? value : value.toISOString();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function deliveryOf(day: OrderDay): string {
  return dayLabel(day.actualDeliveryDate || day.deliveryDate);
}

export function itemLines(item: OrderDayItem): string[] {
  const out: string[] = [];
  const tags = [item.selectedPortion, item.spiceLevel ? formatSpiceLevel(item.spiceLevel) : null, item.isEcoFriendlyContainer ? 'Eco container' : null].filter(Boolean);
  if (tags.length) out.push(tags.join('  ·  '));
  for (const s of item.food.sections ?? []) {
    const ids = item.comboSelections?.[s._id] ?? [];
    const names = s.selectedItems.filter((si) => ids.includes(si._id)).map((si) => si.item.name);
    const own = getSectionSpice(item.comboSelections, s._id);
    if (names.length) out.push(`${s.title}: ${names.join(', ')}${own ? `  ·  ${formatSpiceLevel(own)}` : ''}`);
  }
  return out;
}

export function ItemRow({ item }: { item: OrderDayItem }) {
  const lines = itemLines(item);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.md, paddingVertical: 6 }}>
      <View style={{ flex: 1 }}>
        <Text weight="medium" size={15}>{item.quantity} x {item.food.name}</Text>
        {lines.map((l) => <Text key={l} size={12} color={C.muted} style={{ marginTop: 2 }}>{l}</Text>)}
      </View>
      <Text weight="semibold" size={15}>${(item.price * item.quantity).toFixed(2)}</Text>
    </View>
  );
}

export const cardRadius = R.lg;
