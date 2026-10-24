import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import AuthShell from '@/components/AuthShell';
import Field from '@/components/Field';
import { useToast } from '@/components/Toast';
import { Button, Text } from '@/components/ui';
import { C } from '@/constants/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const post = async (path: string, body: object) => {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  };

  const sendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await post('/api/auth/forgot-password', { email: email.trim() });
      if (!r.ok) setError(r.data.error || 'Could not send the code. Try again.');
      else setStep(2);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (otp.trim().length < 4) {
      setError('Enter the code from your email');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await post('/api/auth/verify-otp', { email: email.trim(), otp: otp.trim() });
      if (!r.ok) setError(r.data.error || 'That code is not right');
      else {
        setResetToken(r.data.resetToken);
        setStep(3);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (password.length < 8) return setError('At least 8 characters');
    if (new TextEncoder().encode(password).length > 72) return setError('Password is too long');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    setError('');
    try {
      const r = await post('/api/auth/reset-password', { token: resetToken, password });
      if (!r.ok) setError(r.data.error || 'Could not reset the password');
      else {
        toast('Password updated. Log in.');
        router.replace('/login');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={step === 1 ? 'Reset password' : step === 2 ? 'Check your email' : 'New password'} subtitle={step === 1 ? 'We email you a code' : step === 2 ? `We sent a code to ${email.trim()}` : undefined}>
      {step === 1 && <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" onSubmitEditing={sendCode} />}
      {step === 2 && <Field label="Code" value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" onSubmitEditing={verify} />}
      {step === 3 && (
        <>
          <Field label="New password" value={password} onChangeText={setPassword} secure autoCapitalize="none" textContentType="newPassword" />
          <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secure autoCapitalize="none" textContentType="newPassword" />
        </>
      )}
      {!!error && (
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: C.redBg, marginBottom: 16 }}>
          <Text size={14} color={C.red}>{error}</Text>
        </View>
      )}
      <Button label={step === 1 ? 'Send code' : step === 2 ? 'Verify' : 'Save password'} onPress={step === 1 ? sendCode : step === 2 ? verify : reset} loading={busy} />
      {step === 2 && (
        <Pressable onPress={sendCode} style={{ alignItems: 'center', paddingVertical: 18 }}>
          <Text weight="semibold" size={15} color={C.brandDark}>Send a new code</Text>
        </Pressable>
      )}
    </AuthShell>
  );
}
