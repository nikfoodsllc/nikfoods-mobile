import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/components/Toast';
import { Button, Text, tap } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

// The website's "Get notified" sign-up (MenuSubscriptionSection): the same words, the same checks and the same calls
// (/api/menu-subscriptions/check and /subscribe), so a person who subscribes in the app is on the same list.
// On a phone it starts as ONE slim row so the menu stays the first thing you see, and opens into the form when tapped.
// Someone who is already subscribed sees nothing.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same as the website: someone who is not logged in is remembered by the email they subscribed with, so the box stays away next time.
const STORAGE_KEY = 'menuSubscribedEmail';
const rememberEmail = (value: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // nothing to do: the box just shows again next time
  }
};
const rememberedEmail = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export default function MenuSubscribe() {
  const { user } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [checking, setChecking] = useState(Boolean(user?.email) || Boolean(rememberedEmail()));
  const [subscribed, setSubscribed] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // a signed-in customer starts with their own email, and is skipped when it is already on the list
  useEffect(() => {
    let live = true;
    (async () => {
      // the logged-in customer's email, or the one this phone subscribed with earlier
      if (user?.email) setEmail(user.email);
      const known = user?.email || rememberedEmail();
      if (known) {
        setChecking(true);
        try {
          const response = await fetch(`/api/menu-subscriptions/check?email=${encodeURIComponent(known)}`);
          const data = await response.json();
          if (live && data.subscribed) setSubscribed(true);
        } catch {
          // the row simply stays; subscribing again is answered with "already subscribed"
        }
      }
      if (live) setChecking(false);
    })();
    return () => {
      live = false;
    };
  }, [user?.email]);

  const toggle = () => {
    tap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
    setError('');
  };

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
        rememberEmail(address);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSubscribed(true);
      } else if (response.status === 409) {
        toast('This email is already subscribed', 'info');
        rememberEmail(address);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSubscribed(true);
      } else {
        setError(data.error || 'Failed to subscribe. Please try again.');
        toast(data.error || 'Failed to subscribe', 'error');
      }
    } catch {
      setError('Network error. Please try again.');
      toast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // nothing to show while we find out, and nothing once the email is on the list
  if (checking || subscribed) return null;

  const emailError = error && !/agree/i.test(error) ? error : '';
  const consentError = error && /agree/i.test(error) ? error : '';

  if (!open) {
    return (
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel="Get menu alerts"
        style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 44, paddingHorizontal: S.md, borderRadius: R.md, backgroundColor: C.cream, borderWidth: 1, borderColor: C.creamLine }}
      >
        <Ionicons name="notifications-outline" size={18} color={C.brandDark} />
        <Text weight="semibold" size={14} style={{ flex: 1 }} numberOfLines={1}>Get menu alerts</Text>
        <Text weight="semibold" size={13} color={C.brandDark}>Subscribe</Text>
        <Ionicons name="chevron-down" size={16} color={C.brandDark} />
      </Pressable>
    );
  }

  return (
    <View style={{ gap: 10, padding: 14, borderRadius: R.lg, backgroundColor: C.white, borderWidth: 1, borderColor: C.creamLine }}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
        <Ionicons name="chevron-up" size={18} color={C.muted} />
      </Pressable>
      <Text weight="bold" size={16} style={{ textAlign: 'center', paddingHorizontal: 18 }}>Get notified as soon as our menu&apos;s are uploaded</Text>
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
          maxFontSizeMultiplier={1.3}
          onSubmitEditing={submit}
          style={{ flex: 1, minWidth: 0, height: 46, borderRadius: R.md, borderWidth: 1.5, borderColor: emailError ? C.red : C.line, backgroundColor: C.white, paddingHorizontal: 12, fontSize: 16, color: C.text }}
        />
        <Button label="Subscribe" onPress={submit} loading={loading} small />
      </View>
      {emailError ? <Text size={13} color={C.red}>{emailError}</Text> : null}
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
      {consentError ? <Text size={13} color={C.red}>{consentError}</Text> : null}
    </View>
  );
}
