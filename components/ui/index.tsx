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

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'display' | 'displayMedium';
/** Larger iPhone text sizes are respected, but only up to 130%, so headers and buttons never break apart. */
export const MAX_FONT_SCALE = 1.3;

export function Text({ weight = 'regular', size = 15, color = C.text, style, ...rest }: TextProps & { weight?: Weight; size?: number; color?: string }) {
  // the display serif sets tighter and a touch smaller on the line
  const display = weight === 'display' || weight === 'displayMedium';
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...rest} style={[{ fontFamily: FONT[weight], fontSize: size, color, lineHeight: Math.round(size * (display ? 1.12 : 1.35)), ...(display ? { letterSpacing: -0.3 } : null) }, style]} />;
}

/** A tiny uppercase label above a heading. */
export function Eyebrow({ children, color = C.brandDark, style }: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text weight="semibold" size={11} color={color} style={[{ textTransform: 'uppercase', letterSpacing: 1.8 }, style]}>{children}</Text>;
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
  arrow,
  style,
}: {
  label: string;
  onPress?: () => void;
  /** primary: espresso pill; accent: the gold pill (use rarely); outline / ghost / danger */
  variant?: 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** a small gold circle with an arrow at the right end (the main call to action of a screen) */
  arrow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'primary' ? C.ink : variant === 'accent' ? C.brand : variant === 'danger' ? C.red : 'transparent';
  const fg = variant === 'primary' ? C.ivory : variant === 'accent' ? C.onBrand : variant === 'danger' ? C.white : variant === 'outline' ? C.text : C.brandDark;
  // a button that is only busy keeps its colour and its words (with a spinner); a disabled one goes soft grey
  const off = Boolean(disabled) && !loading;
  const busy = Boolean(loading);
  const solid = variant === 'primary' || variant === 'accent' || variant === 'danger';
  const dim = off && solid;
  const height = small ? 42 : 56;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={off || busy}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          minHeight: height,
          paddingLeft: arrow && !small ? S.xl : small ? S.lg : S.xl,
          paddingRight: arrow && !small ? 8 : small ? S.lg : S.xl,
          borderRadius: R.pill,
          backgroundColor: dim ? '#E7E1D8' : bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variant === 'outline' ? 'rgba(26,20,16,0.18)' : 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: arrow && !small ? 'space-between' : 'center',
          gap: S.sm,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        solid && !dim ? shadowSm : null,
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        {busy ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={dim ? '#A39A90' : fg} /> : null}
        <Text weight="semibold" size={small ? 14 : 16} color={dim ? '#A39A90' : fg} style={{ letterSpacing: 0.2 }}>{label}</Text>
      </View>
      {arrow && !small ? (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dim ? '#D9D2C7' : variant === 'accent' ? C.ink : C.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-forward" size={19} color={variant === 'accent' ? C.ivory : C.onBrand} />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * A bezel card: a thin tray (paper-tinted, hairline edge) holding a white core with its own soft shadow, so it reads as a
 * machined plate rather than a box on a page. `style` styles the white core.
 */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={{ backgroundColor: C.shell, borderRadius: R.xl + 4, padding: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
      <View style={[{ backgroundColor: C.white, borderRadius: R.xl, padding: S.lg }, shadowSm, style]}>{children}</View>
    </View>
  );
}

export function Chip({ label, active, onPress, style, textStyle }: { label: string; active?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[
        { paddingHorizontal: 16, height: 38, borderRadius: R.pill, justifyContent: 'center', backgroundColor: active ? C.ink : C.white, borderWidth: 1, borderColor: active ? C.ink : C.line },
        style,
      ]}
    >
      <Text weight="semibold" size={14} color={active ? C.ivory : C.body} style={textStyle}>{label}</Text>
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
      <Ionicons name={name} size={compact ? 18 : 22} color={C.ivory} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.ink, borderRadius: R.pill, height: h }}>
      {btn('remove', onMinus)}
      <Text weight="bold" size={compact ? 15 : 17} color={C.ivory} style={{ minWidth: 26, textAlign: 'center' }}>{value}</Text>
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
  scrollRef,
  onScrollY,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  full?: boolean;
  /** lets the sheet's content be scrolled from outside (for example to the section that still needs a choice) */
  scrollRef?: React.RefObject<ScrollView | null>;
  /** reports how far the content has been scrolled (the item sheet uses it to pin the item's name in the header) */
  onScrollY?: (y: number) => void;
}) {
  const insets = useSafeAreaInsets();
  // The sheet is lifted above the keyboard by the KeyboardAvoidingView below. The inner scroll view must NOT also add keyboard space
  // (automaticallyAdjustKeyboardInsets): doing both squeezed a short form (the zip code box) out of view.
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <View
          style={{
            backgroundColor: C.white,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            maxHeight: full ? '94%' : '88%',
            height: full ? '94%' : undefined,
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
          <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" onScroll={onScrollY ? (e) => onScrollY(e.nativeEvent.contentOffset.y) : undefined} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xl }}>
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
