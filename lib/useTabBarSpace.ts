import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_GAP, TAB_BAR_HEIGHT } from '@/constants/theme';

/** How much room the floating tab bar takes at the bottom: add it as bottom padding so nothing is hidden behind it. `withCartBar` adds the cart bar above it. */
export function useTabBarSpace(withCartBar = false): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 8) + TAB_BAR_GAP - 8 + TAB_BAR_HEIGHT + 24 + (withCartBar ? 68 : 0);
}
