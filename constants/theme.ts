/**
 * Design tokens. Direction: editorial luxury on the NikFoods identity (gold on charcoal): warm paper background, espresso ink,
 * one refined gold, a display serif for big headings (Inter stays for everything you read or tap), nested "bezel" cards with soft
 * ambient shadows, pill buttons and a floating glass tab bar.
 */
import { Platform } from 'react-native';
import { colors } from '@/theme/colors';

export const C = {
  brand: colors.primary, // #f89c35, the NikFoods orange-gold (selected states, small highlights)
  brandLight: colors.primaryLight,
  brandDark: '#B4690E', // gold as TEXT on paper (readable)
  gold: '#C8963E', // hairlines and icons
  cream: '#FBF3E4',
  creamLine: '#F1E0BD',
  bg: '#FAF7F2', // warm paper
  surface: '#F3EEE6', // inputs, placeholders
  shell: 'rgba(60, 40, 15, 0.05)', // the outer tray of a bezel card
  ink: '#1A1410', // espresso: primary buttons and the main text
  ivory: '#FBF8F2', // text on ink
  text: '#1A1410',
  body: '#463E37',
  muted: '#857C72',
  faint: '#B2A99F',
  line: '#E8E1D6',
  green: '#16A34A',
  greenBg: '#F0FDF4',
  greenLine: '#BBF7D0',
  red: '#DC2626',
  redBg: '#FEF2F2',
  amberBg: '#FFFBEB',
  white: '#FFFFFF',
  /** text on the orange-gold: dark ink reads far better than white (white on #f89c35 is only about 2:1) */
  onBrand: '#2A1700',
};

export const R = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const FONT = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  /** big headings only (28 points and up): the serif is too fine for small sizes */
  display: 'CormorantGaramond_700Bold',
  displayMedium: 'CormorantGaramond_600SemiBold',
};

/** Soft, wide, warm-tinted: the card seems to float, never to sit under a dark smudge. */
export const shadow = Platform.select({
  ios: { shadowColor: '#3B2A14', shadowOpacity: 0.1, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } },
  default: { elevation: 4 },
}) as object;

export const shadowSm = Platform.select({
  ios: { shadowColor: '#3B2A14', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  default: { elevation: 2 },
}) as object;

/** Space the floating tab bar takes at the bottom of every tab screen (pill height + its gap), before the home-indicator inset. */
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_GAP = 10;
