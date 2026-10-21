import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddressForm from '@/components/AddressForm';
import DeliveryBar from '@/components/DeliveryBar';
import Field from '@/components/Field';
import { useToast } from '@/components/Toast';
import { Button, Card, Divider, Text, tap } from '@/components/ui';
import { C, FONT, R, S } from '@/constants/theme';
import { SITE_URL } from '@/constants/config';
import { SMS_CONSENT_LABEL, SMS_CONSENT_SMALL_PRINT } from '@/lib/smsConsent';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useApiClient } from '@/hooks/useApiClient';
import { cartTotalsWithTip } from '@/lib/checkoutTotals';
import { closedItemsNotice, parseClosedItems } from '@/lib/closedDaysNotice';
import { emptyCartEverywhere } from '@/lib/cartSync';
import * as localCart from '@/lib/localStorageCart';
import { hasAmount, taxesAndFeesOf, TAXES_FEES_TEXT, TAXES_FEES_TOOLTIP } from '@/lib/orderTotalsDisplay';
import { paymentIntentIdFromClientSecret, reportPaymentError } from '@/lib/checkout/reportPaymentError';
import { planCreditForOrder, toCents, toDollars } from '@/lib/storeCredit';
import { useAddresses } from '@/lib/useAddresses';
import ActionBar, { ACTION_BAR_SPACE } from '@/components/ActionBar';
import { IAddress } from '@/types/auth';
import { useTabBarSpace } from '@/lib/useTabBarSpace';

const TIPS = [0, 5, 10, 15];
const cleanInstructions = (v: string) => v.replace(/\s+/g, ' ').trim().slice(0, 30);
const isCompleteAddress = (a?: { _id?: string; addressLine1?: string }) => Boolean(a && !a._id?.startsWith('zipcode-') && a.addressLine1 !== 'Delivery Area' && a.addressLine1 !== 'Delivery Area:');

export default function Checkout() {
  const bottomSpace = useTabBarSpace(false);
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { cart, isLoading: cartLoading, refreshCart, zipcodeConfig, updateAddress } = useCart();
  const { addresses, reload: reloadAddresses } = useAddresses();
  // the delivery address can be changed right here (a form over checkout), without leaving the page
  const [editingAddress, setEditingAddress] = useState<IAddress | null>(null);
  // text-message box: never ticked for the customer; not shown when they already agreed for this very number (as on the website)
  const [smsConsent, setSmsConsent] = useState<{ optedIn: boolean; phone: string | null } | null>(null);
  const [smsChecked, setSmsChecked] = useState(false);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [instructions, setInstructions] = useState('');
  const [tipPct, setTipPct] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const [creditLoaded, setCreditLoaded] = useState(false);
  const [useCredit, setUseCredit] = useState(true);
  const [serverCredit, setServerCredit] = useState<{ applied: number; covered: boolean; platformFee?: number; tax?: number; total?: number } | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paidByCredit, setPaidByCredit] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [banner, setBanner] = useState('');
  const [closed, setClosed] = useState<string | null>(null);
  const done = useRef(false);
  const contactAddrId = useRef<string | null>(null);
  const instrAddrId = useRef<string | null>(null);
  const sentInstructions = useRef<string | null>(null);

  // not signed in: back to the cart's login prompt
  // (the checkout stays open behind the other tabs, so these two only act while it is the screen in front)
  const focused = useIsFocused();
  useEffect(() => {
    if (focused && !user && !cartLoading) router.replace('/login');
  }, [focused, user, cartLoading, router]);

  // what the profile already knows
  useEffect(() => {
    if (!user) return;
    setName((c) => c || user.name || '');
    setEmail((c) => c || user.email || '');
    setPhone((c) => c || user.phone || '');
  }, [user]);

  // contact follows the selected address, once per address (what the customer types is kept)
  useEffect(() => {
    const id = cart?.selectedAddress?._id;
    if (!id || addresses.length === 0 || contactAddrId.current === id) return;
    const a = addresses.find((x) => x._id?.toString() === id);
    if (!a) return;
    contactAddrId.current = id;
    setName(a.name || user?.name || '');
    setEmail(a.email || user?.email || '');
    setPhone(a.phone || user?.phone || '');
  }, [addresses, cart?.selectedAddress?._id, user]);

  // delivery instructions start from the ones saved on the address, once per address
  useEffect(() => {
    const id = cart?.selectedAddress?._id ?? null;
    if (!id || instrAddrId.current === id) return;
    instrAddrId.current = id;
    setInstructions(cart?.selectedAddress?.floor ?? '');
  }, [cart?.selectedAddress?._id, cart?.selectedAddress?.floor]);

  // empty cart: back to the cart (unless we just paid or a closed notice is showing)
  useEffect(() => {
    if (focused && !cartLoading && (!cart || cart.days.length === 0) && !closed && !done.current) router.replace('/cart');
  }, [focused, cart, cartLoading, closed, router]);

  // what the customer already chose about text messages
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const r = await authenticatedFetch('/api/account/sms-consent');
        const j = await r.json().catch(() => ({}));
        if (alive && r.ok) setSmsConsent({ optedIn: Boolean(j?.data?.optedIn), phone: j?.data?.phone ?? null });
      } catch {
        // the box simply stays unticked
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, authenticatedFetch]);
  const phoneDigits = phone.replace(/\D/g, '').slice(-10);
  const smsAlreadyOn = Boolean(smsConsent?.optedIn && smsConsent.phone && smsConsent.phone === phoneDigits);

  // store credit balance
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const r = await authenticatedFetch('/api/account/store-credit');
        const j = await r.json();
        if (j?.success) setCreditBalance(Math.max(0, Number(j.data?.balance) || 0));
      } catch {
        // checkout works without store credit
      } finally {
        setCreditLoaded(true);
      }
    })();
  }, [user, authenticatedFetch]);

  const tipAmount = cart ? (cart.subtotal * tipPct) / 100 : 0;
  const localCredit = useMemo(
    () => (useCredit && creditBalance > 0 && cart && !cart.appliedCoupon?.discountAmount ? planCreditForOrder({ subtotal: cart.subtotal, deliveryFee: cart.deliveryFee, tip: tipAmount, balanceCents: toCents(creditBalance) }) : null),
    [useCredit, creditBalance, cart, tipAmount]
  );
  const creditApplied = useCredit && creditBalance > 0 ? (serverCredit ? serverCredit.applied : localCredit ? toDollars(localCredit.creditCents) : 0) : 0;
  const credited = useCredit && creditBalance > 0 && creditApplied > 0 ? (orderId && serverCredit && serverCredit.platformFee !== undefined && serverCredit.tax !== undefined && serverCredit.total !== undefined ? { platformFee: serverCredit.platformFee, tax: serverCredit.tax, total: serverCredit.total } : localCredit ? { platformFee: localCredit.platformFee, tax: localCredit.tax, total: localCredit.total } : null) : null;
  const covered = useCredit && creditBalance > 0 && (serverCredit ? serverCredit.covered : Boolean(localCredit && localCredit.cardCents === 0 && localCredit.creditCents > 0));
  const creditLocked = Boolean(orderId);

  const totals = cart ? cartTotalsWithTip(cart, tipPct, credited) : null;
  const canPay = Boolean(cart?.canCheckout && isCompleteAddress(cart?.selectedAddress));
  const creditReady = !user || creditLoaded;

  // ---- the website's "closed days" handling: stay here, remove what closed, say so ----
  const handleClosed = useCallback(
    async (status: number, data: { code?: string; error?: string; closedItems?: unknown } | null) => {
      if (status !== 409 || data?.code !== 'ORDER_CUTOFF_CLOSED') return false;
      const closedItems = parseClosedItems(data.closedItems);
      const { removed, linesLeft } = localCart.removeClosedLines(closedItems);
      setClosed(closedItemsNotice(data.error ?? '', removed, linesLeft, closedItems));
      setBanner('');
      await refreshCart();
      return true;
    },
    [refreshCart]
  );

  // ---- payment session (same endpoint as the website's checkout) ----
  const prepare = useCallback(async (): Promise<boolean> => {
    if (!cart || cart.days.length === 0) return false;
    setPreparing(true);
    try {
      const r = await authenticatedFetch('/api/checkout/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, tipPercentage: tipPct, currency: 'usd', paymentIntentId: intentId ?? undefined, useStoreCredit: useCredit && creditBalance > 0, orderId: orderId ?? undefined }),
      });
      const data = await r.json();
      if (!r.ok || !data.success) {
        if (await handleClosed(r.status, data)) return false;
        setBanner(data.error || 'Failed to load payment options');
        reportPaymentError({ stage: 'create_payment_intent', message: data.error || `Failed to load payment options (HTTP ${r.status})`, paymentIntentId: intentId });
        return false;
      }
      setServerCredit({ applied: Number(data.data.creditApplied) || 0, covered: data.data.coveredByCredit === true, platformFee: typeof data.data.platformFee === 'number' ? data.data.platformFee : undefined, tax: typeof data.data.tax === 'number' ? data.data.tax : undefined, total: typeof data.data.total === 'number' ? data.data.total : undefined });
      if (data.data.coveredByCredit === true) {
        setIntentId(null);
        setClientSecret(null);
        return true;
      }
      if (!data.data.clientSecret || !data.data.paymentIntentId) {
        setBanner('Missing payment session from server');
        return false;
      }
      setIntentId(data.data.paymentIntentId);
      setClientSecret(data.data.clientSecret);
      return true;
    } catch (e) {
      setBanner(e instanceof Error ? e.message : 'Failed to load payment options.');
      return false;
    } finally {
      setPreparing(false);
    }
  }, [cart, authenticatedFetch, tipPct, intentId, useCredit, creditBalance, orderId, handleClosed]);

  const prepareRef = useRef(prepare);
  prepareRef.current = prepare;

  // open the payment session as soon as the cart can be ordered, and again when the amount changes
  const amountKey = `${tipPct}-${cart?.subtotal}-${cart?.platformFee}-${cart?.deliveryFee}-${cart?.tax}-${useCredit && creditBalance > 0}-${creditBalance}`;
  useEffect(() => {
    if (!canPay || !creditReady || orderId) return;
    const t = setTimeout(() => void prepareRef.current(), 350);
    return () => clearTimeout(t);
  }, [amountKey, canPay, creditReady, orderId]);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (phone.replace(/\D/g, '').length !== 10) e.phone = 'Enter a 10 digit phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createOrder = async (): Promise<{ id: string; secret?: string; paidWithCredit?: boolean } | null> => {
    if (!cart) return null;
    sentInstructions.current = cleanInstructions(instructions);
    const r = await authenticatedFetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart,
        customerInfo: { name: name.trim(), email: email.trim(), phone: phone.replace(/\D/g, '') },
        tipPercentage: tipPct,
        paymentMethod: 'Credit Card',
        currency: 'usd',
        paymentIntentId: intentId ?? undefined,
        deliveryInstructions: cleanInstructions(instructions),
        useStoreCredit: useCredit && creditBalance > 0,
        smsOptIn: smsChecked && !smsAlreadyOn ? true : undefined,
      }),
    });
    const data = await r.json();
    if (!r.ok || !data.success) {
      if (await handleClosed(r.status, data)) return null;
      if (r.status === 409 && data?.code === 'CREDIT_CHANGED') {
        setBanner(data.error || 'Your store credit changed. Please check the total and try again.');
        setServerCredit(null);
        return null;
      }
      const msg = data.error || 'Failed to create order';
      reportPaymentError({ stage: 'create_order', message: msg, paymentIntentId: intentId });
      setBanner(msg);
      return null;
    }
    return { id: data.data.orderId, secret: data.data.clientSecret, paidWithCredit: data.data.paidWithCredit === true };
  };

  const waitForConfirmed = async (id: string) => {
    for (let i = 0; i < 15; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      try {
        const r = await authenticatedFetch(`/api/orders/${id}`);
        if (r.ok) {
          const j = await r.json();
          if (j.success && j.data.status === 'confirmed') return;
        }
      } catch {
        // keep trying
      }
    }
  };

  const finish = async (id: string) => {
    done.current = true;
    await emptyCartEverywhere();
    await refreshCart();
    router.replace({ pathname: '/cart/checkout-success', params: { orderId: id } });
  };

  const pay = async () => {
    setBanner('');
    setClosed(null);
    if (!validate()) {
      toast('Check your details', 'error');
      return;
    }
    if (!canPay) {
      setBanner(!isCompleteAddress(cart?.selectedAddress) ? 'Please select a delivery address to complete your order' : 'Your cart does not meet the minimum order');
      return;
    }
    setPaying(true);
    try {
      if (!covered && !clientSecret) {
        const ready = await prepare();
        if (!ready) return;
      }
      let id = orderId;
      let secret = clientSecret;
      let creditOnly = false;
      if (!id) {
        const created = await createOrder();
        if (!created) return;
        id = created.id;
        setOrderId(id);
        secret = created.secret ?? secret;
        creditOnly = created.paidWithCredit === true;
      }
      if (creditOnly) {
        await waitForConfirmed(id);
        await finish(id);
        return;
      }
      if (!secret) {
        setBanner('Missing payment session from server');
        return;
      }
      // a payment retry reuses the same order: send instructions edited after it was created
      const nowText = cleanInstructions(instructions);
      if (sentInstructions.current !== null && nowText !== sentInstructions.current) {
        try {
          const p = await authenticatedFetch(`/api/orders/${id}/delivery-instructions`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryInstructions: nowText, addressId: cart?.selectedAddress?._id }) });
          if (p.ok) sentInstructions.current = nowText;
        } catch {
          // not critical
        }
      }
      const init = await initPaymentSheet({
        paymentIntentClientSecret: secret,
        merchantDisplayName: 'NikFoods',
        applePay: { merchantCountryCode: 'US' },
        defaultBillingDetails: { name: name.trim(), email: email.trim(), phone: phone.replace(/\D/g, '') },
        returnURL: 'nikfoodsmobile://stripe-redirect',
        primaryButtonLabel: totals ? `Pay $${(creditApplied > 0 ? Math.max(0, totals.total - creditApplied) : totals.total).toFixed(2)}` : undefined,
        style: 'automatic',
      });
      if (init.error) {
        reportPaymentError({ stage: 'submit_form', message: init.error.message, code: init.error.code, orderId: id, paymentIntentId: paymentIntentIdFromClientSecret(secret) });
        setBanner(init.error.message);
        return;
      }
      const res = await presentPaymentSheet();
      if (res.error) {
        if (res.error.code === 'Canceled') return;
        reportPaymentError({ stage: 'confirm_payment', message: res.error.message, code: res.error.code, orderId: id, paymentIntentId: paymentIntentIdFromClientSecret(secret) });
        setBanner(res.error.message);
        return;
      }
      await waitForConfirmed(id);
      await finish(id);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setPaying(false);
    }
  };

  if (closed && (!cart || cart.days.length === 0)) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg, padding: S.lg, gap: S.lg }}>
        <View style={{ padding: S.lg, borderRadius: R.lg, backgroundColor: C.redBg }}>
          <Text size={15} color={C.red} style={{ lineHeight: 22 }}>{closed}</Text>
        </View>
        <Button label="Back to the menu" onPress={() => router.replace('/menu')} />
      </SafeAreaView>
    );
  }

  if (!cart || cart.days.length === 0 || !totals) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.brand} />
      </SafeAreaView>
    );
  }

  const fees = taxesAndFeesOf({ taxes: totals.tax, platformFee: totals.platformFee, deliveryFee: totals.deliveryFee });
  const cardPart = Math.max(0, totals.total - creditApplied);
  const addrOk = isCompleteAddress(cart.selectedAddress);
  const addrLine = cart.selectedAddress ? [cart.selectedAddress.addressLine1, cart.selectedAddress.addressLine2].filter(Boolean).join(', ') : '';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, paddingVertical: S.md, backgroundColor: C.surface }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text weight="display" size={32} style={{ marginLeft: S.md }}>Checkout</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: S.lg, paddingBottom: bottomSpace + ACTION_BAR_SPACE, gap: S.lg }} showsVerticalScrollIndicator={false}>
          {!!closed && (
            <View style={{ padding: S.lg, borderRadius: R.lg, backgroundColor: C.redBg }}>
              <Text size={14} color={C.red} style={{ lineHeight: 21 }}>{closed}</Text>
            </View>
          )}
          {!!banner && (
            <View style={{ padding: S.md, borderRadius: R.lg, backgroundColor: C.redBg, flexDirection: 'row', gap: S.sm }}>
              <Ionicons name="alert-circle" size={18} color={C.red} style={{ marginTop: 1 }} />
              <Text size={14} color={C.red} style={{ flex: 1 }}>{banner}</Text>
            </View>
          )}

          <View style={{ gap: S.sm }}>
            <Text weight="bold" size={17}>Delivery address</Text>
            <DeliveryBar />
            {addrOk ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                <Text size={13} color={C.muted} style={{ flex: 1 }}>{addrLine}{cart.selectedAddress?.city ? `, ${cart.selectedAddress.city}` : ''}</Text>
                {(() => {
                  const saved = addresses.find((x) => x._id?.toString() === cart.selectedAddress?._id);
                  return saved ? (
                    <Pressable onPress={() => setEditingAddress(saved)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit address">
                      <Text weight="semibold" size={14} color={C.brandDark}>Edit</Text>
                    </Pressable>
                  ) : null;
                })()}
              </View>
            ) : <Text size={13} color={C.red}>Choose a saved address with a street</Text>}
          </View>

          {addrOk && !cart.selectedAddress?._id.startsWith('zipcode-') && (
            <Card>
              <Text weight="bold" size={17} style={{ marginBottom: S.sm }}>Delivery instructions</Text>
              <View style={{ borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.md, height: 50, justifyContent: 'center' }}>
                <TextInput value={instructions} onChangeText={(t) => setInstructions(t.slice(0, 30))} placeholder="For example: Leave with the front desk" placeholderTextColor={C.faint} maxLength={30} style={{ fontFamily: FONT.medium, fontSize: 16, color: C.text }} accessibilityLabel="Delivery instructions" />
              </View>
              <Text size={12} color={C.faint} style={{ textAlign: 'right', marginTop: 4 }}>{instructions.length}/30</Text>
            </Card>
          )}

          <Card>
            <Text weight="bold" size={17} style={{ marginBottom: S.md }}>Contact</Text>
            <Field label="Name" value={name} onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }} error={errors.name} autoComplete="name" textContentType="name" />
            <Field label="Email" value={email} onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            <View style={{ marginBottom: smsAlreadyOn ? -S.lg : 0 }}>
              <Field label="Phone" value={phone} onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: undefined })); }} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
            </View>
            {!smsAlreadyOn && (
              <View>
                <Pressable
                  onPress={() => { tap(); setSmsChecked((v) => !v); }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: smsChecked }}
                  accessibilityLabel={SMS_CONSENT_LABEL}
                  hitSlop={6}
                  style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
                >
                  <View style={{ marginTop: 1, width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: smsChecked ? C.brand : '#D1D5DB', backgroundColor: smsChecked ? C.brand : C.white, alignItems: 'center', justifyContent: 'center' }}>
                    {smsChecked && <Ionicons name="checkmark" size={16} color={C.onBrand} />}
                  </View>
                  <Text weight="medium" size={14.5} style={{ flex: 1, lineHeight: 20 }}>{SMS_CONSENT_LABEL}</Text>
                </Pressable>
                <Text size={12.5} color={C.muted} style={{ marginLeft: 36, marginTop: 4, lineHeight: 18 }}>
                  {SMS_CONSENT_SMALL_PRINT}{' '}
                  <Text size={12.5} color={C.muted} style={{ textDecorationLine: 'underline' }} onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/terms#sms`)}>Terms</Text>
                  {' · '}
                  <Text size={12.5} color={C.muted} style={{ textDecorationLine: 'underline' }} onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/privacy#sms`)}>Privacy</Text>
                </Text>
              </View>
            )}
          </Card>

          <Card>
            <Text weight="bold" size={17}>Add a tip</Text>
            <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.md }}>
              {TIPS.map((p) => {
                const on = tipPct === p;
                return (
                  <Pressable key={p} onPress={() => { tap(); setTipPct(p); }} accessibilityRole="button" accessibilityLabel={p === 0 ? 'No tip' : `${p} percent tip`} style={{ flex: 1, height: 58, borderRadius: R.md, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.cream : C.white, alignItems: 'center', justifyContent: 'center' }}>
                    <Text weight="bold" size={16}>{p === 0 ? 'None' : `${p}%`}</Text>
                    {p > 0 && <Text size={12} color={C.muted}>${((cart.subtotal * p) / 100).toFixed(2)}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {creditBalance > 0 && (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <View style={{ flex: 1 }}>
                <Text weight="bold" size={16}>Store credit</Text>
                <Text size={14} weight={useCredit && creditApplied > 0 ? 'semibold' : 'regular'} color={useCredit && creditApplied > 0 ? C.green : C.muted}>
                  {useCredit && creditApplied > 0 ? `$${creditApplied.toFixed(2)} applied` : `$${creditBalance.toFixed(2)} available`}
                </Text>
              </View>
              <Switch value={useCredit} disabled={creditLocked} onValueChange={(v) => { tap(); setUseCredit(v); setServerCredit(null); }} trackColor={{ true: C.brand, false: '#E5E7EB' }} accessibilityLabel="Use store credit" />
            </Card>
          )}

          <Card>
            <Text weight="bold" size={17} style={{ marginBottom: S.sm }}>Order summary</Text>
            {cart.days.map((day) => (
              <View key={day._id} style={{ marginBottom: S.md }}>
                <Text weight="semibold" size={14} color={C.brandDark}>{(day.formattedDate ?? '').replace(/, \d{4}$/, '')}</Text>
                {day.items.map((it) => (
                  <View key={it._id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.md, marginTop: 6 }}>
                    <Text size={14} color={C.body} style={{ flex: 1 }}>{it.quantity} x {it.foodItem.name}</Text>
                    <Text size={14} weight="medium">${it.totalPrice.toFixed(2)}</Text>
                  </View>
                ))}
                {day.deliveryMessage && day.deliveryMessage.type !== 'success' && <Text size={12} color="#B45309" style={{ marginTop: 6 }}>{day.deliveryMessage.message}</Text>}
              </View>
            ))}
            <Divider style={{ marginVertical: S.sm }} />
            <Line label="Subtotal" value={totals.subtotal} />
            {hasAmount(fees) && <Line label={TAXES_FEES_TEXT} value={fees} info={() => toast(TAXES_FEES_TOOLTIP, 'info')} />}
            {hasAmount(totals.tip) && <Line label="Tip" value={totals.tip} />}
            <Divider style={{ marginVertical: S.sm }} />
            <Line label="Total" value={totals.total} bold />
            {creditApplied > 0 && <Line label="Store credit" value={-creditApplied} green />}
            {creditApplied > 0 && <Line label="To pay" value={cardPart} bold />}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <ActionBar>
        <Button
          label={preparing && !clientSecret && !covered ? 'Getting payment ready' : covered ? 'Place order' : `Pay  ·  $${(creditApplied > 0 ? cardPart : totals.total).toFixed(2)}`}
          onPress={pay}
          // while the payment is being prepared the button shows a spinner (orange), not a grey dead button
          loading={paying || (preparing && !clientSecret && !covered)}
        />
      </ActionBar>
      <AddressForm
        address={editingAddress}
        onClose={() => setEditingAddress(null)}
        onSaved={() => {
          const id = editingAddress?._id?.toString();
          setEditingAddress(null);
          void reloadAddresses();
          // the cart picks up the changed address
          if (id) void updateAddress(id).catch(() => {});
          toast('Address saved');
        }}
      />
    </SafeAreaView>
  );
}

function Line({ label, value, bold, green, info }: { label: string; value: number; bold?: boolean; green?: boolean; info?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text weight={bold ? 'bold' : 'regular'} size={bold ? 17 : 15} color={bold ? C.text : C.body}>{label}</Text>
        {info && <Ionicons name="information-circle-outline" size={18} color={C.muted} onPress={info} accessibilityLabel="What is included" />}
      </View>
      <Text weight={bold ? 'bold' : 'semibold'} size={bold ? 18 : 15} color={green ? C.green : C.text}>{value < 0 ? '-' : ''}${Math.abs(value).toFixed(2)}</Text>
    </View>
  );
}
