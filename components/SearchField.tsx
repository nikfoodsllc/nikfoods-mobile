import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '@/constants/theme';

/** The search box used on the menu and on Orders. */
export default function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, height: 46, paddingHorizontal: S.md, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }}>
      <Ionicons name="search" size={18} color={C.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        maxFontSizeMultiplier={1.3}
        style={{ flex: 1, minWidth: 0, fontSize: 16, color: C.text, paddingVertical: 0 }}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={20} color={C.faint} />
        </Pressable>
      )}
    </View>
  );
}
