import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT } from '@/constants/theme';
import { Text } from '@/components/ui';
import { useCart } from '@/contexts/CartContext';

export default function TabLayout() {
  const { itemCount } = useCart();
  const insets = useSafeAreaInsets();
  const tab = (name: string, title: string, icon: keyof typeof Ionicons.glyphMap, iconOn: keyof typeof Ionicons.glyphMap, badge?: number) => (
    <Tabs.Screen
      name={name}
      options={{
        title,
        tabBarBadge: badge && badge > 0 ? badge : undefined,
        tabBarBadgeStyle: { backgroundColor: C.brand, color: C.onBrand, fontFamily: FONT.bold, fontSize: 11 },
        tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? iconOn : icon} size={size + 1} color={color} />,
      }}
    />
  );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontFamily: FONT.semibold, fontSize: 11 },
        // 54 points of bar plus whatever the phone needs below (a home indicator), so a phone without one does not waste space
        tabBarStyle: { backgroundColor: C.white, borderTopColor: C.line, height: 54 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 6) },
        tabBarAllowFontScaling: false,
      }}
    >
      {tab('index', 'Menu', 'restaurant-outline', 'restaurant')}
      {tab('cart', 'Cart', 'bag-outline', 'bag', itemCount)}
      {tab('orders', 'Orders', 'receipt-outline', 'receipt')}
      {tab('account', 'Account', 'person-outline', 'person')}
    </Tabs>
  );
}
