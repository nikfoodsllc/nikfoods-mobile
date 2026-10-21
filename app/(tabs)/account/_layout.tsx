import { Stack } from 'expo-router';
import { C } from '@/constants/theme';

// The Orders screens live here (Profile > Orders); a link that opens an order directly still has the Profile screen underneath.
export const unstable_settings = { initialRouteName: 'index' };

// Each tab has its own stack, so a screen opened from it (an order, the addresses, checkout) keeps the bottom tab bar on screen.
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }} />;
}
