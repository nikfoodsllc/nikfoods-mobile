import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, tap } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { openStore, useUpdateAvailable } from '@/lib/appUpdate';

/** A slim bar at the top of Home when a newer version of the app is on the App Store. Tap it to update; the cross hides it for that version. */
export default function UpdateBanner() {
  const { latest, dismiss } = useUpdateAvailable();
  if (!latest) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.cream, borderWidth: 1, borderColor: C.creamLine, borderRadius: 18, paddingLeft: S.lg, paddingRight: S.sm, paddingVertical: S.sm }}>
      <Ionicons name="arrow-down-circle-outline" size={22} color={C.brandDark} />
      <Pressable onPress={() => { tap(); openStore(); }} accessibilityRole="button" accessibilityLabel="Update the app" style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
        <Text weight="semibold" size={15}>Update available</Text>
        <Text size={13} color={C.muted}>Version {latest} is ready. Tap to update.</Text>
      </Pressable>
      <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="close" size={20} color={C.muted} />
      </Pressable>
    </View>
  );
}
