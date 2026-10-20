import React, { useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, FONT, R, S } from '@/constants/theme';
import { Text } from '@/components/ui';

/** Label above the box, error below it (no placeholder-as-label). */
export default function Field({ label, error, secure, right, ...rest }: TextInputProps & { label: string; error?: string; secure?: boolean; right?: React.ReactNode }) {
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ marginBottom: S.lg }}>
      <Text weight="semibold" size={14} color={C.body} style={{ marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 54, borderRadius: R.md, borderWidth: 1.5, borderColor: error ? C.red : focus ? C.brand : C.line, backgroundColor: C.white, paddingHorizontal: S.lg }}>
        <TextInput
          autoCorrect={false}
          spellCheck={false}
          maxFontSizeMultiplier={1.3}
          {...rest}
          secureTextEntry={secure ? hidden : false}
          onFocus={(e) => {
            setFocus(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={C.faint}
          style={{ flex: 1, fontFamily: FONT.medium, fontSize: 17, color: C.text, height: '100%' }}
          accessibilityLabel={label}
          testID={rest.testID ?? `field-${label}`}
        />
        {secure ? (
          <Pressable hitSlop={10} onPress={() => setHidden((h) => !h)} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={C.muted} />
          </Pressable>
        ) : (
          right
        )}
      </View>
      {!!error && <Text size={13} color={C.red} style={{ marginTop: 6 }}>{error}</Text>}
    </View>
  );
}
