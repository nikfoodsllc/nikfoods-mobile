import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_BASE = 'https://www.nikfoods.com/api';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOTP = async () => {
  if (!email.trim()) { setError('Please enter your email'); return; }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{1,3}$/;
  if (!emailRegex.test(email.trim())) { setError('Please enter a valid email address'); return; }
  setLoading(true);
  setError('');
    try {
  await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  // Always show the same message regardless of whether email exists
  setSuccess('If you have an account with us with the email provided, a verification code has been sent to your email.');
  setStep('otp');
} catch (e) {
  setError('Something went wrong. Please try again.');
} finally {
  setLoading(false);
}
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) { setError('Please enter the verification code'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid OTP'); setLoading(false); return; }
      setResetToken(data.resetToken);
      setSuccess('OTP verified! Please set your new password.');
      setStep('password');
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) { setError('Please enter a new password'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(newPassword)) { setError('Password must contain at least one uppercase letter'); return; }
    if (!/[0-9]/.test(newPassword)) { setError('Password must contain at least one number'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reset password'); setLoading(false); return; }
      setSuccess('Password reset successfully! Please sign in with your new password.');
      setTimeout(() => router.replace('/(tabs)/login'), 2000);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = {
    email: 'Forgot password',
    otp: 'Enter verification code',
    password: 'Set new password',
  };

  const stepSubtitles = {
    email: 'Enter your email and we\'ll send you a verification code',
    otp: `We sent a 6-digit code to ${email}`,
    password: 'Choose a strong password for your account',
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'email' ? router.back() : setStep(step === 'otp' ? 'email' : 'otp')}>
          <Text style={styles.backBtn}>{'← Back'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Step indicators */}
        <View style={styles.stepRow}>
          {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, step === s && styles.stepDotActive,
                (step === 'otp' && i === 0) || (step === 'password' && i <= 1) ? styles.stepDotDone : null
              ]}>
                <Text style={[styles.stepDotText,
                  step === s || (step === 'otp' && i === 0) || (step === 'password' && i <= 1) ? styles.stepDotTextActive : null
                ]}>
                  {(step === 'otp' && i === 0) || (step === 'password' && i <= 1) ? '✓' : String(i + 1)}
                </Text>
              </View>
              {i < 2 && <View style={[styles.stepLine, (step === 'otp' && i === 0) || (step === 'password') ? styles.stepLineDone : null]} />}
            </View>
          ))}
        </View>

        <Text style={styles.title}>{stepTitles[step]}</Text>
        <Text style={styles.subtitle}>{stepSubtitles[step]}</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{'⚠️ ' + error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{'✅ ' + success}</Text>
          </View>
        ) : null}

        {/* Step 1 - Email */}
        {step === 'email' && (
          <View>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send verification code</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2 - OTP */}
        {step === 'otp' && (
          <View>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="Enter 6-digit code"
              value={otp}
              onChangeText={t => { setOtp(t); setError(''); }}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify code</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendBtn} onPress={() => { setStep('email'); setError(''); setSuccess(''); setOtp(''); }}>
              <Text style={styles.resendBtnText}>Didn't receive the code? Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3 - New Password */}
        {step === 'password' && (
          <View>
            <Text style={styles.label}>New password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={newPassword}
                onChangeText={t => { setNewPassword(t); setError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Confirm new password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChangeText={t => { setConfirmPassword(t); setError(''); }}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.showBtn} onPress={() => setShowConfirm(!showConfirm)}>
                <Text style={styles.showBtnText}>{showConfirm ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset password</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFF8F3' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 },
  backBtn: { fontSize: 15, color: '#E07B39', fontWeight: '500' },
  content: { padding: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, justifyContent: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0EDE8', borderWidth: 1.5, borderColor: '#E0D8D0', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#E07B39', borderColor: '#E07B39' },
  stepDotDone: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  stepDotText: { fontSize: 13, fontWeight: '600', color: '#888' },
  stepDotTextActive: { color: '#fff' },
  stepLine: { width: 40, height: 1.5, backgroundColor: '#E0D8D0', marginHorizontal: 4 },
  stepLineDone: { backgroundColor: '#2E7D32' },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 22, marginBottom: 28 },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFCCCC' },
  errorText: { color: '#CC3300', fontSize: 13, lineHeight: 20 },
  successBox: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#A5D6A7' },
  successText: { color: '#2E7D32', fontSize: 13, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 10, padding: 14, fontSize: 15, color: '#1A1A1A', marginBottom: 16 },
  otpInput: { fontSize: 24, textAlign: 'center', letterSpacing: 8, fontWeight: '700' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  passwordInput: { flex: 1, marginBottom: 0 },
  showBtn: { padding: 12 },
  showBtnText: { fontSize: 13, color: '#E07B39', fontWeight: '500' },
  btn: { backgroundColor: '#E07B39', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn: { paddingVertical: 14, alignItems: 'center' },
  resendBtnText: { fontSize: 13, color: '#E07B39', fontWeight: '500' },
});