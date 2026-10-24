import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, TAB_BAR_GAP, TAB_BAR_HEIGHT, shadow } from '@/constants/theme';

/** Height an action bar takes (button + its padding + the gap above the tab bar): add it to a screen's bottom padding next to useTabBarSpace(). */
export const ACTION_BAR_SPACE = 92;

/**
 * A sticky bottom button (Checkout, Pay, Add address) that floats just ABOVE the floating tab bar, so the tab bar never hides it.
 * Screens that use it must leave room: bottom padding = useTabBarSpace() + ACTION_BAR_SPACE.
 */
export default function ActionBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8) + TAB_BAR_GAP - 8 + TAB_BAR_HEIGHT + 10;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom }}>
      <View style={[{ padding: 10, borderRadius: 34, backgroundColor: C.white }, shadow]}>{children}</View>
    </View>
  );
}
