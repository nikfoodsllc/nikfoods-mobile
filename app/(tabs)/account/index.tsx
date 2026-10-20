import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import Field from '@/components/Field';
import { useToast } from '@/components/Toast';
import { Button, Card, Divider, Sheet, Text } from '@/components/ui';
import { SITE_URL } from '@/constants/config';
import { C, R, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useApiClient } from '@/hooks/useApiClient';
import * as localCart from '@/lib/localStorageCart';

type Row = { at: string; amount: number; type: 'issued' | 'used' | 'restored' | 'adjusted'; orderId?: string; note?: string; items?: Array<{ name: string; quantity: number; amount: number }> };
const LABEL: Record<Row['type'], string> = { issued: 'Credit added', used: 'Used on an order', restored: 'Credit returned', adjusted: 'Adjustment' };

/** The website's own pages (terms, privacy, help), shown inside the app. */
const openPage = (path: string) => void WebBrowser.openBrowserAsync(`${SITE_URL}${path}`);

function Legal() {
  return (
    <Card style={{ paddingVertical: S.xs }}>
      <Item icon="document-text-outline" label="Terms" onPress={() => openPage('/terms')} />
      <Divider />
      <Item icon="shield-checkmark-outline" label="Privacy" onPress={() => openPage('/privacy')} />
      <Divider />
      <Item icon="help-circle-outline" label="Help and FAQ" onPress={() => openPage('/faqs')} />
    </Card>
  );
}

function Item({ icon, label, onPress, value, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; value?: string; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 54 }}>
      <Ionicons name={icon} size={22} color={danger ? C.red : C.body} />
      <Text weight="medium" size={16} color={danger ? C.red : C.text} style={{ flex: 1 }}>{label}</Text>
      {!!value && <Text weight="semibold" size={15} color={C.muted}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color={C.faint} />
    </Pressable>
  );
}

export default function Account() {
  const router = useRouter();
  const toast = useToast();
  const { user, logout, updateUser } = useAuth();
  const { refreshCart } = useCart();
  const { authenticatedFetch } = useApiClient();
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<Row[]>([]);
  const [creditOpen, setCreditOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const loadCredit = useCallback(async () => {
    try {
      const r = await authenticatedFetch('/api/account/store-credit');
      const j = await r.json();
      if (j?.success) {
        setBalance(Math.max(0, Number(j.data?.balance) || 0));
        setHistory(j.data?.history ?? []);
      }
    } catch {
      // the balance simply stays hidden
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    if (user) void loadCredit();
  }, [user, loadCredit]);

  if (!user) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ padding: S.xl, gap: S.md, flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', gap: S.md, marginBottom: S.xl }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person-outline" size={40} color={C.brandDark} />
            </View>
            <Text weight="bold" size={24}>Your account</Text>
            <Text size={15} color={C.muted} style={{ textAlign: 'center' }}>Log in to check out, track orders and save addresses</Text>
          </View>
          <Button label="Log in" onPress={() => router.push('/login')} />
          <Button label="Create account" variant="outline" onPress={() => router.push('/signup')} />
          <View style={{ marginTop: S.xl }}>
            <Legal />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const openEdit = () => {
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
    setErr('');
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (name.trim().length < 2) return setErr('Name is required');
    if (phone.trim() && phone.replace(/\D/g, '').length !== 10) return setErr('Enter a 10 digit phone number');
    setBusy(true);
    setErr('');
    try {
      const r = await authenticatedFetch('/api/account/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), phone: phone.replace(/\D/g, '') || undefined }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(j.error || 'Could not save');
      updateUser({ ...user, name: name.trim(), phone: phone.replace(/\D/g, '') || user.phone });
      setEditOpen(false);
      toast('Saved');
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (next.length < 8) return setErr('At least 8 characters');
    setBusy(true);
    setErr('');
    try {
      const r = await authenticatedFetch('/api/account/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: cur, newPassword: next }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(j.error || 'Could not change the password');
      setPwOpen(false);
      setCur('');
      setNext('');
      toast('Password changed');
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    logout();
    localCart.clearCart();
    void refreshCart();
    toast('Logged out', 'info');
  };

  const deleteAccount = () => {
    Alert.alert('Delete your account?', 'This removes your account and saved addresses. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete account',
        style: 'destructive',
        onPress: async () => {
          try {
            const r = await authenticatedFetch('/api/auth/account', { method: 'DELETE' });
            if (!r.ok) throw new Error('x');
            logout();
            localCart.clearCart();
            await refreshCart();
            toast('Account deleted', 'info');
          } catch {
            toast('Could not delete the account', 'error');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.surface }}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.lg, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text weight="bold" size={30}>Account</Text>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
            <Text weight="bold" size={22} color={C.onBrand}>{(user.name || user.email || '?').trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text weight="bold" size={18} numberOfLines={1}>{user.name}</Text>
            <Text size={14} color={C.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{user.email}</Text>
            {!!user.phone && <Text size={14} color={C.muted}>{user.phone}</Text>}
          </View>
          <Pressable onPress={openEdit} hitSlop={10} accessibilityLabel="Edit profile"><Ionicons name="create-outline" size={22} color={C.body} /></Pressable>
        </Card>

        {balance > 0 || history.length > 0 ? (
          <Pressable onPress={() => setCreditOpen(true)} accessibilityRole="button" accessibilityLabel="Store credit">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderRadius: R.lg, backgroundColor: C.cream, borderWidth: 1, borderColor: C.creamLine }}>
              <Ionicons name="wallet-outline" size={26} color={C.brandDark} />
              <View style={{ flex: 1 }}>
                <Text size={13} color={C.muted}>Store credit</Text>
                <Text weight="bold" size={24}>${balance.toFixed(2)}</Text>
              </View>
              <Text weight="semibold" size={14} color={C.brandDark}>History</Text>
            </View>
          </Pressable>
        ) : null}

        <Card style={{ paddingVertical: S.xs }}>
          <Item icon="location-outline" label="Addresses" onPress={() => router.push('/account/addresses')} />
          <Divider />
          <Item icon="lock-closed-outline" label="Change password" onPress={() => { setErr(''); setPwOpen(true); }} />
        </Card>

        <Legal />

        <Card style={{ paddingVertical: S.xs }}>
          <Item icon="log-out-outline" label="Log out" onPress={signOut} />
          <Divider />
          <Item icon="trash-outline" label="Delete account" onPress={deleteAccount} danger />
        </Card>
      </ScrollView>

      <Sheet visible={creditOpen} onClose={() => setCreditOpen(false)} title="Store credit">
        <Text weight="bold" size={32}>${balance.toFixed(2)}</Text>
        <Text size={14} color={C.muted} style={{ marginBottom: S.lg }}>Used automatically when you choose it at checkout</Text>
        {history.map((h, i) => (
          <View key={`${h.at}-${i}`} style={{ borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: S.md, marginBottom: S.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text weight="semibold" size={14}>{LABEL[h.type]}</Text>
                {!!h.orderId && <Text size={13} color={C.muted}>Order {h.orderId}</Text>}
                <Text size={12} color={C.faint}>{new Date(h.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
              </View>
              <Text weight="bold" size={17} color={h.amount >= 0 ? C.green : C.body}>{h.amount >= 0 ? '+' : '-'}${Math.abs(h.amount).toFixed(2)}</Text>
            </View>
            {!!h.note && <Text size={13} color={C.body} style={{ fontStyle: 'italic', marginTop: 6 }}>{h.note}</Text>}
            {h.items?.map((it, j) => (
              <View key={j} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text size={13} color={C.body} style={{ flex: 1 }}>{it.name}{it.quantity > 1 ? ` x ${it.quantity}` : ''}</Text>
                <Text size={13} weight="medium">${it.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        ))}
      </Sheet>

      <Sheet visible={editOpen} onClose={() => setEditOpen(false)} title="Edit profile" footer={<Button label="Save" onPress={saveProfile} loading={busy} />}>
        <Field label="Name" value={name} onChangeText={setName} autoComplete="name" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
        {!!err && <Text size={14} color={C.red}>{err}</Text>}
      </Sheet>

      <Sheet visible={pwOpen} onClose={() => setPwOpen(false)} title="Change password" footer={<Button label="Save password" onPress={savePassword} loading={busy} />}>
        <Field label="Current password" value={cur} onChangeText={setCur} secure autoCapitalize="none" />
        <Field label="New password" value={next} onChangeText={setNext} secure autoCapitalize="none" />
        {!!err && <Text size={14} color={C.red}>{err}</Text>}
      </Sheet>
    </SafeAreaView>
  );
}
