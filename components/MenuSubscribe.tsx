import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/components/Toast';
import { Button, Card, Text, tap } from '@/components/ui';
import { C, R } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

// The same card as the website's home page (MenuSubscriptionSection): the same words, the same checks and the same calls
// (/api/menu-subscriptions/check and /subscribe), so a person who subscribes in the app is on the same list.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MenuSubscribe() {
  const { user } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [checking, setChecking] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // a signed-in customer starts with their own email, and is told when it is already on the list
  useEffect(() => {
    let live = true;
    (async () => {
      if (user?.email) {
        setEmail(user.email);
        try {
          const response = await fetch(`/api/menu-subscriptions/check?email=${encodeURIComponent(user.email)}`);
          const data = await response.json();
          if (live && data.subscribed) setSubscribed(true);
        } catch {
          // the form simply stays; subscribing again is answered with "already subscribed"
        }
      }
      if (live) setChecking(false);
    })();
    return () => {
      live = false;
    };
  }, [user?.email]);

  const submit = async () => {
    setError('');
    const address = email.trim();
    if (!EMAIL.test(address)) return setError('Invalid email address');
    if (!consent) return setError('You must agree to subscribe to the mailing list');
    setLoading(true);
    try {
      const token = user ? localStorage.getItem('token') || '' : '';
      const response = await fetch('/api/menu-subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ email: address, consentGiven: consent }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        toast('Successfully subscribed to menu notifications!', 'success');
        setSubscribed(true);
      } else if (response.status === 409) {
        setError('This email is already subscribed');
        setSubscribed(true);
      } else {
        const message = data.error || 'Failed to subscribe. Please try again.';
        setError(message);
        toast(data.error || 'Failed to subscribe', 'error');
      }
    } catch {
      setError('Network error. Please try again.');
      toast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Card style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.brand} />
      </Card>
    );
  }

  if (subscribed) {
    return (
      <Card style={{ alignItems: 'center', gap: 4 }}>
        <Text weight="bold" size={18} style={{ textAlign: 'center' }}>{user ? "You're already subscribed!" : 'Thank you for subscribing!'}</Text>
        <Text size={14} color={C.muted} style={{ textAlign: 'center' }}>You will receive notifications when our menus are uploaded.</Text>
      </Card>
    );
  }

  return (
    <Card style={{ gap: 10, padding: 14 }}>
      <Text weight="bold" size={16} style={{ textAlign: 'center' }}>Get notified as soon as our menu&apos;s are uploaded</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
        <TextInput
          testID="subscribe-email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError('');
          }}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          accessibilityLabel="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={submit}
          style={{ flex: 1, height: 46, borderRadius: R.md, borderWidth: 1.5, borderColor: error && !/agree/i.test(error) ? C.red : C.line, backgroundColor: C.white, paddingHorizontal: 12, fontSize: 16, color: C.text }}
        />
        <Button label="Subscribe" onPress={submit} loading={loading} small />
      </View>
      {error && !/agree/i.test(error) ? <Text size={13} color={C.red}>{error}</Text> : null}
      <Pressable
        testID="subscribe-consent"
        onPress={() => {
          tap();
          setConsent((v) => !v);
          setError('');
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}
        hitSlop={8}
        style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
      >
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: consent ? C.brand : '#D1D5DB', backgroundColor: consent ? C.brand : C.white, alignItems: 'center', justifyContent: 'center' }}>
          {consent && <Ionicons name="checkmark" size={15} color={C.onBrand} />}
        </View>
        <Text size={13} style={{ flex: 1 }}>I want to subscribe to your mailing list.</Text>
      </Pressable>
      {error && /agree/i.test(error) ? <Text size={13} color={C.red}>{error}</Text> : null}
    </Card>
  );
}
