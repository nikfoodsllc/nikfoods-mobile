import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { authStore } from '../authStore';

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

type AddressForm = {
  name: string;
  email: string;
  phone: string;
  street_address: string;
  apartment: string;
  city: string;
  postal_code: string;
  isDefault: boolean;
};

const emptyForm: AddressForm = {
  name: '', email: '', phone: '', street_address: '',
  apartment: '', city: '', postal_code: '', isDefault: false,
};

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const googleRef = useRef<any>(null);

  const user = authStore.getUser();

  useEffect(() => {
    if (!authStore.getToken()) { router.replace('/(tabs)/login'); return; }
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const token = authStore.getToken();
    if (!token) { setLoading(false); return; }
    try {
      const response = await fetch(`${API_BASE}/address`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setAddresses(data.data.items || []);
    } catch (e) {
      console.log('Failed to fetch addresses');
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingAddress(null);
    setForm({ ...emptyForm, name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
    setError('');
    setShowForm(true);
  };

  const openEditForm = (address: Address) => {
    setEditingAddress(address);
    setForm({
      name: address.name, email: address.email, phone: address.phone || '',
      street_address: address.street_address, apartment: address.apartment || '',
      city: address.city, postal_code: address.postal_code, isDefault: address.isDefault || false,
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Please enter a name'); return; }
    if (!form.email.trim()) { setError('Please enter an email'); return; }
    if (!form.street_address.trim()) { setError('Please enter a street address'); return; }
    if (!form.city.trim()) { setError('Please enter a city'); return; }
    if (!form.postal_code.trim()) { setError('Please enter a zip code'); return; }

    setSaving(true);
    try {
      const token = authStore.getToken();
      if (!token) { setError('Not logged in'); setSaving(false); return; }
      const method = editingAddress ? 'PUT' : 'POST';
      const body = editingAddress ? { _id: editingAddress._id, ...form } : form;
      const response = await fetch(`${API_BASE}/address`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Failed to save address'); setSaving(false); return; }
      await fetchAddresses();
      setShowForm(false);
      setEditingAddress(null);
      setForm(emptyForm);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    try {
      const token = authStore.getToken();
      if (!token) return;
      const response = await fetch(`${API_BASE}/address?id=${addressId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) { await fetchAddresses(); setDeleteConfirm(null); }
    } catch (e) { console.log('Failed to delete'); }
  };

  const handleSetDefault = async (address: Address) => {
    setSaving(true);
    try {
      const token = authStore.getToken();
      if (!token) return;
      await fetch(`${API_BASE}/address`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...address, isDefault: true }),
      });
      await fetchAddresses();
    } catch (e) { console.log('Failed to set default'); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#E07B39" /></View>;

  if (showForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowForm(false)}>
            <Text style={styles.headerBack}>{'← Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editingAddress ? 'Edit address' : 'Add address'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput style={styles.input} placeholder="Enter full name" value={form.name} onChangeText={v => setForm({ ...form, name: v })} autoCapitalize="words" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} placeholder="Enter email" value={form.email} onChangeText={v => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone (optional)</Text>
            <TextInput style={styles.input} placeholder="Enter phone number" value={form.phone} onChangeText={v => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Street address</Text>
            <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowAddressSearch(true)}>
              <Text style={{ color: form.street_address ? '#1A1A1A' : '#aaa', fontSize: 15 }}>
                {form.street_address || 'Search your address...'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Apartment / Unit (optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. Apt 4B" value={form.apartment} onChangeText={v => setForm({ ...form, apartment: v })} />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>City</Text>
              <View style={[styles.input, styles.readonlyInput]}>
                <Text style={{ fontSize: 15, color: form.city ? '#1A1A1A' : '#aaa' }}>
                  {form.city || 'Auto-filled'}
                </Text>
              </View>
            </View>
            <View style={[styles.field, { width: 120 }]}>
              <Text style={styles.label}>Zip code</Text>
              <View style={[styles.input, styles.readonlyInput]}>
                <Text style={{ fontSize: 15, color: form.postal_code ? '#1A1A1A' : '#aaa' }}>
                  {form.postal_code || 'Auto-filled'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.defaultRow} onPress={() => setForm({ ...form, isDefault: !form.isDefault })}>
            <View style={[styles.checkbox, form.isDefault && styles.checkboxChecked]}>
              {form.isDefault && <Text style={styles.checkmark}>{'✓'}</Text>}
            </View>
            <Text style={styles.defaultLabel}>Set as default delivery address</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save address</Text>}
          </TouchableOpacity>
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
                const city = get('locality') || get('sublocality') || get('administrative_area_level_2');
                const zip = get('postal_code');
                setForm(prev => ({
                  ...prev,
                  street_address: `${streetNumber} ${route}`.trim(),
                  city,
                  postal_code: zip,
                }));
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBack}>{'← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery addresses</Text>
        <TouchableOpacity onPress={openAddForm}>
          <Text style={styles.headerAdd}>{'+ Add'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {addresses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No addresses yet</Text>
            <Text style={styles.emptySubtitle}>Add a delivery address to get started</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAddForm}>
              <Text style={styles.addBtnText}>Add address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map(address => (
            <View key={address._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardName}>{address.name}</Text>
                  {address.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View>}
                </View>
                <Text style={styles.cardAddress}>{address.street_address}{address.apartment ? `, ${address.apartment}` : ''}</Text>
                <Text style={styles.cardAddress}>{address.city}, {address.postal_code}</Text>
                {address.phone && <Text style={styles.cardPhone}>{address.phone}</Text>}
              </View>
              <View style={styles.cardActions}>
                {!address.isDefault && (
                  <TouchableOpacity onPress={() => handleSetDefault(address)}>
                    <Text style={styles.actionBtn}>Set as default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => openEditForm(address)}>
                  <Text style={styles.actionBtn}>Edit</Text>
                </TouchableOpacity>
                {deleteConfirm === address._id ? (
                  <View style={styles.deleteConfirmRow}>
                    <Text style={styles.deleteConfirmText}>Are you sure?</Text>
                    <TouchableOpacity onPress={() => handleDelete(address._id)}>
                      <Text style={styles.deleteConfirmYes}>Yes, delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDeleteConfirm(null)}>
                      <Text style={styles.deleteConfirmNo}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setDeleteConfirm(address._id)}>
                    <Text style={styles.deleteBtn}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E4' },
  headerBack: { fontSize: 14, color: '#E07B39', fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  headerAdd: { fontSize: 14, color: '#E07B39', fontWeight: '600', width: 60, textAlign: 'right' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' },
  addBtn: { backgroundColor: '#E07B39', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: '#E8E8E4' },
  cardHeader: { marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  defaultBadge: { backgroundColor: '#FFF3E8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  defaultBadgeText: { fontSize: 11, color: '#E07B39', fontWeight: '600' },
  cardAddress: { fontSize: 13, color: '#555', lineHeight: 20 },
  cardPhone: { fontSize: 13, color: '#888', marginTop: 4 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 0.5, borderTopColor: '#F0EDE8', paddingTop: 12 },
  actionBtn: { fontSize: 13, color: '#E07B39', fontWeight: '500' },
  deleteBtn: { fontSize: 13, color: '#CC3300', fontWeight: '500' },
  deleteConfirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteConfirmText: { fontSize: 12, color: '#CC3300' },
  deleteConfirmYes: { fontSize: 12, color: '#CC3300', fontWeight: '600' },
  deleteConfirmNo: { fontSize: 12, color: '#888' },
  formScroll: { padding: 20, paddingBottom: 60 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A1A', height: 48 },
  readonlyInput: { backgroundColor: '#F5F5F5', justifyContent: 'center', borderColor: '#E8E8E4' },
  row: { flexDirection: 'row', gap: 12 },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#E0D8D0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#E07B39', borderColor: '#E07B39' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  defaultLabel: { fontSize: 13, color: '#555' },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: '#FFCCCC' },
  errorText: { color: '#CC3300', fontSize: 13 },
  saveBtn: { backgroundColor: '#E07B39', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});