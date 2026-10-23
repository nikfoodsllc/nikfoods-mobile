import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '@/constants/theme';
import { Stepper, Text, VegDot, tap } from '@/components/ui';
import { CartItem } from '@/types/cart';
import { formatSpiceLevel } from '@/utils/formatters';
import { getSectionSpice } from '@/lib/comboSpice';

/** What the customer picked on a combo, one line per section ("Veg Curry of the Day: Kale Chane"). */
export function comboLines(item: CartItem): string[] {
  const sections = item.foodItem.sections ?? [];
  const chosen = item.comboSelections ?? {};
  const lines: string[] = [];
  for (const s of sections) {
    const ids = chosen[s._id] ?? [];
    const names = s.selectedItems.filter((si) => ids.includes(si._id)).map((si) => si.item.name);
    const own = getSectionSpice(chosen, s._id);
    if (names.length) lines.push(`${s.title}: ${names.join(', ')}${own ? `  ·  ${formatSpiceLevel(own)}` : ''}`);
  }
  return lines;
}

export default function CartLine({ item, onMinus, onPlus, onRemove }: { item: CartItem; onMinus: () => void; onPlus: () => void; onRemove: () => void }) {
  const tags = [
    item.selectedPortion ? item.selectedPortion : null,
    item.selectedSpiceLevel ? formatSpiceLevel(String(item.selectedSpiceLevel)) : null,
    item.isEcoFriendlyContainer ? 'Eco container' : null,
  ].filter(Boolean) as string[];
  const combo = comboLines(item);
  return (
    <View style={{ flexDirection: 'row', gap: S.md, paddingVertical: S.md }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden', backgroundColor: C.surface }}>
        <Image source={item.foodItem.url ? { uri: item.foodItem.url } : undefined} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <View style={{ paddingTop: 3 }}><VegDot veg={item.foodItem.veg} size={14} /></View>
          <Text weight="semibold" size={15} style={{ flex: 1 }} numberOfLines={2}>{item.foodItem.name}</Text>
          <Pressable
            hitSlop={12}
            onPress={() => {
              tap();
              onRemove();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.foodItem.name}`}
          >
            <Ionicons name="trash-outline" size={20} color={C.faint} />
          </Pressable>
        </View>
        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {tags.map((t) => (
              <View key={t} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.sm, backgroundColor: t === 'Eco container' ? C.greenBg : C.surface }}>
                <Text size={12} weight="medium" color={t === 'Eco container' ? C.green : C.body}>{t}</Text>
              </View>
            ))}
          </View>
        )}
        {combo.map((l) => (
          <Text key={l} size={12} color={C.muted} style={{ marginTop: 2 }}>{l}</Text>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.sm }}>
          <Stepper compact value={item.quantity} onMinus={onMinus} onPlus={onPlus} />
          <Text weight="bold" size={16}>${item.totalPrice.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}
