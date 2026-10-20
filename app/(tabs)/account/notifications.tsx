import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';
import { Button, Card, Divider, Text, tap } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useApiClient } from '@/hooks/useApiClient';
import { askForPush, openPhoneSettings, pushState, registerPush, type PushState } from '@/lib/push';

interface Prefs {
  orders: boolean;
  menu: boolean;
  reminders: boolean;
}

const ROWS: Array<{ key: keyof Prefs; label: string; hint: string }> = [
  { key: 'orders', label: 'Order updates', hint: 'Confirmed, out for delivery, delivered, and payment problems' },
  { key: 'menu', label: 'Menu alerts', hint: 'When a new menu is up' },
  { key: 'reminders', label: 'Cart reminders', hint: 'If you leave items in your cart' },
];

export default function NotificationSettings() {
  const router = useRouter();
  const toast = useToast();
  const { authenticatedFetch } = useApiClient();
  const [state, setState] = useState<PushState>('unavailable');
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const current = await pushState();
    setState(current);
    // allowed but maybe never registered (answered the question before logging in): make sure the site knows this phone
    if (current === 'granted') void registerPush(authenticatedFetch);
    try {
      const r = await authenticatedFetch('/api/push/preferences');
      const j = await r.json();
      // menu alerts count as ON only when the email is really on the menu alerts list (the site's default is on, but nobody was added)
      if (r.ok && j.data) setPrefs({ orders: Boolean(j.data.orders), menu: Boolean(j.data.menu) && Boolean(j.data.menuSubscribed), reminders: Boolean(j.data.reminders) });
    } catch {
      // the switches stay hidden until they load
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    void load();
    // coming back from iPhone Settings: show the new state
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void load());
    return () => sub.remove();
  }, [load]);

  const turnOn = async () => {
    setBusy(true);
    const next = await askForPush();
    if (next === 'granted') await registerPush(authenticatedFetch);
    setState(next);
    setBusy(false);
  };

  const change = async (key: keyof Prefs, value: boolean) => {
    if (!prefs) return;
    tap();
    const before = prefs;
    setPrefs({ ...prefs, [key]: value });
    try {
      const r = await authenticatedFetch('/api/push/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) });
      if (!r.ok) throw new Error('x');
      if (key === 'menu' && value) toast('You are on the menu alerts list', 'success');
    } catch {
      setPrefs(before);
      toast('Could not save that', 'error');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, paddingVertical: S.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text weight="bold" size={22} style={{ marginLeft: S.md }}>Notifications</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.lg, paddingBottom: 60 }}>
        {state === 'undetermined' && (
          <Card style={{ gap: S.md }}>
            <Text weight="bold" size={17}>Get updates on your phone</Text>
            <Text size={14} color={C.muted}>Know when your order is confirmed, on its way and delivered.</Text>
            <Button label="Turn on notifications" onPress={turnOn} loading={busy} />
          </Card>
        )}
        {state === 'denied' && (
          <Card style={{ gap: S.md }}>
            <Text weight="bold" size={17}>Notifications are off</Text>
            <Text size={14} color={C.muted}>Turn them on for NikFoods in iPhone Settings.</Text>
            <Button label="Open Settings" variant="outline" onPress={() => void openPhoneSettings()} />
          </Card>
        )}
        {state === 'unavailable' && (
          <Card>
            <Text size={14} color={C.muted}>Notifications work on an iPhone with the NikFoods app installed.</Text>
          </Card>
        )}
        {prefs && (
          <Card style={{ paddingVertical: S.xs }}>
            {ROWS.map((row, i) => (
              <View key={row.key}>
                {i > 0 && <Divider />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 64, paddingVertical: S.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text weight="medium" size={16}>{row.label}</Text>
                    <Text size={13} color={C.muted}>{row.hint}</Text>
                  </View>
                  <Switch value={prefs[row.key]} onValueChange={(v) => void change(row.key, v)} trackColor={{ true: C.green, false: '#E5E7EB' }} accessibilityLabel={row.label} />
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
