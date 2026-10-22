import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Field from '@/components/Field';
import { useToast } from '@/components/Toast';
import { Button, Card, Divider, Sheet, Text, tap } from '@/components/ui';
import { APP_SCHEME } from '@/constants/config';
import { C, S } from '@/constants/theme';
import { hasAmount, taxesAndFeesOf, TAXES_FEES_TEXT } from '@/lib/orderTotalsDisplay';

/**
 * The pay link an admin emails for an order they entered (the page behind https://www.nikfoods.com/pay/<order>?t=...), inside the
 * app: the same order summary, details, store credit and card / Apple Pay payment as the website page, using the same calls.
 * The secret in the link opens this one order only.
 */

interface PayItem { name: string; quantity: number; price: number; portion?: string; spice?: string; eco?: boolean; notes?: string; combo: Array<{ title: string; choices: string[] }> }
interface PayData {
  state: 'pay' | 'paid' | 'closed' | 'cutoff';
  orderId: string;
  message?: string;
  firstName?: string;
  clientSecret?: string;
  customer?: { name: string; email: string; phone: string };
  address?: { street?: string; apartment?: string; city?: string; state?: string; zip?: string; entrance?: string; floor?: string; landmark?: string };
  subtotal?: number;
  platformFee?: number;
  deliveryFee?: number;
  tax?: number;
  tip?: number;
  total?: number;
  credit?: { used: number; available: number; covered: boolean };
  days?: Array<{ day: string; date: string; deliverOn: string; dayTotal: number; items: PayItem[] }>;
}

const money = (n: number | undefined) => `$${(n ?? 0).toFixed(2)}`;
const long = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function PayLink() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { orderId, t } = useLocalSearchParams<{ orderId: string; t?: string }>();
  const id = String(orderId ?? '');
  const token = String(t ?? '');
  const [data, setData] = useState<PayData | null>(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justPaid, setJustPaid] = useState(false);
  const [editing, setEditing] = useState(false);
  const seen = useRef(false);
  const q = `/api/pay/${encodeURIComponent(id)}`;
  const tq = `?t=${encodeURIComponent(token)}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${q}${tq}`, { headers: { 'Cache-Control': 'no-store' } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        setProblem(body.error || 'This payment link is not valid.');
        return;
      }
      setProblem('');
      setData(body.data);
      // tell the shop the link was opened (once; never blocks anything)
      if (!seen.current) {
        seen.current = true;
        void fetch(`${q}/seen${tq}`, { method: 'POST' }).catch(() => undefined);
      }
    } catch {
      setProblem('We could not load your order. Please check your connection and try again.');
    }
  }, [q, tq]);

  useEffect(() => {
    void load();
  }, [load]);

  // after a payment wait for the site to record it
  useEffect(() => {
    if (!justPaid) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      void load();
      if (tries >= 8) clearInterval(timer);
    }, 2500);
    return () => clearInterval(timer);
  }, [justPaid, load]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const due = data ? Math.max(0, (data.total ?? 0) - (data.credit?.used ?? 0)) : 0;

  const pay = async () => {
    if (!data?.clientSecret || busy) return;
    setBusy(true);
    setError('');
    try {
      // ask the site whether every delivery day is still open, right before charging (like the website's pay page)
      const check = await fetch(`${q}/check${tq}`, { method: 'POST' });
      if (check.status === 409) {
        const b = await check.json().catch(() => ({}));
        setError(`${b.error || 'Ordering has closed for a day in this order.'} Please contact support@nikfoods.com so we can help.`);
        await load();
        return;
      }
      const c = data.customer;
      const init = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: 'NikFoods',
        applePay: { merchantCountryCode: 'US' },
        defaultBillingDetails: { name: c?.name, email: c?.email, phone: c?.phone },
        returnURL: `${APP_SCHEME}://stripe-redirect`,
        primaryButtonLabel: `Pay ${money(due)}`,
        style: 'automatic',
      });
      if (init.error) {
        setError(init.error.message);
        return;
      }
      const res = await presentPaymentSheet();
      if (res.error) {
        if (res.error.code !== 'Canceled') setError(res.error.message);
        return;
      }
      setJustPaid(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const credit = async (action: 'use' | 'release' | 'pay') => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${q}/credit${tq}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const b = await res.json().catch(() => ({}));
      if (!res.ok || !b.success) {
        setError(b.error || 'Something went wrong. Please try again.');
        await load();
        return;
      }
      if (action === 'pay') setJustPaid(true);
      else await load();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const top = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md }}>
      <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }}>
        <Ionicons name="close" size={22} color={C.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text weight="display" size={30}>Checkout</Text>
        <Text size={13} color={C.muted} numberOfLines={1}>Order {id}</Text>
      </View>
    </View>
  );

  const message = (title: string, body: string, ok = false) => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xxl, gap: S.md }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: ok ? C.greenBg : C.cream, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={ok ? 'checkmark' : 'information'} size={42} color={ok ? C.green : C.brandDark} />
      </View>
      <Text weight="display" size={34} style={{ textAlign: 'center' }}>{title}</Text>
      <Text size={15} color={C.muted} style={{ textAlign: 'center', lineHeight: 22 }}>{body}</Text>
      <Button label="Back to the menu" onPress={() => router.replace('/menu')} style={{ alignSelf: 'stretch', marginTop: S.md }} />
    </View>
  );

  let content: React.ReactNode;
  if (problem && !data) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xxl, gap: S.md }}>
        <Text weight="display" size={32} style={{ textAlign: 'center' }}>{problem}</Text>
        <Text size={15} color={C.muted} style={{ textAlign: 'center' }}>If you need help, write to support@nikfoods.com.</Text>
        <Button label="Try again" onPress={() => { setProblem(''); void load(); }} style={{ alignSelf: 'stretch', marginTop: S.md }} />
      </View>
    );
  } else if (!data) {
    content = <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.brand} /></View>;
  } else if (data.state === 'paid' || (justPaid && data.state !== 'pay')) {
    content = message(`Thank you${data.firstName ? `, ${data.firstName}` : ''}`, 'Your payment is received. We emailed your confirmation.', true);
  } else if (justPaid) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.md, padding: S.xxl }}>
        <ActivityIndicator color={C.brand} />
        <Text size={15} color={C.muted}>Confirming your payment</Text>
      </View>
    );
  } else if (data.state === 'cutoff') {
    content = message('Ordering has closed', `${data.message || 'Ordering has closed for a day in this order.'} Please contact support@nikfoods.com so we can help.`);
  } else if (data.state === 'closed') {
    content = message('This link is no longer active', 'This order was cancelled or changed. If you still need it, write to support@nikfoods.com.');
  } else {
    const fees = taxesAndFeesOf({ taxes: data.tax, platformFee: data.platformFee, deliveryFee: data.deliveryFee });
    const a = data.address;
    content = (
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.lg, paddingBottom: 150 + insets.bottom }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!!error && (
          <View style={{ padding: S.md, borderRadius: 14, backgroundColor: C.redBg, flexDirection: 'row', gap: S.sm }}>
            <Ionicons name="alert-circle" size={18} color={C.red} style={{ marginTop: 1 }} />
            <Text size={14} color={C.red} style={{ flex: 1 }}>{error}</Text>
          </View>
        )}

        <Card>
          <Text weight="bold" size={17} style={{ marginBottom: S.sm }}>Order summary</Text>
          {data.days?.map((day) => (
            <View key={`${day.date}-${day.day}`} style={{ marginBottom: S.md }}>
              <Text weight="semibold" size={14} color={C.brandDark}>{long(day.date)}</Text>
              <Text size={12} color={day.deliverOn !== day.date ? C.brandDark : C.green} style={{ marginBottom: 4 }}>Delivering on {long(day.deliverOn)}</Text>
              {day.items.map((it, i) => (
                <View key={i} style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.md }}>
                    <Text size={14} color={C.body} style={{ flex: 1 }}>{it.quantity} x {it.name}</Text>
                    <Text size={14} weight="medium">{money(it.price * it.quantity)}</Text>
                  </View>
                  {it.combo.flatMap((c) => c.choices.map((ch) => <Text key={`${c.title}-${ch}`} size={12} color={C.muted} style={{ marginLeft: S.md }}>• {c.title}: {ch}</Text>))}
                  {!!it.portion && <Text size={12} color={C.muted} style={{ marginLeft: S.md }}>• {it.portion}</Text>}
                  {!!it.spice && <Text size={12} color={C.muted} style={{ marginLeft: S.md }}>• Spice: {it.spice}</Text>}
                  {!!it.eco && <Text size={12} color={C.muted} style={{ marginLeft: S.md }}>• Eco-friendly container</Text>}
                  {!!it.notes && <Text size={12} color={C.muted} style={{ marginLeft: S.md, fontStyle: 'italic' }}>• Note: {it.notes}</Text>}
                </View>
              ))}
            </View>
          ))}
          <Divider style={{ marginVertical: S.sm }} />
          <Row label="Subtotal" value={money(data.subtotal)} />
          {hasAmount(fees) && <Row label={TAXES_FEES_TEXT} value={money(fees)} />}
          {hasAmount(data.tip) && <Row label="Tip" value={money(data.tip)} />}
          <Divider style={{ marginVertical: S.sm }} />
          <Row label="Total" value={money(data.total)} bold />
          {(data.credit?.used ?? 0) > 0 && <Row label="Store credit" value={`-${money(data.credit?.used)}`} green />}
          {(data.credit?.used ?? 0) > 0 && <Row label="To pay" value={money(due)} bold />}
        </Card>

        <Card>
          <Text weight="bold" size={17} style={{ marginBottom: S.sm }}>Details</Text>
          <Text size={14} color={C.body}>{data.customer?.name}</Text>
          <Text size={14} color={C.muted}>{data.customer?.email}</Text>
          <Text size={14} color={C.muted}>{data.customer?.phone}</Text>
          <View style={{ height: S.md }} />
          <Text weight="semibold" size={14}>Delivery address</Text>
          <Text size={14} color={C.body}>{[a?.street, a?.apartment].filter(Boolean).join(', ')}</Text>
          <Text size={14} color={C.muted}>{[a?.city, a?.zip].filter(Boolean).join(', ')}</Text>
          {!!a?.entrance && <Text size={13} color={C.muted}>Gate code: {a.entrance}</Text>}
          {!!a?.floor && <Text size={13} color={C.muted}>{a.floor}</Text>}
          <Pressable onPress={() => setEditing(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit address" style={{ marginTop: S.md, alignSelf: 'flex-start' }}>
            <Text weight="semibold" size={14} color={C.brandDark}>Edit address</Text>
          </Pressable>
        </Card>

        {!!data.credit && (data.credit.available > 0 || data.credit.used > 0) && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <View style={{ flex: 1 }}>
              <Text weight="bold" size={16}>Store credit</Text>
              <Text size={14} weight={data.credit.used > 0 ? 'semibold' : 'regular'} color={data.credit.used > 0 ? C.green : C.muted}>
                {data.credit.used > 0 ? `${money(data.credit.used)} applied` : `${money(data.credit.available)} available`}
              </Text>
            </View>
            <Switch value={data.credit.used > 0} disabled={busy} onValueChange={(on) => { tap(); void credit(on ? 'use' : 'release'); }} trackColor={{ true: C.brand, false: '#E5E7EB' }} accessibilityLabel="Use store credit" />
          </Card>
        )}
      </ScrollView>
    );
  }

  const showPay = data?.state === 'pay' && !justPaid;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.surface }}>
      {top}
      {content}
      {showPay && data && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: Math.max(insets.bottom, S.lg), backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line }}>
          {data.credit?.covered ? (
            <Button label="Place order" onPress={() => void credit('pay')} loading={busy} />
          ) : (
            <Button label={`Pay  ·  ${money(due)}`} onPress={() => void pay()} loading={busy} disabled={!data.clientSecret} />
          )}
        </View>
      )}
      <EditAddress
        visible={editing}
        initial={data?.address}
        onClose={() => setEditing(false)}
        onSave={async (fields) => {
          const res = await fetch(`${q}${tq}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
          const b = await res.json().catch(() => ({}));
          if (!res.ok || !b.success) return b.error || 'Could not save. Please try again.';
          setEditing(false);
          toast('Address saved');
          await load();
          return '';
        }}
      />
    </SafeAreaView>
  );
}

function Row({ label, value, bold, green }: { label: string; value: string; bold?: boolean; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
      <Text weight={bold ? 'bold' : 'regular'} size={bold ? 17 : 15} color={bold ? C.text : C.body}>{label}</Text>
      <Text weight={bold ? 'bold' : 'semibold'} size={bold ? 18 : 15} color={green ? C.green : C.text}>{value}</Text>
    </View>
  );
}

function EditAddress({ visible, initial, onClose, onSave }: { visible: boolean; initial?: PayData['address']; onClose: () => void; onSave: (f: Record<string, string>) => Promise<string> }) {
  const [f, setF] = useState({ street: '', apartment: '', city: '', zip: '', entrance: '', floor: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setError('');
    setF({ street: initial?.street ?? '', apartment: initial?.apartment ?? '', city: initial?.city ?? '', zip: initial?.zip ?? '', entrance: initial?.entrance ?? '', floor: initial?.floor ?? '' });
  }, [visible, initial]);
  const set = (key: keyof typeof f, max: number) => (v: string) => setF((cur) => ({ ...cur, [key]: v.replace(/\n/g, ' ').slice(0, max) }));
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Edit address"
      full
      footer={<Button label="Save address" loading={saving} onPress={async () => { setSaving(true); setError(await onSave(f)); setSaving(false); }} />}
    >
      <Field label="Street address" value={f.street} onChangeText={set('street', 150)} />
      <View style={{ flexDirection: 'row', gap: S.md }}>
        <View style={{ flex: 1 }}><Field label="Apartment / unit" value={f.apartment} onChangeText={set('apartment', 10)} /></View>
        <View style={{ flex: 1 }}><Field label="Gate code" value={f.entrance} onChangeText={set('entrance', 20)} /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: S.md }}>
        <View style={{ flex: 2 }}><Field label="City" value={f.city} onChangeText={set('city', 60)} /></View>
        <View style={{ flex: 1.2 }}><Field label="Zip code" value={f.zip} onChangeText={set('zip', 10)} keyboardType="number-pad" /></View>
      </View>
      <Field label="Delivery instructions (optional)" value={f.floor} onChangeText={set('floor', 100)} />
      {!!error && <Text size={14} color={C.red}>{error}</Text>}
    </Sheet>
  );
}

