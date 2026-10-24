import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { C, R, S, shadowSm } from '@/constants/theme';
import { Stepper, Text, VegDot, tap } from '@/components/ui';

const IMAGE = 92;

/**
 * One dish: a soft white card with a rounded-square photo, the whole name (up to three lines, so a combo's day is never cut off),
 * the price in gold, and a round Add button (or the quantity stepper) at the end.
 */
export default function FoodCard({
  name,
  imageUrl,
  price,
  starting,
  veg,
  available = true,
  quantity,
  inCartCount,
  customizable,
  closed,
  note,
  onPress,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  name: string;
  imageUrl?: string;
  price: number | null;
  starting?: boolean;
  veg?: boolean;
  available?: boolean;
  quantity: number;
  inCartCount: number;
  customizable: boolean;
  closed?: boolean;
  /** a small line under the name, e.g. the delivery day (Chef's Pick row) */
  note?: string;
  onPress: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const off = !available || closed;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.white, borderRadius: R.xl, padding: S.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line }, shadowSm]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, details`} style={{ width: IMAGE, height: IMAGE }}>
        <View style={{ width: IMAGE, height: IMAGE, borderRadius: 24, overflow: 'hidden', backgroundColor: C.surface }}>
          <Image source={imageUrl ? { uri: imageUrl } : undefined} style={{ width: '100%', height: '100%', opacity: off ? 0.45 : 1 }} contentFit="cover" transition={200} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', top: 6, left: 6 }}>
          <VegDot veg={veg} size={16} />
        </View>
        {inCartCount > 0 && customizable && (
          <View pointerEvents="none" style={{ position: 'absolute', top: -3, right: -3, minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white }}>
            <Text weight="bold" size={12} color={C.ivory}>{inCartCount}</Text>
          </View>
        )}
      </Pressable>

      <View style={{ flex: 1, gap: 8 }}>
        <Pressable onPress={onPress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text weight="semibold" size={16} numberOfLines={3} style={{ color: C.text }}>{name}</Text>
          {note ? <Text weight="medium" size={13} color={C.muted} style={{ marginTop: 2 }}>{note}</Text> : null}
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm, minHeight: 44 }}>
          {price != null ? (
            <Text weight="semibold" size={16} color={C.brandDark} style={{ flexShrink: 1 }}>
              {starting ? 'From ' : ''}${price.toFixed(2)}
            </Text>
          ) : (
            <View />
          )}
          {off ? (
            <Text weight="medium" size={13} color={C.faint}>{closed ? 'Ordering closed' : 'Unavailable'}</Text>
          ) : quantity > 0 ? (
            <Stepper compact value={quantity} onMinus={onDecrement} onPlus={onIncrement} />
          ) : (
            <Pressable
              onPress={() => {
                tap();
                onAdd();
              }}
              accessibilityRole="button"
              accessibilityLabel={customizable && inCartCount > 0 ? 'Add more' : 'Add'}
              hitSlop={6}
              style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}
            >
              <Ionicons name="add" size={24} color={C.brand} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
