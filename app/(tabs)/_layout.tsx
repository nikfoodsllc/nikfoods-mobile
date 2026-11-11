import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT, TAB_BAR_GAP, TAB_BAR_HEIGHT } from '@/constants/theme';
import ChatFab from '@/components/ChatFab';
import { useCart } from '@/contexts/CartContext';
import { emitTabPress } from '@/lib/tabScroll';

/** Four tabs in a floating glass pill: Home, Menu, Cart, Profile. */
export default function TabLayout() {
  const { itemCount } = useCart();
  const insets = useSafeAreaInsets();
  const tab = (name: string, title: string, icon: keyof typeof Ionicons.glyphMap, iconOn: keyof typeof Ionicons.glyphMap, badge?: number) => (
    <Tabs.Screen
      name={name}
      // pressing a tab also takes you to the top of its page
      listeners={{ tabPress: () => emitTabPress(name) }}
      options={{
        title,
        tabBarBadge: badge && badge > 0 ? badge : undefined,
        tabBarBadgeStyle: { backgroundColor: C.ink, color: C.ivory, fontFamily: FONT.bold, fontSize: 11 },
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? iconOn : icon} size={23} color={color} />,
      }}
    />
  );
  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        // the inactive icons and names must stay readable over anything behind the bar (C.faint was too pale on a translucent bar)
        tabBarInactiveTintColor: '#6B6259',
        tabBarLabelStyle: { fontFamily: FONT.semibold, fontSize: 11, letterSpacing: 0.2 },
        tabBarAllowFontScaling: false,
        tabBarItemStyle: { paddingTop: 6 },
        // a pill that floats above the home indicator; the screens keep their content clear of it
        tabBarStyle: {
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: Math.max(insets.bottom, 8) + TAB_BAR_GAP - 8,
          height: TAB_BAR_HEIGHT,
          borderRadius: TAB_BAR_HEIGHT / 2,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowColor: '#3B2A14',
          shadowOpacity: 0.22,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 12 },
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR_HEIGHT / 2, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,40,15,0.2)' }]}>
            <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
            {/* almost solid, so the cart bar or a photo behind it never washes the tabs out */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(252,250,246,0.96)' }]} />
          </View>
        ),
      }}
    >
      {tab('index', 'Home', 'home-outline', 'home')}
      {tab('menu', 'Menu', 'restaurant-outline', 'restaurant')}
      {tab('cart', 'Cart', 'bag-outline', 'bag', itemCount)}
      {tab('account', 'Profile', 'person-outline', 'person')}
    </Tabs>
    <ChatFab />
    </>
  );
}
