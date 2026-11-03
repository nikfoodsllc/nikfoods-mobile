import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { allergenInfo, cleanAllergens, type AllergenKey } from '@/lib/allergens';
import { Text } from '@/components/ui';
import { useToast } from '@/components/Toast';

const EMOJI: Partial<Record<AllergenKey, string>> = {
  milk: '\u{1F95B}',
  eggs: '\u{1F95A}',
  fish: '\u{1F41F}',
  shellfish: '\u{1F990}',
  tree_nuts: '\u{1F330}',
  peanuts: '\u{1F95C}',
  gluten: '\u{1F33E}',
};

/** Soy, sesame and mustard have no emoji: filled seed drawings in the same look (same as the website). */
function Seeds({ k, size }: { k: 'soy' | 'sesame' | 'mustard'; size: number }) {
  if (k === 'soy')
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {[
          [8, 9],
          [16, 9.5],
          [12, 16],
        ].map(([cx, cy], i) => (
          <G key={i}>
            <Ellipse cx={cx} cy={cy} rx={4.6} ry={4.1} fill="#D9C98A" stroke="#8C7A33" strokeWidth={1.2} />
            <Ellipse cx={cx - 1.2} cy={cy - 1.3} rx={1.3} ry={0.8} fill="#F1E6B8" />
            <Circle cx={cx + 1.6} cy={cy + 1.2} r={0.8} fill="#6B5B20" />
          </G>
        ))}
      </Svg>
    );
  if (k === 'sesame')
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {[
          [7, 8, -30],
          [16, 7, 25],
          [9, 16, 20],
          [17, 16, -25],
        ].map(([x, y, r], i) => (
          <G key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
            <Path d="M0 -4.2C2.6 -1.8 3.2 1.8 0 4.2C-3.2 1.8 -2.6 -1.8 0 -4.2Z" fill="#F4E8C8" stroke="#9A8250" strokeWidth={1.2} strokeLinejoin="round" />
            <Path d="M0 -2.2V2.4" stroke="#D4BF8C" strokeWidth={0.9} strokeLinecap="round" />
          </G>
        ))}
      </Svg>
    );
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {[
        [8, 8, 3.2],
        [16, 7.5, 3],
        [12, 14.5, 3.4],
        [5.5, 16.5, 2.4],
        [18.5, 16, 2.6],
      ].map(([cx, cy, r], i) => (
        <G key={i}>
          <Circle cx={cx} cy={cy} r={r} fill="#E3A81B" stroke="#8A6410" strokeWidth={1.2} />
          <Circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.28} fill="#F8DC8A" />
        </G>
      ))}
    </Svg>
  );
}

/** One allergen as a round badge. Tap it to read what it is ("Contains milk (dairy)"). */
export function AllergenBadge({ allergen, size = 18 }: { allergen: AllergenKey; size?: number }) {
  const toast = useToast();
  const info = allergenInfo(allergen);
  if (!info) return null;
  const box = size + 10;
  const emoji = EMOJI[allergen];
  return (
    <Pressable
      onPress={() => toast(info.description, 'info')}
      hitSlop={6}
      accessibilityRole="image"
      accessibilityLabel={info.description}
      style={{ width: box, height: box, borderRadius: box / 2, backgroundColor: info.bg, borderWidth: 1, borderColor: `${info.color}33`, alignItems: 'center', justifyContent: 'center' }}
    >
      {emoji ? <Text style={{ fontSize: size * 0.95, lineHeight: size * 1.15, includeFontPadding: false }}>{emoji}</Text> : <Seeds k={allergen as 'soy' | 'sesame' | 'mustard'} size={Math.round(size * 1.12)} />}
    </Pressable>
  );
}

/** The badges of a dish in the standard order; nothing for a dish with no allergens. */
export default function AllergenBadges({ allergens, size = 16, gap = 5 }: { allergens?: unknown; size?: number; gap?: number }) {
  const list = cleanAllergens(allergens);
  if (list.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap }}>
      {list.map((k) => (
        <AllergenBadge key={k} allergen={k} size={size} />
      ))}
    </View>
  );
}
