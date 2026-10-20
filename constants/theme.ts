/** Design tokens: the website's colours, Inter type, big rounded cards with soft shadows. */
import { Platform } from 'react-native';
import { colors } from '@/theme/colors';

export const C = {
  brand: colors.primary, // #f89c35
  brandLight: colors.primaryLight,
  brandDark: colors.primaryDark,
  cream: '#FFF8EC',
  creamLine: '#F6E3C1',
  bg: '#FFFFFF',
  surface: '#F7F7F8',
  text: '#111827',
  body: '#374151',
  muted: '#6B7280',
  faint: '#9CA3AF',
  line: '#EDEDED',
  green: '#16A34A',
  greenBg: '#F0FDF4',
  greenLine: '#BBF7D0',
  red: '#DC2626',
  redBg: '#FEF2F2',
  amberBg: '#FFFBEB',
  white: '#FFFFFF',
  /** text on the orange: dark ink reads far better than white (white on #f89c35 is only about 2:1) */
  onBrand: '#2A1700',
};

export const R = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const FONT = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 3 },
}) as object;

export const shadowSm = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  default: { elevation: 1 },
}) as object;
