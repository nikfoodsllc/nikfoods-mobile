import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { authStore } from '../authStore';
import { calculateCartClubbing } from '../cartLogic';
import { cartStore } from '../cartStore';
import { zipcodeStore } from '../zipcodeStore';

const STRIPE_KEY = 'pk_live_51HdWaqKA6kkBLygB9g6lJ8QBu5pTCeXfno0x3b7rPV2KFLIf9RziEMPoUd7K3uZyXOEkPxJjMLzCZ2PTO3w2UBqm00kjva9C6K';
const API_BASE = 'https://www.nikfoods.com/api';
const GOOGLE_KEY = 'AIzaSyCxtbWsrKTYaGh4UqkuF_XNPNUXWrGF97I';

type Address = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  street_address: string;
  apartment?: string;
  city: string;
  postal_code: string;
  isDefault?: boolean;
};

function CheckoutForm() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [items, setItems] = useState(cartStore.getItems());
  const [total, setTotal] = useState(cartStore.getTotal());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [newStreet, setNewStreet] = useState('');
  const [newApartment, setNewApartment] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newZip, setNewZip] = useState('');
  const [saveToProfile, setSaveToProfile] = useState(true);

  const user = authStore.getUser();
  const effectiveMin = zipcodeStore.getMinOrderValue() || 25;
  const clubbingResult = calculateCartClubbing(items, effectiveMin);

  useEffect(() => {
    setError('');
    const unsubscribe = cartStore.subscribe(() => {
      setItems([...cartStore.getItems()]);
      setTotal(cartStore.getTotal());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const load = async () => {
      await authStore.loadFromStorage();
      const t = authStore.getToken();
      if (t) await fetchAddresses();
      else setLoadingAddresses(false);
    };
    load();
  }, []);

  const fetchAddresses = async () => {
    try {
      const currentToken = authStore.getToken();
      if (!currentToken) { setLoadingAddresses(false); return; }
      const response = await fetch(`${API_BASE}/address`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await response.json();
      if (data.success) {
        const addrs = data.data.items || [];
        if (addrs.length > 0) {
          setAddresses([...addrs]);
          const defaultAddr = addrs.find((a: Address) => a.isDefault) || addrs[0];
          setSelectedAddress({ ...defaultAddr });
        }
      }
    } catch (e) {
      console.log('Failed to fetch addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const getDeliveryAddress = () => {
    if (selectedAddress) {
      return `${selectedAddress.street_address}${selectedAddress.apartment ? ', ' + selectedAddress.apartment : ''}, ${selectedAddress.city}, ${selectedAddress.postal_code}`;
    }
    if (newStreet) {
      return `${newStreet}${newApartment ? ', ' + newApartment : ''}, ${newCity}, ${newZip}`;
    }
    return '';
  };

  const isAddressReady = selectedAddress || (newStreet.trim() && newCity.trim() && newZip.trim());

  const handlePlaceOrder = async () => {
    setError('');
    if (!selectedAddress) {
      if (!newStreet.trim()) { setError('Please search and select a delivery address'); return; }
      if (!newCity.trim() || !newZip.trim()) { setError('Please select a valid address with city and zip code'); return; }
    }
    setLoading(true);
    try {
      if (!selectedAddress && newStreet && saveToProfile) {
        await fetch(`${API_BASE}/address`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.getToken()}` },
          body: JSON.stringify({
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            street_address: newStreet,
            apartment: newApartment,
            city: newCity,
            postal_code: newZip,
            isDefault: true,
          }),
        });
      }

      const response = await fetch(`${API_BASE}/mobile-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          currency: 'usd',
          customerEmail: user?.email || '',
          customerName: user?.name || '',
          metadata: {
            phone: user?.phone || '',
            address: getDeliveryAddress(),
            notes,
            source: 'ios_app',
          },
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
        defaultBillingDetails: {
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
        },
        applePay: { merchantCountryCode: 'US' },
        style: 'automatic',
      });

      if (initError) { setError(initError.message); setLoading(false); return; }

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

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <Text style={styles.guestEmoji}>🙏</Text>
        <Text style={styles.guestTitle}>Welcome to NikFoods!</Text>
        <Text style={styles.guestMessage}>
          We'd love to have you as part of our family. Kindly sign up or sign in to place your order with us — it only takes a minute!
        </Text>
        <TouchableOpacity style={styles.guestSignupBtn} onPress={() => router.push('/(tabs)/signup')}>
          <Text style={styles.guestSignupBtnText}>Create account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.guestLoginBtn} onPress={() => router.push('/(tabs)/login')}>
          <Text style={styles.guestLoginBtnText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadingAddresses) {
    return (
      <View style={styles.guestContainer}>
        <ActivityIndicator size="large" color="#E07B39" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>{'← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Order Summary */}
        <Text style={styles.sectionTitle}>Order summary</Text>
        {clubbingResult.dayAnalysis.map((day) => {
          const dayItems = items.filter(item => item.deliveryDate === day.date);
          const isClubbed = !!day.deliveryMessage?.deliveryDate &&
            day.deliveryMessage.deliveryDate !== day.dateFormatted;
          const deliveryDate = isClubbed
            ? day.deliveryMessage!.deliveryDate!
            : day.dateFormatted;

          return (
            <View key={day.date} style={styles.summaryGroup}>
              <View style={styles.summaryDateHeader}>
                <Text style={styles.summaryDateText}>{'📋 Menu: ' + day.dateFormatted}</Text>
                <Text style={styles.summaryDeliveryDate}>{'🚚 Delivers: ' + deliveryDate}</Text>
              </View>
              {dayItems.map(item => (
                <View key={item.id + item.deliveryDate} style={styles.summaryRow}>
                  <Text style={styles.summaryName}>{item.quantity + 'x ' + item.name}</Text>
                  <Text style={styles.summaryPrice}>{'$' + (item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{'$' + total.toFixed(2)}</Text>
        </View>

        {/* Your Details */}
        <Text style={styles.sectionTitle}>Your details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{user.name}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user.email}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{user.phone || 'Not provided'}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <Text style={styles.sectionTitle}>Delivery address</Text>

        {addresses.length > 0 ? (
          <View>
            {selectedAddress && (
              <View style={styles.addressCard}>
                <View style={styles.addressCardContent}>
                  <Text style={styles.addressName}>{selectedAddress.name}</Text>
                  <Text style={styles.addressLine}>
                    {selectedAddress.street_address}
                    {selectedAddress.apartment ? ', ' + selectedAddress.apartment : ''}
                  </Text>
                  <Text style={styles.addressLine}>
                    {selectedAddress.city + ', ' + selectedAddress.postal_code}
                  </Text>
                  {selectedAddress.phone && (
                    <Text style={styles.addressPhone}>{selectedAddress.phone}</Text>
                  )}
                </View>
                {addresses.length > 1 && (
                  <TouchableOpacity style={styles.changeAddressBtn} onPress={() => setShowAddressPicker(true)}>
                    <Text style={styles.changeAddressBtnText}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : (
          <View>
            <View style={styles.noAddressNote}>
              <Text style={styles.noAddressNoteText}>No saved address found. Please enter your delivery address below.</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Street address <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowAddressSearch(true)}>
                <Text style={{ color: newStreet ? '#1A1A1A' : '#aaa', fontSize: 15 }}>
                  {newStreet || 'Search your address...'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Apartment / Unit (optional)</Text>
              <TextInput style={styles.input} placeholder="e.g. Apt 4B" value={newApartment} onChangeText={setNewApartment} />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>City</Text>
                <View style={[styles.input, styles.readonlyInput]}>
                  <Text style={{ fontSize: 15, color: newCity ? '#1A1A1A' : '#aaa' }}>{newCity || 'Auto-filled'}</Text>
                </View>
              </View>
              <View style={[styles.field, { width: 120 }]}>
                <Text style={styles.fieldLabel}>Zip code</Text>
                <View style={[styles.input, styles.readonlyInput]}>
                  <Text style={{ fontSize: 15, color: newZip ? '#1A1A1A' : '#aaa' }}>{newZip || 'Auto-filled'}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.saveAddressRow} onPress={() => setSaveToProfile(!saveToProfile)}>
              <View style={[styles.checkbox, saveToProfile && styles.checkboxChecked]}>
                {saveToProfile && <Text style={styles.checkmark}>{'✓'}</Text>}
              </View>
              <Text style={styles.saveAddressLabel}>Save this address to my profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Special Instructions */}
        <Text style={styles.sectionTitle}>Special instructions (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="Any special requests or notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{'⚠️ ' + error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.placeOrderBtn, (loading || !isAddressReady) && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading || !isAddressReady}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderBtnText}>
              {!isAddressReady ? 'Add delivery address to continue' : 'Pay $' + total.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>Payment is processed securely by Stripe. Apple Pay is supported.</Text>
      </ScrollView>

      {/* Address Picker Modal */}
      <Modal visible={showAddressPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose delivery address</Text>
            {addresses.map(addr => (
              <TouchableOpacity
                key={addr._id}
                style={[styles.addressOption, selectedAddress?._id === addr._id && styles.addressOptionSelected]}
                onPress={() => { setSelectedAddress(addr); setShowAddressPicker(false); }}
              >
                <View style={styles.addressOptionContent}>
                  <Text style={styles.addressOptionName}>{addr.name}</Text>
                  <Text style={styles.addressOptionLine}>{addr.street_address}{addr.apartment ? ', ' + addr.apartment : ''}</Text>
                  <Text style={styles.addressOptionLine}>{addr.city + ', ' + addr.postal_code}</Text>
                </View>
                <View style={styles.addressOptionRight}>
                  {addr.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                  {selectedAddress?._id === addr._id && (
                    <Text style={styles.addressOptionCheck}>{'✓'}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowAddressPicker(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Google Places Address Search Modal */}
      <Modal visible={showAddressSearch} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 60 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
            <TouchableOpacity onPress={() => setShowAddressSearch(false)} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 16, color: '#E07B39', fontWeight: '500' }}>{'← Back'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A' }}>Search address</Text>
          </View>
          <GooglePlacesAutocomplete
            placeholder="Start typing your address..."
            fetchDetails={true}
            onPress={(data, details) => {
              const components = details?.address_components || [];
              const get = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || '';
              const streetNumber = get('street_number');
              const route = get('route');
              const city = get('locality') || get('sublocality') || get('administrative_area_level_2');
              const zip = get('postal_code');
              setNewStreet(`${streetNumber} ${route}`.trim());
              setNewCity(city);
              setNewZip(zip);
              setShowAddressSearch(false);
            }}
            query={{ key: GOOGLE_KEY, language: 'en', components: 'country:us', types: 'address' }}
            enablePoweredByContainer={false}
            keyboardShouldPersistTaps="always"
            styles={{
              container: { flex: 1, paddingHorizontal: 16 },
              textInput: { backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', height: 48 },
              listView: { backgroundColor: '#fff' },
              row: { padding: 14, backgroundColor: '#fff' },
              description: { fontSize: 15, color: '#333' },
              separator: { height: 0.5, backgroundColor: '#F0EDE8' },
            }}
          />
        </View>
      </Modal>
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
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#FFF8F3' },
  guestEmoji: { fontSize: 56, marginBottom: 16 },
  guestTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, textAlign: 'center' },
  guestMessage: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  guestSignupBtn: { backgroundColor: '#E07B39', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, marginBottom: 12, width: '100%', alignItems: 'center' },
  guestSignupBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  guestLoginBtn: { paddingVertical: 14, alignItems: 'center' },
  guestLoginBtnText: { color: '#E07B39', fontSize: 14, fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E4' },
  backBtn: { fontSize: 14, color: '#E07B39', fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  scroll: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginTop: 24, marginBottom: 12 },
  summaryGroup: { marginBottom: 12 },
  summaryDateHeader: { backgroundColor: '#FFF3E8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 8 },
  summaryDateText: { fontSize: 13, fontWeight: '600', color: '#E07B39' },
  summaryDeliveryDate: { fontSize: 12, color: '#2E7D32', fontWeight: '500', marginTop: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryName: { fontSize: 14, color: '#333', flex: 1 },
  summaryPrice: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 0.5, borderTopColor: '#E8E8E4', marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#E07B39' },
  detailsCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#E8E8E4', overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  detailLabel: { fontSize: 14, color: '#888' },
  detailValue: { fontSize: 14, fontWeight: '500', color: '#1A1A1A', flex: 1, textAlign: 'right' },
  detailDivider: { height: 0.5, backgroundColor: '#F0EDE8', marginHorizontal: 14 },
  addressCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: '#E8E8E4', flexDirection: 'row', alignItems: 'flex-start' },
  addressCardContent: { flex: 1 },
  addressName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  addressLine: { fontSize: 13, color: '#555', lineHeight: 20 },
  addressPhone: { fontSize: 13, color: '#888', marginTop: 4 },
  changeAddressBtn: { backgroundColor: '#FFF3E8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 0.5, borderColor: '#E07B39' },
  changeAddressBtnText: { fontSize: 13, color: '#E07B39', fontWeight: '600' },
  noAddressNote: { backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFE082' },
  noAddressNoteText: { fontSize: 13, color: '#795548' },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  required: { color: '#E07B39' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', height: 48 },
  readonlyInput: { backgroundColor: '#F5F5F5', justifyContent: 'center', borderColor: '#E8E8E4' },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  saveAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#E0D8D0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#E07B39', borderColor: '#E07B39' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  saveAddressLabel: { fontSize: 13, color: '#555' },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFCCCC' },
  errorText: { color: '#CC3300', fontSize: 13, lineHeight: 20 },
  placeOrderBtn: { backgroundColor: '#E07B39', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  placeOrderBtnDisabled: { backgroundColor: '#ccc' },
  placeOrderBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 16, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  addressOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#F0EDE8' },
  addressOptionSelected: {},
  addressOptionContent: { flex: 1 },
  addressOptionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressOptionName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  addressOptionLine: { fontSize: 13, color: '#555', lineHeight: 18 },
  addressOptionCheck: { color: '#E07B39', fontSize: 18, fontWeight: '700' },
  defaultBadge: { backgroundColor: '#FFF3E8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  defaultBadgeText: { fontSize: 11, color: '#E07B39', fontWeight: '600' },
  modalClose: { marginTop: 20, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E0D8D0' },
  modalCloseText: { fontSize: 15, color: '#666', fontWeight: '500' },
});