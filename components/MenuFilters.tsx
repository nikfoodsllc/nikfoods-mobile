import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, shadowSm } from '@/constants/theme';
import { Sheet, Text, tap } from '@/components/ui';
import { ALLERGENS } from '@/lib/allergens';
import { useEcoPreselect, useSkipAllergens } from '@/lib/menuPrefs';
import { AllergenBadge } from '@/components/AllergenBadges';

const AMBER = '#B45309';

/**
 * One quiet round button (next to the search box, or in a screen's header) that opens the menu preferences:
 * "Eco containers" (a switch) and "Skip dishes with" (the allergen list). A small gold dot on the button shows that something is on.
 * Same behaviour as the website's header controls, without taking room from the menu.
 */
export default function MenuFilterButton({ size = 50 }: { size?: number }) {
  const [eco, setEco] = useEcoPreselect();
  const [skip, setSkip] = useSkipAllergens();
  const [open, setOpen] = useState(false);
  const count = skip.length + (eco ? 1 : 0);
  const toggle = (key: string) => setSkip(skip.includes(key) ? skip.filter((k) => k !== key) : [...skip, key]);
  return (
    <>
      <Pressable
        onPress={() => { tap(); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={count > 0 ? `Menu preferences, ${count} on` : 'Menu preferences'}
        style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }, shadowSm]}
      >
        <Ionicons name="options-outline" size={Math.round(size * 0.44)} color={C.ink} />
        {count > 0 && (
          <View style={{ position: 'absolute', top: size * 0.12, right: size * 0.12, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.white }}>
            <Text weight="bold" size={10} color={C.ink} maxFontSizeMultiplier={1}>{count}</Text>
          </View>
        )}
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Menu preferences">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <Text weight="semibold" size={16}>Eco containers</Text>
          <Switch value={eco} onValueChange={(v) => { tap(); setEco(v); }} trackColor={{ true: C.green, false: '#E4DED5' }} ios_backgroundColor="#E4DED5" accessibilityLabel="Eco containers" />
        </View>
        <Text weight="semibold" size={13} color={C.muted} style={{ marginTop: S.lg, marginBottom: 2, letterSpacing: 1, textTransform: 'uppercase' }}>Skip dishes with</Text>
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
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: on ? AMBER : '#C9C0B4', backgroundColor: on ? AMBER : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            </Pressable>
          );
        })}
        {skip.length > 0 && (
          <Pressable onPress={() => setSkip([])} accessibilityRole="button" style={{ paddingVertical: S.md }}>
            <Text weight="semibold" size={15} color={AMBER} style={{ textDecorationLine: 'underline' }}>Clear</Text>
          </Pressable>
        )}
      </Sheet>
    </>
  );
}
