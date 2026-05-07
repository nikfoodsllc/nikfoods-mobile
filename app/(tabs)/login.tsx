import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { authStore } from '../authStore';

const API_BASE = 'https://www.nikfoods.com/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!password.trim()) { setError('Please enter your password'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Invalid email or password');
        setLoading(false);
        return;
      }
      await authStore.login(data.data.user, data.data.token, data.data.refreshToken);

try {
  const addrRes = await fetch(`${API_BASE}/address`, {
    headers: { Authorization: `Bearer ${data.data.token}` },
  });
  const addrData = await addrRes.json();
  const addresses = addrData.data?.items || [];
  const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0];

  if (defaultAddr?.postal_code) {
    const { checkZipcode } = await import('../zipcodeStore');
    await checkZipcode(defaultAddr.postal_code);
    router.replace('/(tabs)');
  } else {
    router.replace('/(tabs)/serviceability');
  }
} catch (e) {
  router.replace('/(tabs)');
}
    } catch (e) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.logoSection}>
  <Image source={require('../../assets/images/nikfoods-logo.png')} style={styles.logoImage} resizeMode="contain" />
  <Text style={styles.tagline}>Authentic Indian food</Text>
</View>

      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput style={[styles.input, styles.passwordInput]} placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
            <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Sign in</Text>}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleBtn}>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{"Don't have an account? "}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/signup')}>
          <Text style={styles.footerLink}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFF8F3', padding: 24, justifyContent: 'center' },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoImage: { width: 180, height: 60, marginBottom: 8 },
  tagline: { fontSize: 14, color: '#888', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: '#E8E8E4' },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: '#FFCCCC' },
  errorText: { color: '#CC3300', fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passwordInput: { flex: 1 },
  showBtn: { padding: 12 },
  showBtnText: { fontSize: 13, color: '#E07B39', fontWeight: '500' },
  forgotText: { fontSize: 13, color: '#E07B39', fontWeight: '500', textAlign: 'right', marginBottom: 20 },
  loginBtn: { backgroundColor: '#E07B39', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  loginBtnDisabled: { backgroundColor: '#ccc' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: '#E0D8D0' },
  dividerText: { fontSize: 13, color: '#888' },
  googleBtn: { borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  googleBtnText: { fontSize: 15, color: '#333', fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#888' },
  footerLink: { fontSize: 14, color: '#E07B39', fontWeight: '600' },
});