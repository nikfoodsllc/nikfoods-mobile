import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { authStore } from '../authStore';

const API_BASE = 'https://www.nikfoods.com/api';

// Field must be outside SignupScreen to prevent remounting on every keystroke
const Field = ({ label, fieldKey, children, required, errors, fieldRefs }: any) => (
  <View
    style={styles.field}
    ref={(ref) => { fieldRefs.current[fieldKey] = ref; }}
  >
    <Text style={styles.label}>
      {label}{required && <Text style={styles.required}> *</Text>}
    </Text>
    {children}
    {errors[fieldKey] ? <Text style={styles.fieldError}>{errors[fieldKey]}</Text> : null}
  </View>
);

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const fieldRefs = useRef<Record<string, any>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{1,3}$/;
      if (!emailRegex.test(email.trim())) newErrors.email = 'Please enter a valid email address';
    }
    if (phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) newErrors.phone = 'Please enter a 10-digit phone number';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Password must contain at least one number';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    return newErrors;
  };

  const handleSignup = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0];
      const ref = fieldRefs.current[firstErrorField];
      if (ref) {
        ref.measureLayout(
          scrollRef.current,
          (_x: number, y: number) => {
            scrollRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      }
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.replace(/\D/g, ''),
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({ general: data.error || 'Signup failed. Please try again.' });
        setLoading(false);
        return;
      }
      await authStore.login(data.data.user, data.data.token, data.data.refreshToken);
      router.replace('/(tabs)/serviceability');
    } catch (e) {
      setErrors({ general: 'Something went wrong. Please try again.' });
      setLoading(false);
    }
  };

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join the NikFoods family</Text>
      </View>

      <View style={styles.card}>
        {errors.general ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errors.general}</Text>
          </View>
        ) : null}

        <Field label="Full name" fieldKey="name" required errors={errors} fieldRefs={fieldRefs}>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Enter your full name"
            value={name}
            onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: '' })); }}
            autoCapitalize="words"
          />
        </Field>

        <Field label="Email" fieldKey="email" required errors={errors} fieldRefs={fieldRefs}>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="Enter your email"
            value={email}
            onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>

        <Field label="Phone number (optional)" fieldKey="phone" errors={errors} fieldRefs={fieldRefs}>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            placeholder="10-digit phone number"
            value={phone}
            onChangeText={t => { setPhone(t); setErrors(e => ({ ...e, phone: '' })); }}
            keyboardType="phone-pad"
          />
        </Field>

        <Field label="Password" fieldKey="password" required errors={errors} fieldRefs={fieldRefs}>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={password}
              onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </Field>

        <Field label="Confirm password" fieldKey="confirmPassword" required errors={errors} fieldRefs={fieldRefs}>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); setErrors(e => ({ ...e, confirmPassword: '' })); }}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.showBtn} onPress={() => setShowConfirm(!showConfirm)}>
              <Text style={styles.showBtnText}>{showConfirm ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </Field>

        <View style={styles.termsRow}>
          <Text style={styles.termsText}>
            By creating an account you agree to our{' '}
            <Text style={styles.termsLink} onPress={() => Linking.openURL('https://www.nikfoods.com/terms')}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.termsLink} onPress={() => Linking.openURL('https://www.nikfoods.com/privacy')}>
              Privacy Policy
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.signupBtn, loading && styles.signupBtnDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signupBtnText}>Create account</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/login')}>
          <Text style={styles.footerLink}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFF8F3', padding: 24 },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#888' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: '#E8E8E4' },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: '#FFCCCC' },
  errorText: { color: '#CC3300', fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  required: { color: '#E07B39' },
  input: { backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A' },
  inputError: { borderColor: '#CC3300' },
  fieldError: { color: '#CC3300', fontSize: 12, marginTop: 4 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passwordInput: { flex: 1 },
  showBtn: { padding: 12 },
  showBtnText: { fontSize: 13, color: '#E07B39', fontWeight: '500' },
  signupBtn: { backgroundColor: '#E07B39', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  signupBtnDisabled: { backgroundColor: '#ccc' },
  signupBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#888' },
  footerLink: { fontSize: 14, color: '#E07B39', fontWeight: '600' },
  termsRow: { marginTop: 8, marginBottom: 4 },
  termsText: { fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#E07B39', fontWeight: '500' },
});