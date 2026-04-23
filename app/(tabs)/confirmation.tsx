import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ConfirmationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🎉</Text>
      <Text style={styles.title}>Order placed!</Text>
      <Text style={styles.subtitle}>Thank you for your order. You will receive a confirmation email shortly.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.btnText}>Back to menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#FAFAF8' },
  icon: { fontSize: 72, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  btn: { backgroundColor: '#E07B39', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});