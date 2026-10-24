import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, useReducedMotion } from 'react-native-reanimated';

/** Content that rises into place a little after the screen appears (staggered by `index`). Still, if the phone asks for less motion. */
export default function Reveal({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  if (reduce) return <Animated.View style={style}>{children}</Animated.View>;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 70).duration(620).easing(Easing.bezier(0.32, 0.72, 0, 1))} style={style}>
      {children}
    </Animated.View>
  );
}
