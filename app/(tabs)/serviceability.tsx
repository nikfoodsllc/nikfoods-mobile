import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { authStore } from '../authStore';
import { checkZipcode } from '../zipcodeStore';

const API_BASE = 'https://www.nikfoods.com/api';
const GOOGLE_KEY = 'AIzaSyCxtbWsrKTYaGh4UqkuF_XNPNUXWrGF97I';

export default function ServiceabilityScreen() {
  const [street, setStreet] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const user = authStore.getUser();

  const handleCheckAndSave = async () => {
    if (!street.trim()) { setError('Please search and select your address'); return; }
    if (!zipcode.trim()) { setError('Zip code is required'); return; }

    setChecking(true);
    setError('');

    try {
      const config = await checkZipcode(zipcode);

      if (!config.isServiceable) {
        setError(`Sorry, we don't deliver to zip code ${zipcode} yet. Please try a different address.`);
        setChecking(false);
        return;
      }

      const token = authStore.getToken();
      await fetch(`${API_BASE}/address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          street_address: street,
          apartment: apartment,
          city: city,
          postal_code: zipcode,
          isDefault: true,
        }),
      });

      router.replace('/(tabs)');
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery address</Text>
        <Text style={styles.headerSubtitle}>
          Let us check if we deliver to your area
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.welcomeText}>
          {'Welcome, ' + (user?.name?.split(' ')[0] || 'there') + '! 👋'}
        </Text>
        <Text style={styles.welcomeSubtext}>
          Add your delivery address so we can confirm serviceability and show you the right menu.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{'⚠️ ' + error}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Street address <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.input, { justifyContent: 'center' }]}
            onPress={() => setShowAddressSearch(true)}
          >
            <Text style={{ color: street ? '#1A1A1A' : '#aaa', fontSize: 15 }}>
              {street || 'Search your address...'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Apartment / Unit (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Apt 4B"
            value={apartment}
            onChangeText={setApartment}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>City</Text>
            <View style={[styles.input, styles.readonlyInput]}>
              <Text style={{ fontSize: 15, color: city ? '#1A1A1A' : '#aaa' }}>
                {city || 'Auto-filled'}
              </Text>
            </View>
          </View>
          <View style={[styles.field, { width: 120 }]}>
            <Text style={styles.label}>Zip code</Text>
            <View style={[styles.input, styles.readonlyInput]}>
              <Text style={{ fontSize: 15, color: zipcode ? '#1A1A1A' : '#aaa' }}>
                {zipcode || 'Auto-filled'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.checkBtn, checking && styles.checkBtnDisabled]}
          onPress={handleCheckAndSave}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkBtnText}>Check & save address</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          We currently deliver to select zip codes in the Seattle area. You can update your address anytime from your account.
        </Text>
      </ScrollView>

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
              const cityVal = get('locality') || get('sublocality') || get('administrative_area_level_2');
              const zip = get('postal_code');
              setStreet(`${streetNumber} ${route}`.trim());
              setCity(cityVal);
              setZipcode(zip);
              setShowAddressSearch(false);
            }}
            query={{ key: GOOGLE_KEY, language: 'en', components: 'country:us', types: 'address' }}
            enablePoweredByContainer={false}
            keyboardShouldPersistTaps="always"
            styles={{
              container: { flex: 1, paddingHorizontal: 16 },
              textInput: {
                backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#E0D8D0',
                borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', height: 48,
              },
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  header: { backgroundColor: '#E07B39', paddingTop: 70, paddingBottom: 24, paddingHorizontal: 24 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: '#FFE5D0', lineHeight: 20 },
  scroll: { padding: 24, paddingBottom: 60 },
  welcomeText: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  welcomeSubtext: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 24 },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFCCCC' },
  errorText: { color: '#CC3300', fontSize: 13, lineHeight: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  required: { color: '#E07B39' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', height: 48 },
  readonlyInput: { backgroundColor: '#F5F5F5', justifyContent: 'center', borderColor: '#E8E8E4' },
  row: { flexDirection: 'row', gap: 12 },
  checkBtn: { backgroundColor: '#E07B39', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  checkBtnDisabled: { backgroundColor: '#ccc' },
  checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  skipBtnText: { fontSize: 15, color: '#888', fontWeight: '500' },
  note: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 20, lineHeight: 18 },
});