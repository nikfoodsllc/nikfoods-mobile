import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { authStore } from '../authStore';

export default function AccountScreen() {
  const [user, setUser] = useState(authStore.getUser());

  useEffect(() => {
    const unsubscribe = authStore.subscribe(() => {
      setUser(authStore.getUser());
    });
    authStore.loadFromStorage();
    return unsubscribe;
  }, []);

  if (!user) {
    return (
      <View style={styles.container}>
        <Image source={require('../../assets/images/nikfoods-logo.png')} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.subtitle}>Sign in to manage your orders and account</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(tabs)/login')}>
          <Text style={styles.loginBtnText}>Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.signupBtn} onPress={() => router.push('/(tabs)/signup')}>
          <Text style={styles.signupBtnText}>Create account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/orders')}>
          <Text style={styles.menuItemText}>My orders</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/addresses')}>
          <Text style={styles.menuItemText}>Delivery addresses</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuItemText}>Notifications</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await authStore.logout(); }}>
        <Text style={styles.logoutBtnText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F3', padding: 24, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 180, height: 60, marginBottom: 16 },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  loginBtn: { backgroundColor: '#E07B39', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, marginBottom: 12, width: '100%', alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signupBtn: { borderWidth: 1, borderColor: '#E07B39', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, width: '100%', alignItems: 'center' },
  signupBtnText: { color: '#E07B39', fontSize: 16, fontWeight: '600' },
  profileCard: { alignItems: 'center', marginBottom: 32, width: '100%' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E07B39', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  email: { fontSize: 14, color: '#888' },
  menu: { width: '100%', backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#E8E8E4', marginBottom: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#F0EDE8' },
  menuItemText: { fontSize: 15, color: '#1A1A1A' },
  menuItemArrow: { fontSize: 16, color: '#888' },
  logoutBtn: { borderWidth: 1, borderColor: '#CC3300', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, width: '100%', alignItems: 'center' },
  logoutBtnText: { color: '#CC3300', fontSize: 16, fontWeight: '600' },
});