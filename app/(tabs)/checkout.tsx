import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { cartStore } from '../cartStore';

const STRIPE_KEY = 'pk_live_51HdWaqKA6kkBLygB9g6lJ8QBu5pTCeXfno0x3b7rPV2KFLIf9RziEMPoUd7K3uZyXOEkPxJjMLzCZ2PTO3w2UBqm00kjva9C6K';
const API_BASE = 'https://www.nikfoods.com/api';

function CheckoutForm() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [items, setItems] = useState(cartStore.getItems());
  const [total, setTotal] = useState(cartStore.getTotal());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = cartStore.subscribe(() => {
      setItems([...cartStore.getItems()]);
      setTotal(cartStore.getTotal());
    });
    return unsubscribe;
  }, []);

  const groupedByDate = items.reduce((groups: Record<string, typeof items>, item) => {
    const date = item.deliveryDateFormatted;
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
    return groups;
  }, {});

  const handlePlaceOrder = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    if (!address.trim()) { setError('Please enter your delivery address'); return; }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/mobile-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          currency: 'usd',
          customerEmail: email,
          customerName: name,
          metadata: { phone, address, notes, source: 'ios_app' },
        }),
      });

      const data = await response.json();

      if (!data.clientSecret) {
        setError('Could not connect to payment system. Please try again.');
        setLoading(false);
        return;
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: 'NikFoods',
        defaultBillingDetails: { name, email, phone },
        applePay: { merchantCountryCode: 'US' },
        style: 'automatic',
      });

      if (initError) {
        setError(initError.message);
        setLoading(false);
        return;
      }

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') setError(paymentError.message);
        setLoading(false);
        return;
      }

      cartStore.clear();
      router.replace('/(tabs)/confirmation');

    } catch (e) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>{'← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Order summary</Text>
        {Object.entries(groupedByDate).map(([date, dateItems]) => (
          <View key={date} style={styles.summaryGroup}>
            <View style={styles.summaryDateHeader}>
              <Text style={styles.summaryDateText}>{'Delivery: ' + date}</Text>
            </View>
            {dateItems.map(item => (
              <View key={item.id + item.deliveryDate} style={styles.summaryRow}>
                <Text style={styles.summaryName}>{item.quantity + 'x ' + item.name}</Text>
                <Text style={styles.summaryPrice}>{'$' + (item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{'$' + total.toFixed(2)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Your details</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Full name</Text>
          <TextInput style={styles.input} placeholder="Enter your name" value={name} onChangeText={setName} autoCapitalize="words" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput style={styles.input} placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Phone number</Text>
          <TextInput style={styles.input} placeholder="Enter your phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Delivery address</Text>
          <TextInput style={[styles.input, styles.inputMulti]} placeholder="Enter your full delivery address" value={address} onChangeText={setAddress} multiline numberOfLines={3} />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Special instructions (optional)</Text>
          <TextInput style={[styles.input, styles.inputMulti]} placeholder="Any special requests or notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.placeOrderBtn, loading && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.placeOrderBtnText}>{'Pay $' + total.toFixed(2)}</Text>}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>{'Payment is processed securely by Stripe. Apple Pay is supported.'}</Text>
      </ScrollView>
    </View>
  );
}

export default function CheckoutScreen() {
  return (
    <StripeProvider publishableKey={STRIPE_KEY} merchantIdentifier="merchant.com.nikfoods">
      <CheckoutForm />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E4' },
  backBtn: { fontSize: 14, color: '#E07B39', fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  scroll: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginTop: 24, marginBottom: 12 },
  summaryGroup: { marginBottom: 12 },
  summaryDateHeader: { backgroundColor: '#FFF3E8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  summaryDateText: { fontSize: 13, fontWeight: '600', color: '#E07B39' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryName: { fontSize: 14, color: '#333', flex: 1 },
  summaryPrice: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 0.5, borderTopColor: '#E8E8E4', marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#E07B39' },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A' },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  error: { color: '#CC3300', fontSize: 14, marginBottom: 16, textAlign: 'center' },
  placeOrderBtn: { backgroundColor: '#E07B39', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  placeOrderBtnDisabled: { backgroundColor: '#ccc' },
  placeOrderBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 16, lineHeight: 18 },
});