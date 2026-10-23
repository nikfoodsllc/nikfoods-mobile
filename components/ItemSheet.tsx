import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '@/constants/theme';
import { Button, Text, VegDot, tap } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { FoodItem, ComboSection } from '@/types/food';
import { SpiceLevel } from '@/types/cart';
import { CartCustomizations } from '@/types/localCart';
import { formatSpiceLevel, normalizeSpiceLevelKey } from '@/utils/formatters';
import { comboNeedsOverallSpice, getSectionSpice, pruneSectionSpice, sectionOwnsSpice, sectionsMissingSpice, withSectionSpice } from '@/lib/comboSpice';
import { comboItemQuantity } from '@/lib/comboQuantity';
import ItemGallery from '@/components/ItemGallery';

const SPICE_DOTS: Record<string, number> = {
  mild: 1, 'mild (kid friendly)': 1, normal: 2, medium: 3, 'medium spice': 3, 'semi-spicy': 4, 'semi spicy': 4, spicy: 4, 'super-spicy': 5, 'super spicy': 5, 'extra spicy': 5, hot: 5,
};
const DOT_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

/** The website's rule for which combo options start selected. */
export function comboDefaults(item: FoodItem): Record<string, string[]> {
  const defaults: Record<string, string[]> = {};
  for (const section of item.sections ?? []) {
    if (!section?._id || !Array.isArray(section.selectedItems)) continue;
    const defaultItems = section.selectedItems.filter((i) => i.isDefault);
    const multi = !section.isRequired || (section.maxSelection !== undefined && section.maxSelection > 1);
    if (multi) {
      if (defaultItems.length > 0) defaults[section._id] = defaultItems.map((i) => i._id);
      else if (section.isRequired && section.minSelection && section.minSelection > 0) defaults[section._id] = section.selectedItems.slice(0, section.minSelection).map((i) => i._id);
      else defaults[section._id] = [];
    } else if (defaultItems.length >= 1 && defaultItems[0]._id) defaults[section._id] = [defaultItems[0]._id];
    else if (section.selectedItems.length > 0 && section.selectedItems[0]._id) defaults[section._id] = [section.selectedItems[0]._id];
  }
  return defaults;
}

function sectionHint(s: ComboSection): string {
  if (!s.isRequired) return `Optional, up to ${s.maxSelection || s.selectedItems.length}`;
  const min = s.minSelection || 1;
  const max = s.maxSelection || 1;
  return min === max ? (max === 1 ? 'Choose 1' : `Choose ${max}`) : `Choose ${min} to ${max}`;
}

function Row({ selected, multi, onPress, children, right }: { selected: boolean; multi: boolean; onPress: () => void; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 52, paddingVertical: S.sm, paddingHorizontal: S.md, borderRadius: R.md, borderWidth: 1.5, borderColor: selected ? C.brand : C.line, backgroundColor: selected ? C.cream : C.white, marginBottom: S.sm }}
    >
      <View style={{ width: 22, height: 22, borderRadius: multi ? 6 : 11, borderWidth: 2, borderColor: selected ? C.brand : '#D1D5DB', backgroundColor: selected ? C.brand : C.white, alignItems: 'center', justifyContent: 'center' }}>
        {selected && <Ionicons name="checkmark" size={14} color={C.onBrand} />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
      {right}
    </Pressable>
  );
}

export default function ItemSheet({
  item,
  onClose,
  onAdd,
  closedLabel,
  withQuantity = false,
}: {
  item: FoodItem | null;
  onClose: () => void;
  /** Called with what the customer picked. Return nothing. */
  onAdd: (item: FoodItem, customizations: CartCustomizations, quantity: number) => void;
  /** set when ordering for the chosen day is closed */
  closedLabel?: string;
  /** show the quantity stepper (the dish goes straight to its delivery day); without it the days and quantities are chosen next */
  withQuantity?: boolean;
}) {
  const toast = useToast();
  const [portion, setPortion] = useState(0);
  const [spice, setSpice] = useState('');
  const [eco, setEco] = useState(false);
  const [combo, setCombo] = useState<Record<string, string[]>>({});
  // what still needs a choice: the button names it, and pressing it scrolls to it
  const scrollRef = useRef<ScrollView>(null);
  // once the name has scrolled out of sight it moves into the sheet's top bar, so you always see which dish you are choosing for
  const [pinned, setPinned] = useState(false);
  const [qty, setQty] = useState(1);
  const insets = useSafeAreaInsets();
  const sectionY = useRef<Record<string, number>>({});
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => {
    if (!item) return;
    setShowMissing(false);
    setPinned(false);
    setQty(1);
    sectionY.current = {};
    setPortion(0);
    setSpice('');
    setEco(false);
    setCombo(comboDefaults(item));
  }, [item]);

  const price = useMemo(() => {
    if (!item) return 0;
    const base = item.portions?.length && item.portionPrices?.length ? item.portionPrices[portion] ?? item.price : item.price;
    return base + (eco && item.ecoContainerCharge ? item.ecoContainerCharge : 0);
  }, [item, portion, eco]);

  if (!item) return null;

  const spiceLevels = item.spiceLevel?.length ? item.spiceLevel : ['mild', 'normal', 'medium', 'Semi-Spicy', 'Super-Spicy'];
  const overallSpice = comboNeedsOverallSpice(item);
  const needSpice = Boolean(overallSpice && !spice.trim());
  // sections whose spice level the customer picks on its own
  const missingSpiceSection = sectionsMissingSpice(item, combo)[0];
  const missingSection = item.hasCombo ? item.sections?.find((s) => s.minSelection && (combo[s._id] ?? []).length < s.minSelection) : undefined;
  const missing = needSpice ? { key: 'spice', label: 'Choose a spice level' } : missingSection ? { key: missingSection._id, label: `Choose ${missingSection.title}` } : missingSpiceSection ? { key: missingSpiceSection._id, label: `Choose spice for ${missingSpiceSection.title}` } : null;
  const goToMissing = () => {
    if (!missing) return;
    setShowMissing(true);
    // a combo section's position is inside the combo block, so the block's own position is added
    const base = missing.key === 'spice' ? 0 : sectionY.current.__combo ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(base + (sectionY.current[missing.key] ?? 0) - 12, 0), animated: true });
  };

  const pick = (section: ComboSection, id: string) => {
    const multi = !section.isRequired || (section.maxSelection !== undefined && section.maxSelection > 1);
    setCombo((prev) => {
      const cur = prev[section._id] ?? [];
      if (!multi) return { ...prev, [section._id]: [id] };
      if (cur.includes(id)) {
        if (section.minSelection && cur.length - 1 < section.minSelection) return prev;
        return { ...prev, [section._id]: cur.filter((x) => x !== id) };
      }
      if (section.maxSelection && cur.length >= section.maxSelection) return prev;
      return { ...prev, [section._id]: [...cur, id] };
    });
  };

  const submit = () => {
    if (overallSpice && !spice.trim()) {
      toast('Choose a spice level', 'error');
      return;
    }
    if (missingSpiceSection) {
      toast(`Choose spice for ${missingSpiceSection.title}`, 'error');
      return;
    }
    if (item.hasCombo && item.sections) {
      for (const section of item.sections) {
        const count = (combo[section._id] ?? []).length;
        if (section.minSelection && count < section.minSelection) {
          toast(`${section.title}: choose at least ${section.minSelection}`, 'error');
          return;
        }
        if (section.maxSelection && count > section.maxSelection) {
          toast(`${section.title}: choose up to ${section.maxSelection}`, 'error');
          return;
        }
      }
    }
    const hasPortion = Boolean(item.portions?.[portion]);
    onAdd(item, {
      selectedPortion: item.portions?.[portion] || '',
      selectedPortionPrice: hasPortion ? item.portionPrices?.[portion] : undefined,
      selectedSpiceLevel: spice as SpiceLevel,
      isEcoFriendlyContainer: eco,
      ecoContainerCharge: eco ? item.ecoContainerCharge : undefined,
      comboSelections: pruneSectionSpice(item.sections, combo),
    }, withQuantity ? qty : 1);
  };

  const total = price * (withQuantity ? qty : 1);
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
    // (the insets come from the app's root: a Modal is a separate window and cannot measure them itself)
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* the page's top bar: close, and the dish's name once it has scrolled out of sight (so you always know what you are choosing for) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.sm, minHeight: 56 }}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }}>
          <Ionicons name="close" size={22} color={C.ink} />
        </Pressable>
        <Text weight="bold" size={17} numberOfLines={1} style={{ flex: 1, opacity: pinned ? 1 : 0 }}>{item.name}</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setPinned((was) => (was ? y > 250 : y > 290));
        }}
        contentContainerStyle={{ paddingHorizontal: S.xl, paddingBottom: 130 + insets.bottom }}
      >
      <View style={{ alignItems: 'center' }}>
        {/* the dish's photos: page through them, + opens one full screen to zoom */}
        <ItemGallery name={item.name} images={item.images && item.images.length > 1 ? item.images : item.url ? [item.url] : []} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, marginTop: S.lg }}>
        <View style={{ paddingTop: 11 }}><VegDot veg={item.veg} size={18} /></View>
        <Text weight="display" size={36} style={{ flex: 1, lineHeight: 38 }}>{item.name}</Text>
      </View>
      <Text weight="bold" size={19} color={C.brandDark} style={{ marginTop: 6 }}>
        {item.portions?.length ? 'From ' : ''}${Number(item.portions?.length && item.portionPrices?.length ? item.portionPrices[0] : item.price).toFixed(2)}
      </Text>
      {!!item.description && <Text size={15} color={C.body} style={{ marginTop: S.md, lineHeight: 22 }}>{item.description}</Text>}

      {!!item.portions?.length && !!item.portionPrices?.length && (
        <View style={{ marginTop: S.xl }}>
          <Text weight="bold" size={16} style={{ marginBottom: S.sm }}>Size</Text>
          {item.portions.map((p, i) => (
            <Row key={p} selected={portion === i} multi={false} onPress={() => setPortion(i)} right={<Text weight="semibold" size={15}>${Number(item.portionPrices?.[i] ?? item.price).toFixed(2)}</Text>}>
              <Text weight="medium" size={15}>{p}</Text>
            </Row>
          ))}
        </View>
      )}

      {overallSpice && (
        <View style={{ marginTop: S.xl }} onLayout={(e) => { sectionY.current.spice = e.nativeEvent.layout.y; }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text weight="bold" size={16} style={{ marginBottom: S.sm }}>Spice level</Text>
            <Text size={13} weight={showMissing && needSpice ? 'bold' : 'regular'} color={C.red}>{showMissing && needSpice ? 'Pick one' : 'Required'}</Text>
          </View>
          {spiceLevels.map((level) => {
            const dots = SPICE_DOTS[normalizeSpiceLevelKey(level)] ?? 0;
            return (
              <Row key={level} selected={spice === level} multi={false} onPress={() => setSpice(level)} right={
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {Array.from({ length: dots }).map((_, i) => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT_COLORS[i] }} />)}
                </View>
              }>
                <Text weight="medium" size={15}>{formatSpiceLevel(level)}</Text>
              </Row>
            );
          })}
        </View>
      )}

      {item.isEcoFriendlyContainer && (
        <View style={{ marginTop: S.xl }}>
          <Row selected={eco} multi onPress={() => setEco((v) => !v)} right={item.ecoContainerCharge ? <Text weight="semibold" size={15} color={C.brandDark}>+${item.ecoContainerCharge.toFixed(2)}</Text> : undefined}>
            <Text weight="medium" size={15}>Eco-friendly container</Text>
          </Row>
        </View>
      )}

      {item.hasCombo && !!item.sections?.length && (
        <View style={{ marginTop: S.xl }} onLayout={(e) => { sectionY.current.__combo = e.nativeEvent.layout.y; }}>
          <Text weight="bold" size={18} style={{ marginBottom: S.sm }}>Build your combo</Text>
          {item.sections.map((section) => {
            const multi = !section.isRequired || (section.maxSelection !== undefined && section.maxSelection > 1);
            const chosen = combo[section._id] ?? [];
            return (
              <View key={section._id} style={{ marginBottom: S.lg }} onLayout={(e) => { sectionY.current[section._id] = e.nativeEvent.layout.y; }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: S.sm }}>
                  <Text weight="semibold" size={15}>{section.title}</Text>
                  <Text size={13} weight={showMissing && missingSection?._id === section._id ? 'bold' : 'regular'} color={showMissing && missingSection?._id === section._id ? C.red : C.muted}>{sectionHint(section)}</Text>
                </View>
                {section.selectedItems.map((si) => (
                  <Row
                    key={si._id}
                    selected={chosen.includes(si._id)}
                    multi={multi}
                    onPress={() => pick(section, si._id)}
                    right={si.price > 0 ? <Text weight="semibold" size={14} color={C.brandDark}>+${si.price.toFixed(2)}</Text> : undefined}
                  >
                    <Text weight="medium" size={15}>
                      {si.item.name}
                      {si.portion ? <Text size={13} color={C.muted}>{`  ${si.portion}`}</Text> : null}
                      {comboItemQuantity(si.quantity) > 1 ? <Text size={13} color={C.muted}>{`  x ${comboItemQuantity(si.quantity)}`}</Text> : null}
                    </Text>
                  </Row>
                ))}
                {item.hasSpiceLevel && sectionOwnsSpice(section) && chosen.length > 0 && (
                  <View style={{ marginTop: S.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: S.xs }}>
                      <Text weight="semibold" size={14}>Spice level</Text>
                      <Text size={13} weight={showMissing && missingSpiceSection?._id === section._id ? 'bold' : 'regular'} color={C.red}>{showMissing && missingSpiceSection?._id === section._id ? 'Pick one' : 'Required'}</Text>
                    </View>
                    {spiceLevels.map((level) => {
                      const dots = SPICE_DOTS[normalizeSpiceLevelKey(level)] ?? 0;
                      return (
                        <Row key={level} selected={getSectionSpice(combo, section._id) === level} multi={false} onPress={() => setCombo((prev) => withSectionSpice(prev, section._id, level))} right={
                          <View style={{ flexDirection: 'row', gap: 3 }}>
                            {Array.from({ length: dots }).map((_, i) => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT_COLORS[i] }} />)}
                          </View>
                        }>
                          <Text weight="medium" size={15}>{formatSpiceLevel(level)}</Text>
                        </Row>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
      </ScrollView>
      {/* the bottom bar: quantity (day-wise dishes) and the add button, always in reach */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: Math.max(insets.bottom, S.lg), backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        {withQuantity && !closedLabel && (
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white }}>
            <Pressable onPress={() => { tap(); setQty((q) => Math.max(1, q - 1)); }} hitSlop={6} accessibilityRole="button" accessibilityLabel="Less" style={{ width: 48, height: 56, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="remove" size={22} color={qty <= 1 ? C.faint : C.ink} />
            </Pressable>
            <Text weight="bold" size={18} style={{ minWidth: 26, textAlign: 'center' }}>{qty}</Text>
            <Pressable onPress={() => { tap(); setQty((q) => Math.min(20, q + 1)); }} hitSlop={6} accessibilityRole="button" accessibilityLabel="More" style={{ width: 48, height: 56, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={22} color={C.ink} />
            </Pressable>
          </View>
        )}
        <View style={{ flex: 1 }}>
          {closedLabel ? (
            <Button label={closedLabel} disabled onPress={() => {}} />
          ) : missing ? (
            <Button label={missing.label} onPress={goToMissing} />
          ) : (
            <Button label={`Add  ·  $${total.toFixed(2)}`} onPress={submit} />
          )}
        </View>
      </View>
    </View>
    </Modal>
  );
}
