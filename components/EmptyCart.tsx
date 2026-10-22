import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { Button, Text } from '@/components/ui';
import { C, S } from '@/constants/theme';

const INK = '#3B1F0E'; // the drawing's outline: the brand's deep brown

/** A samosa with a face, standing on a soft blob; it bobs gently (still when the phone asks for less motion). */
function Samosa() {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withSequence(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) })), -1);
  }, [reduce, t]);
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: -10 * t.value }] }));
  const shadow = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 - 0.14 * t.value }], opacity: 1 - 0.25 * t.value }));
  return (
    <View style={{ width: 240, height: 250, alignItems: 'center' }}>
      <Svg width={240} height={250} viewBox="0 0 240 250" style={{ position: 'absolute' }}>
        <Path d="M42 120C34 70 74 22 128 28c52 6 86 46 70 98-12 40-52 66-96 62C62 184 48 158 42 120Z" fill="#F6F0E6" />
      </Svg>
      <Animated.View style={[{ position: 'absolute', bottom: 14, width: 120, height: 14, alignItems: 'center' }, shadow]}>
        <Svg width={120} height={14} viewBox="0 0 120 14">
          <Ellipse cx={60} cy={7} rx={52} ry={6} fill="#D8CFC4" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 18 }, body]}>
        <Svg width={240} height={210} viewBox="0 0 240 210">
          {/* legs and feet */}
          <Path d="M98 160v26M142 160v26" stroke={INK} strokeWidth={5} strokeLinecap="round" />
          <Ellipse cx={92} cy={189} rx={11} ry={5} fill={INK} />
          <Ellipse cx={148} cy={189} rx={11} ry={5} fill={INK} />
          {/* arms */}
          <Path d="M66 128c-16 4-22 16-16 26" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
          <Path d="M174 128c16 4 22 16 16 26" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
          {/* the samosa */}
          <Path d="M120 22 L192 160 Q194 168 184 168 H56 Q46 168 48 160 Z" fill="#E9AE55" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          <Path d="M120 22 L192 160 Q194 168 184 168 H138 Z" fill="#CF8B2E" opacity={0.55} />
          {/* the crimped edge */}
          <G stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.55}>
            <Path d="M134 56l6-3M142 72l6-3M150 88l6-3M158 104l6-3M166 120l6-3M174 136l6-3" />
          </G>
          {/* face */}
          <Circle cx={104} cy={112} r={4.5} fill={INK} />
          <Circle cx={138} cy={112} r={4.5} fill={INK} />
          <Path d="M113 126q8 6 16 0" stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Ellipse cx={93} cy={124} rx={7} ry={4.5} fill="#E0705A" opacity={0.45} />
          <Ellipse cx={149} cy={124} rx={7} ry={4.5} fill="#E0705A" opacity={0.45} />
          {/* a little steam */}
          <Path d="M112 12q-5-6 0-11M126 10q5-6 0-11" stroke="#C9BFB2" strokeWidth={3} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** The cart with nothing in it: a friendly samosa, two short lines and one way forward. */
export default function EmptyCart({ onOrder }: { onOrder: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xxl, gap: S.sm }}>
      <Samosa />
      <Text weight="display" size={38} style={{ marginTop: S.md, textAlign: 'center' }}>Your cart is empty</Text>
      <Text size={16} color={C.muted} style={{ textAlign: 'center' }}>It&apos;s lonely in here.</Text>
      <Button label="Order now" onPress={onOrder} style={{ marginTop: S.lg, alignSelf: 'stretch' }} />
    </View>
  );
}
