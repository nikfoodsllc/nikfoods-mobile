import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { C, R, S, shadow } from '@/constants/theme';
import { Button, Stepper, Text, VegDot } from '@/components/ui';

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
  width,
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
  width: number;
}) {
  const off = !available || closed;
  return (
    <View style={[{ width, backgroundColor: C.white, borderRadius: R.xl, padding: S.md, alignItems: 'center' }, shadow]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, details`} style={{ alignItems: 'center', alignSelf: 'stretch' }}>
        <View style={{ width: width - S.md * 2 - 24, aspectRatio: 1, borderRadius: 999, overflow: 'hidden', backgroundColor: C.surface }}>
          <Image source={imageUrl ? { uri: imageUrl } : undefined} style={{ width: '100%', height: '100%', opacity: off ? 0.45 : 1 }} contentFit="cover" transition={150} />
        </View>
        <Text weight="semibold" size={14} style={{ marginTop: S.md, textAlign: 'center', minHeight: 38 }} numberOfLines={2}>{name}</Text>
        {price != null && (
          <Text weight="bold" size={16} color={C.brandDark} style={{ marginTop: 2 }}>
            {starting ? 'From ' : ''}${price.toFixed(2)}
          </Text>
        )}
      </Pressable>
      <View pointerEvents="none" style={{ position: 'absolute', top: S.md + 4, left: S.md + 4 }}>
        <VegDot veg={veg} size={16} />
      </View>
      {inCartCount > 0 && customizable && (
        <View pointerEvents="none" style={{ position: 'absolute', top: S.md, right: S.md, minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Text weight="bold" size={12} color={C.onBrand}>{inCartCount}</Text>
        </View>
      )}
      <View style={{ marginTop: S.sm, height: 40, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
        {off ? (
          <Text weight="medium" size={13} color={C.faint}>{closed ? 'Ordering closed' : 'Unavailable'}</Text>
        ) : quantity > 0 ? (
          <Stepper compact value={quantity} onMinus={onDecrement} onPlus={onIncrement} />
        ) : (
          <Button small label={customizable && inCartCount > 0 ? 'Add more' : 'Add'} onPress={onAdd} style={{ alignSelf: 'stretch', minHeight: 40 }} />
        )}
      </View>
    </View>
  );
}
