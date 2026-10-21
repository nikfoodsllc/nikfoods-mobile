import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MenuBrowser from '@/components/MenuBrowser';
import { Text, tap } from '@/components/ui';
import { C, S, shadowSm } from '@/constants/theme';
import { useHomeMenu } from '@/lib/useHomeMenu';
import { useVegOnly } from '@/lib/vegOnly';

/** One category's dishes (with its day chips and sub-categories). */
export default function CategoryPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories } = useHomeMenu();
  const [vegOnly, setVegOnly] = useVegOnly();
  const name = categories.find((c) => c._id === id)?.name ?? '';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.xl, paddingTop: S.sm, paddingBottom: S.md, backgroundColor: C.bg }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate('/menu'))} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to the menu" style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }, shadowSm]}>
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text weight="display" size={30} numberOfLines={2} maxFontSizeMultiplier={1.15} style={{ flex: 1 }}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text weight="semibold" size={13} color={C.body} maxFontSizeMultiplier={1.1}>Veg</Text>
          <Switch value={vegOnly} onValueChange={(v) => { tap(); setVegOnly(v); }} trackColor={{ true: C.green, false: '#E4DED5' }} ios_backgroundColor="#E4DED5" accessibilityLabel="Veg only" />
        </View>
      </View>
      <MenuBrowser categoryId={String(id)} />
    </SafeAreaView>
  );
}
