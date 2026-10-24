import { Stack } from 'expo-router';
import { C } from '@/constants/theme';

// Menu tab: the categories first, then a category's dishes on top of them (the bottom tab bar stays on screen).
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }} />;
}
