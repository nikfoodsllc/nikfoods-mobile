import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import AuthShell from '@/components/AuthShell';
import Field from '@/components/Field';
import { Button, Text } from '@/components/ui';
import { C } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }
      if (!data.data?.user) {
        setError('Invalid response from server. Please try again.');
        return;
      }
      login({ ...data.data.user, isCompleted: data.data.user.isCompleted ?? false }, data.data.token, data.data.refreshToken);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to check out and see your orders">
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
      <Field label="Password" value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
      {!!error && (
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: C.redBg, marginBottom: 16 }}>
          <Text size={14} color={C.red}>{error}</Text>
        </View>
      )}
      <Button label="Log in" onPress={submit} loading={busy} />
      <Pressable onPress={() => router.push('/forgot-password')} style={{ alignItems: 'center', paddingVertical: 18 }}>
        <Text weight="semibold" size={15} color={C.brandDark}>Forgot password?</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <Text size={15} color={C.muted}>New here?</Text>
        <Pressable onPress={() => router.replace('/signup')}>
          <Text weight="bold" size={15} color={C.brandDark}>Create an account</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
