import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '@/constants/theme';
import { Sheet, Text, tap } from '@/components/ui';
import { ALLERGENS } from '@/lib/allergens';
import { useEcoPreselect, useSkipAllergens } from '@/lib/menuPrefs';
import { AllergenBadge } from '@/components/AllergenBadges';

/**
 * The two choices that sit next to "Veg only" on the menu screens: "Eco containers" (a switch) and "Skip allergens" (opens a list).
 * Same behaviour as the website's header.
 */
export default function MenuFilters() {
  const [eco, setEco] = useEcoPreselect();
  const [skip, setSkip] = useSkipAllergens();
  const [open, setOpen] = useState(false);
  const active = skip.length > 0;
  const toggle = (key: string) => setSkip(skip.includes(key) ? skip.filter((k) => k !== key) : [...skip, key]);
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Text weight="semibold" size={14} color={C.body} maxFontSizeMultiplier={1.1}>Eco containers</Text>
          <Switch value={eco} onValueChange={(v) => { tap(); setEco(v); }} trackColor={{ true: C.green, false: '#E4DED5' }} ios_backgroundColor="#E4DED5" accessibilityLabel="Eco containers" />
        </View>
        <Pressable
          onPress={() => { tap(); setOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={active ? `Skip allergens, ${skip.length} chosen` : 'Skip allergens'}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: active ? '#FEF3C7' : C.white, borderWidth: 1, borderColor: active ? '#B45309' : C.line }}
        >
          <Ionicons name="warning-outline" size={18} color={active ? '#B45309' : C.body} />
          <Text weight="semibold" size={14} color={active ? '#B45309' : C.body} maxFontSizeMultiplier={1.1}>
            Skip allergens{active ? ` (${skip.length})` : ''}
          </Text>
        </Pressable>
      </View>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Skip dishes with">
        {ALLERGENS.map((a) => {
          const on = skip.includes(a.key);
          return (
            <Pressable
              key={a.key}
              onPress={() => { tap(); toggle(a.key); }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={a.label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 52, borderBottomWidth: 1, borderBottomColor: C.line }}
            >
              <AllergenBadge allergen={a.key} size={20} />
              <Text weight="medium" size={16} style={{ flex: 1 }}>{a.label}</Text>
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: on ? '#B45309' : '#C9C0B4', backgroundColor: on ? '#B45309' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            </Pressable>
          );
        })}
        {active && (
          <Pressable onPress={() => setSkip([])} accessibilityRole="button" style={{ paddingVertical: S.md }}>
            <Text weight="semibold" size={15} color="#B45309" style={{ textDecorationLine: 'underline' }}>Clear</Text>
          </Pressable>
        )}
      </Sheet>
    </>
  );
}
