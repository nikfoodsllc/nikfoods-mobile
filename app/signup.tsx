import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AuthShell from '@/components/AuthShell';
import Field from '@/components/Field';
import { Button, Text } from '@/components/ui';
import { C } from '@/constants/theme';
import { SITE_URL } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';

function Check({ on, onPress, children, error, testID }: { on: boolean; onPress: () => void; children: React.ReactNode; error?: boolean; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 }} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      <View testID={testID ? `${testID}-box` : undefined} style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: on ? C.brand : error ? C.red : '#D1D5DB', backgroundColor: on ? C.brand : C.white, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        {on && <Ionicons name="checkmark" size={16} color={C.onBrand} />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export default function Signup() {
  const router = useRouter();
  const { login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [notify, setNotify] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'At least 8 characters';
    else if (new TextEncoder().encode(password).length > 72) e.password = 'Password is too long';
    if (phone.trim() && phone.replace(/\D/g, '').length !== 10) e.phone = 'Enter a 10 digit phone number';
    if (!privacy) e.privacy = 'Please accept the Privacy Policy';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: `${firstName} ${lastName}`.trim(), email: email.trim(), password, phone: phone.replace(/\D/g, ''), acceptPrivacyPolicy: privacy, acceptNotifications: notify }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({ general: data.error || 'Signup failed' });
        return;
      }
      const { user, token, refreshToken } = data.data;
      login(user, token, refreshToken);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account">
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="First name" value={firstName} onChangeText={setFirstName} error={errors.firstName} autoComplete="given-name" textContentType="givenName" returnKeyType="next" /></View>
        <View style={{ flex: 1 }}><Field label="Last name" value={lastName} onChangeText={setLastName} error={errors.lastName} autoComplete="family-name" textContentType="familyName" returnKeyType="next" /></View>
      </View>
      <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Field label="Phone (optional)" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
      <Field label="Password" value={password} onChangeText={setPassword} error={errors.password} secure autoCapitalize="none" textContentType="newPassword" />
      <Check testID="accept-privacy" on={privacy} onPress={() => setPrivacy((v) => !v)} error={!!errors.privacy}>
        <Text size={14} color={C.body}>
          I accept the <Text size={14} weight="semibold" color={C.brandDark} onPress={() => Linking.openURL(`${SITE_URL}/privacy`)}>Privacy Policy</Text> and <Text size={14} weight="semibold" color={C.brandDark} onPress={() => Linking.openURL(`${SITE_URL}/terms`)}>Terms</Text>
        </Text>
        {!!errors.privacy && <Text size={13} color={C.red} style={{ marginTop: 4 }}>{errors.privacy}</Text>}
      </Check>
      <Check on={notify} onPress={() => setNotify((v) => !v)}>
        <Text size={14} color={C.body}>Send me menu and order updates</Text>
      </Check>
      {!!errors.general && (
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: C.redBg, marginBottom: 16 }}>
          <Text size={14} color={C.red}>{errors.general}</Text>
        </View>
      )}
      <Button label="Create account" onPress={submit} loading={busy} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 18 }}>
        <Text size={15} color={C.muted}>Have an account?</Text>
        <Pressable onPress={() => router.replace('/login')}>
          <Text weight="bold" size={15} color={C.brandDark}>Log in</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
