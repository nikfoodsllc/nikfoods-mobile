import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, ScrollView as ScrollViewType, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { authStore } from '../authStore';

const API_BASE = 'https://www.nikfoods.com/api';

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptSMS, setAcceptSMS] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollViewType>(null);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  };

  const validateEmail = (e: string) => {
  const email = e.trim().toLowerCase();

  // Must have exactly one @
  if ((email.match(/@/g) || []).length !== 1) return false;

  const [local, domain] = email.split('@');

  // Local part checks
  if (!local || local.startsWith('.') || local.endsWith('.')) return false;
  if (local.includes('..')) return false;

  // Domain checks
  if (!domain || domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.startsWith('-') || domain.endsWith('-')) return false;
  if (domain.includes('..')) return false;
  if (!domain.includes('.')) return false;

  // Get TLD (part after last dot)
  const parts = domain.split('.');
  const tld = parts[parts.length - 1];
  const secondLevel = parts[parts.length - 2] || '';

  // TLD must be 2-3 letters only
  if (!/^[a-z]{2,3}$/.test(tld)) return false;

  // Block common typos explicitly
  const blockedTlds = ['comm', 'nett', 'orgg', 'ccom', 'ocm', 'coм'];
  if (blockedTlds.includes(tld)) return false;

  // Second level domain must be at least 2 chars
  if (secondLevel.length < 2) return false;

  // Overall format
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,3}$/.test(email);
};

  const validatePhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    return digits.length === 10;
  };

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'Password must contain at least one special character';
    return null;
  };

  const validateName = (name: string) => {
    if (name.trim().length < 2) return false;
    if (/^[a-zA-Z]\.?$/.test(name.trim())) return false;
    return true;
  };

  const handleSignup = async () => {
    setError('');
    if (!validateName(firstName)) { showError('Please enter your full first name (not initials)'); return; }
    if (!validateName(lastName)) { showError('Please enter your full last name (not initials)'); return; }
    if (!email.trim()) { showError('Please enter your email'); return; }
    if (!validateEmail(email)) { showError('Please enter a valid email address'); return; }
    if (!phone.trim()) { showError('Please enter your phone number'); return; }
    if (!validatePhone(phone)) { showError('Please enter a valid 10-digit phone number'); return; }
    const pwdError = validatePassword(password);
    if (pwdError) { showError(pwdError); return; }
    if (password !== confirmPassword) { showError('Passwords do not match'); return; }
    if (!acceptPrivacy) { showError('Please accept the Privacy Policy and Terms of Service to continue'); return; }
    if (!acceptSMS) { showError('Please consent to receive order notifications to continue'); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        showError(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }
      await authStore.login(data.data.user, data.data.token, data.data.refreshToken);
      router.replace('/(tabs)');
    } catch (e) {
      showError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const PasswordStrength = () => {
    if (!password) return null;
    const checks = [
      { label: '8+ chars', pass: password.length >= 8 },
      { label: 'Uppercase', pass: /[A-Z]/.test(password) },
      { label: 'Lowercase', pass: /[a-z]/.test(password) },
      { label: 'Number', pass: /[0-9]/.test(password) },
      { label: 'Special char', pass: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
    return (
      <View style={styles.strengthRow}>
        {checks.map(c => (
          <View key={c.label} style={[styles.strengthChip, c.pass && styles.strengthChipPass]}>
            <Text style={[styles.strengthChipText, c.pass && styles.strengthChipTextPass]}>{c.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const Checkbox = ({ value, onPress, label }: { value: boolean; onPress: () => void; label: string }) => (
    <TouchableOpacity style={styles.checkboxRow} onPress={onPress}>
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value && <Text style={styles.checkmark}>{'✓'}</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const FieldLabel = ({ label, required }: { label: string; required?: boolean }) => (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required && <Text style={styles.required}>*</Text>}
    </View>
  );

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoSection}>
        <Image source={require('../../assets/images/nikfoods-logo.png')} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.tagline}>Home-Style Indian Food, Welcome In</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Sign up</Text>
        <Text style={styles.requiredNote}>{'Fields marked with * are required'}</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.nameRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <FieldLabel label="First name" required />
            <TextInput
              style={styles.input}
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <FieldLabel label="Last name" required />
            <TextInput
              style={styles.input}
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.field}>
          <FieldLabel label="Email" required />
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {email.length > 0 && !validateEmail(email) && (
            <Text style={styles.fieldHint}>Please enter a valid email address</Text>
          )}
        </View>

        <View style={styles.field}>
          <FieldLabel label="Phone number" required />
          <TextInput
            style={styles.input}
            placeholder="10-digit phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={14}
          />
          {phone.length > 0 && !validatePhone(phone) && (
            <Text style={styles.fieldHint}>Please enter a valid 10-digit phone number</Text>
          )}
        </View>

        <View style={styles.field}>
          <FieldLabel label="Password" required />
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <PasswordStrength />
        </View>

        <View style={styles.field}>
          <FieldLabel label="Confirm password" required />
          <TextInput
            style={styles.input}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={styles.fieldHint}>Passwords do not match</Text>
          )}
        </View>

        <View style={styles.checkboxSection}>
          <Checkbox
            value={acceptPrivacy}
            onPress={() => setAcceptPrivacy(!acceptPrivacy)}
            label="I accept the Privacy Policy and Terms of Service *"
          />
          <Checkbox
            value={acceptSMS}
            onPress={() => setAcceptSMS(!acceptSMS)}
            label="I consent to receive order notifications via SMS and email *"
          />
        </View>

        <TouchableOpacity
          style={[styles.signupBtn, loading && styles.signupBtnDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signupBtnText}>Create account</Text>}
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
  logoSection: { alignItems: 'center', marginVertical: 24 },
  logoImage: { width: 180, height: 60, marginBottom: 8 },
  tagline: { fontSize: 14, color: '#888', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: '#E8E8E4' },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  requiredNote: { fontSize: 12, color: '#888', marginBottom: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF0F0', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FFCCCC' },
  errorIcon: { fontSize: 16 },
  errorText: { color: '#CC3300', fontSize: 13, flex: 1, lineHeight: 20 },
  nameRow: { flexDirection: 'row', gap: 12 },
  field: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#555' },
  required: { fontSize: 13, fontWeight: '700', color: '#E07B39' },
  fieldHint: { fontSize: 11, color: '#CC3300', marginTop: 4 },
  input: { backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passwordInput: { flex: 1 },
  showBtn: { padding: 12 },
  showBtnText: { fontSize: 13, color: '#E07B39', fontWeight: '500' },
  strengthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  strengthChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#F0EDE8', borderWidth: 0.5, borderColor: '#E0D8D0' },
  strengthChipPass: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  strengthChipText: { fontSize: 11, color: '#888' },
  strengthChipTextPass: { color: '#2E7D32', fontWeight: '500' },
  checkboxSection: { gap: 12, marginBottom: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#E0D8D0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: '#E07B39', borderColor: '#E07B39' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  checkboxLabel: { flex: 1, fontSize: 13, color: '#555', lineHeight: 18 },
  signupBtn: { backgroundColor: '#E07B39', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  signupBtnDisabled: { backgroundColor: '#ccc' },
  signupBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: '#E0D8D0' },
  dividerText: { fontSize: 13, color: '#888' },
  googleBtn: { borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  googleBtnText: { fontSize: 15, color: '#333', fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 40 },
  footerText: { fontSize: 14, color: '#888' },
  footerLink: { fontSize: 14, color: '#E07B39', fontWeight: '600' },
});