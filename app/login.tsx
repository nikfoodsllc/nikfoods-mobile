import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import AuthShell from '@/components/AuthShell';
import Field from '@/components/Field';
import { Button, Text } from '@/components/ui';
import { C } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { lockSupport } from '@/lib/biometrics';
import { isFaceIdSignInOn, rememberFaceIdOfferDeclined, signInWithFaceId, turnOnFaceIdSignIn, wasFaceIdOfferDeclined } from '@/lib/deviceLogin';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [faceId, setFaceId] = useState<string | null>(null); // 'Face ID' / 'Touch ID' when signing in with it is turned on
  const triedFaceId = useRef(false);

  const finish = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const startFaceId = useCallback(async () => {
    setBusy(true);
    setError('');
    const out = await signInWithFaceId();
    setBusy(false);
    if (out.ok) {
      login({ ...out.result.user, isCompleted: out.result.user.isCompleted ?? false }, out.result.token, out.result.refreshToken);
      finish();
    } else if (out.reason === 'expired') {
      setFaceId(null);
      setError('Please log in with your password once.');
    } else if (out.reason === 'network') {
      setError('Network error. Please try again.');
    }
  }, [login, finish]);

  // Face ID sign-in is turned on for this phone: offer it right away, once
  useEffect(() => {
    (async () => {
      if (!isFaceIdSignInOn()) return;
      const support = await lockSupport();
      if (!support.available) return;
      setFaceId(support.label);
      if (!triedFaceId.current) {
        triedFaceId.current = true;
        void startFaceId();
      }
    })();
  }, [startFaceId]);

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
      finish();
      // once, after a password sign-in: offer Face ID for next time
      if (!isFaceIdSignInOn() && !wasFaceIdOfferDeclined()) {
        const support = await lockSupport();
        if (support.available) {
          Alert.alert(`Sign in with ${support.label}?`, undefined, [
            { text: 'Not now', style: 'cancel', onPress: rememberFaceIdOfferDeclined },
            { text: 'Turn on', onPress: () => void turnOnFaceIdSignIn(Device.deviceName ?? 'iPhone') },
          ]);
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome, to the world of authentic food." subtitle="Log in to check out and see your orders">
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
      <Field label="Password" value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
      {!!error && (
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: C.redBg, marginBottom: 16 }}>
          <Text size={14} color={C.red}>{error}</Text>
        </View>
      )}
      {faceId && <Button label={`Sign in with ${faceId}`} onPress={() => void startFaceId()} loading={busy} style={{ marginBottom: 12 }} />}
      <Button label="Log in" onPress={submit} loading={busy} variant={faceId ? 'outline' : undefined} />
      <Pressable onPress={() => router.push('/forgot-password')} style={{ alignItems: 'center', paddingVertical: 18 }}>
        <Text weight="semibold" size={15} color={C.brandDark}>Forgot password?</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
        <Text size={18} color={C.muted}>New here?</Text>
        <Pressable onPress={() => router.replace('/signup')} hitSlop={10} accessibilityRole="button">
          <Text weight="bold" size={18} color={C.brandDark}>Create an account</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
