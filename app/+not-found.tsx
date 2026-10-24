import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { C } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.bg }}>
        <Text weight="bold" size={22}>Page not found</Text>
        <Link href="/" style={{ marginTop: 16 }}>
          <Text weight="semibold" color={C.brandDark}>Back to the menu</Text>
        </Link>
      </View>
    </>
  );
}
