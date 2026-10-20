import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleProp,
  Text as RNText,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT, R, S, shadowSm } from '@/constants/theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';
export function Text({ weight = 'regular', size = 15, color = C.text, style, ...rest }: TextProps & { weight?: Weight; size?: number; color?: string }) {
  return <RNText {...rest} style={[{ fontFamily: FONT[weight], fontSize: size, color, lineHeight: Math.round(size * 1.35) }, style]} />;
}

export const tap = () => {
  if (Platform.OS === 'ios') void Haptics.selectionAsync().catch(() => {});
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  small,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'primary' ? C.brand : variant === 'danger' ? C.red : 'transparent';
  const fg = variant === 'primary' ? C.onBrand : variant === 'danger' ? C.white : variant === 'outline' ? C.text : C.brandDark;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={off}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          minHeight: small ? 40 : 52,
          paddingHorizontal: small ? S.lg : S.xl,
          borderRadius: R.md,
          backgroundColor: off && variant === 'primary' ? '#E5E7EB' : bg,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: C.line,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: S.sm,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={off && variant === 'primary' ? '#9CA3AF' : fg} /> : null}
      {!loading && <Text weight="semibold" size={small ? 14 : 16} color={off && variant === 'primary' ? '#9CA3AF' : fg}>{label}</Text>}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: S.lg }, shadowSm, style]}>{children}</View>;
}

export function Chip({ label, active, onPress, style, textStyle }: { label: string; active?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[
        { paddingHorizontal: 16, height: 38, borderRadius: R.pill, justifyContent: 'center', backgroundColor: active ? C.brand : C.surface, borderWidth: 1, borderColor: active ? C.brand : C.line },
        style,
      ]}
    >
      <Text weight="semibold" size={14} color={active ? C.onBrand : C.body} style={textStyle}>{label}</Text>
    </Pressable>
  );
}

export function VegDot({ veg, size = 16 }: { veg?: boolean; size?: number }) {
  const color = veg === false ? '#DC2626' : '#16A34A';
  return (
    <View style={{ width: size, height: size, borderRadius: 3, borderWidth: 1.5, borderColor: color, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.5, height: size * 0.5, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: C.line }, style]} />;
}

export function Stepper({ value, onMinus, onPlus, plusDisabled, compact }: { value: number; onMinus: () => void; onPlus: () => void; plusDisabled?: boolean; compact?: boolean }) {
  const h = compact ? 36 : 44;
  const btn = (name: 'remove' | 'add', onPress: () => void, disabled?: boolean) => (
    <Pressable
      hitSlop={6}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityLabel={name === 'add' ? 'Add one' : 'Remove one'}
      style={{ width: h, height: h, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}
    >
      <Ionicons name={name} size={compact ? 18 : 22} color={C.onBrand} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.brand, borderRadius: R.md, height: h }}>
      {btn('remove', onMinus)}
      <Text weight="bold" size={compact ? 15 : 17} color={C.onBrand} style={{ minWidth: 26, textAlign: 'center' }}>{value}</Text>
      {btn('add', onPlus, plusDisabled)}
    </View>
  );
}

/** Bottom sheet that covers most of the screen (phones) with a header, scrolling body and a pinned footer. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  full,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  full?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <View
          style={{
            backgroundColor: C.white,
            borderTopLeftRadius: R.xl,
            borderTopRightRadius: R.xl,
            maxHeight: full ? '94%' : '88%',
            minHeight: full ? '94%' : undefined,
            paddingBottom: footer ? 0 : insets.bottom,
            overflow: 'hidden',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, paddingVertical: S.md }}>
            <Text weight="bold" size={19} style={{ flex: 1 }} numberOfLines={1}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color={C.text} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xl }}>
            {children}
          </ScrollView>
          {footer ? (
            <View style={{ borderTopWidth: 1, borderTopColor: C.line, padding: S.lg, paddingBottom: Math.max(insets.bottom, S.lg), backgroundColor: C.white }}>{footer}</View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <SafeAreaView edges={['top']} style={[{ flex: 1, backgroundColor: C.bg }, style]}>{children}</SafeAreaView>;
}

export function Money({ value, ...rest }: { value: number } & Omit<React.ComponentProps<typeof Text>, 'children'>) {
  return <Text {...rest}>{`$${(Number(value) || 0).toFixed(2)}`}</Text>;
}
