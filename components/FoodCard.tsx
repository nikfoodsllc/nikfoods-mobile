import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { C, R, S, shadow } from '@/constants/theme';
import { Button, Stepper, Text, VegDot } from '@/components/ui';

const IMAGE = 84;

/**
 * One dish as a full-width row: a small round photo, the whole name (up to three lines, so a combo's day is never cut off),
 * the price, and Add / the quantity stepper on the same line. About five dishes fit on a screen instead of two.
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
  onPress: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const off = !available || closed;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.white, borderRadius: R.xl, padding: S.md }, shadow]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, details`} style={{ width: IMAGE, height: IMAGE }}>
        <View style={{ width: IMAGE, height: IMAGE, borderRadius: IMAGE / 2, overflow: 'hidden', backgroundColor: C.surface }}>
          <Image source={imageUrl ? { uri: imageUrl } : undefined} style={{ width: '100%', height: '100%', opacity: off ? 0.45 : 1 }} contentFit="cover" transition={150} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0 }}>
          <VegDot veg={veg} size={16} />
        </View>
        {inCartCount > 0 && customizable && (
          <View pointerEvents="none" style={{ position: 'absolute', top: -2, right: -2, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
            <Text weight="bold" size={12} color={C.onBrand}>{inCartCount}</Text>
          </View>
        )}
      </Pressable>

      <View style={{ flex: 1, gap: 6 }}>
        <Pressable onPress={onPress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text weight="semibold" size={15} numberOfLines={3}>{name}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm, minHeight: 40 }}>
          {price != null ? (
            <Text weight="bold" size={16} color={C.brandDark} style={{ flexShrink: 1 }}>
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
            <Button small label={customizable && inCartCount > 0 ? 'Add more' : 'Add'} onPress={onAdd} style={{ minWidth: 84 }} />
          )}
        </View>
      </View>
    </View>
  );
}
