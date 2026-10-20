import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Field from '@/components/Field';
import { Button, Sheet, Text } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { IAddress } from '@/types/auth';

type Prediction = { place_id: string; description: string };

/** Add or edit a saved address: search a Washington address, then the apartment, gate code and delivery instruction (30 characters). */
export default function AddressForm({ address, onClose, onSaved }: { address: IAddress | null | 'new'; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const editing = address && address !== 'new' ? address : null;
  const open = address !== null;

  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [apt, setApt] = useState('');
  const [gate, setGate] = useState('');
  const [note, setNote] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setOptions([]);
    setErrors({});
    setStreet(editing?.street_address ?? '');
    setCity(editing?.city ?? '');
    setZip(editing?.postal_code ?? '');
    setApt(editing?.apartment ?? '');
    setGate(editing?.entrance ?? '');
    setNote(editing?.floor ?? '');
    setName(editing?.name ?? user?.name ?? '');
    setEmail(editing?.email ?? user?.email ?? '');
    setPhone(editing?.phone ?? user?.phone ?? '');
    setIsDefault(Boolean(editing?.isDefault));
  }, [open, editing, user]);

  const search = (text: string) => {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 3) {
      setOptions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/places?input=${encodeURIComponent(text)}`);
        const j = await r.json();
        setOptions(r.ok && j.data?.data?.predictions ? j.data.data.predictions : []);
      } catch {
        setOptions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const choose = async (p: Prediction) => {
    setSearching(true);
    try {
      const r = await fetch(`/api/places/details?place_id=${encodeURIComponent(p.place_id)}`);
      const j = await r.json();
      if (r.ok && j.data) {
        setStreet(j.data.street || '');
        setCity(j.data.city || j.data.town || '');
        setZip(j.data.pincode || '');
        setQuery('');
        setOptions([]);
      }
    } finally {
      setSearching(false);
    }
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (street.trim().length < 5) e.street = 'Search for your address above';
    if (!/^\d{5}(-\d{4})?$/.test(zip.trim())) e.zip = 'Enter a 5 digit zip';
    if (city.trim().length < 2) e.city = 'City is required';
    if (name.trim().length < 2) e.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (phone.trim() && phone.replace(/\D/g, '').length !== 10) e.phone = 'Enter a 10 digit phone number';
    if (apt.length > 10) e.apt = 'At most 10 characters';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = { ...(editing ? { _id: editing._id } : {}), name: name.trim(), email: email.trim(), phone: phone.replace(/\D/g, ''), street_address: street.trim(), city: city.trim(), province: 'WA', postal_code: zip.trim(), apartment: apt.trim(), entrance: gate.trim(), floor: note.replace(/\s+/g, ' ').trim().slice(0, 30), isDefault };
      const r = await authenticatedFetch('/api/address', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrors({ general: j.error || 'Could not save the address' });
        return;
      }
      onSaved();
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={open} onClose={onClose} title={editing ? 'Edit address' : 'New address'} full footer={<Button label="Save address" onPress={save} loading={busy} />}>
      <Field label="Search your address" value={query} onChangeText={search} placeholder="Start typing a Washington address" autoCorrect={false} right={searching ? <ActivityIndicator color={C.brand} /> : <Ionicons name="search" size={20} color={C.faint} />} />
      {options.length > 0 && (
        <View style={{ marginTop: -S.sm, marginBottom: S.lg, borderRadius: R.md, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
          {options.slice(0, 5).map((p, i) => (
            <Pressable key={p.place_id} testID={`place-option-${i}`} onPress={() => choose(p)} style={{ padding: S.md, borderTopWidth: i ? 1 : 0, borderTopColor: C.line, flexDirection: 'row', gap: S.sm, alignItems: 'center' }}>
              <Ionicons name="location-outline" size={18} color={C.muted} />
              <Text size={14} style={{ flex: 1 }} numberOfLines={2}>{p.description}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Field label="Street" value={street} onChangeText={setStreet} error={errors.street} />
      <View style={{ flexDirection: 'row', gap: S.md }}>
        <View style={{ flex: 2 }}><Field label="City" value={city} onChangeText={setCity} error={errors.city} /></View>
        <View style={{ flex: 1.2 }}><Field label="Zip" value={zip} onChangeText={(t) => setZip(t.replace(/[^\d-]/g, '').slice(0, 10))} error={errors.zip} keyboardType="number-pad" /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: S.md }}>
        <View style={{ flex: 1 }}><Field label="Apartment" value={apt} onChangeText={(t) => setApt(t.slice(0, 10))} error={errors.apt} /></View>
        <View style={{ flex: 1 }}><Field label="Gate code" value={gate} onChangeText={setGate} /></View>
      </View>
      <Field label="Delivery instructions" value={note} onChangeText={(t) => setNote(t.slice(0, 30))} placeholder="For example: Leave with the front desk" right={<Text size={12} color={C.faint}>{note.length}/30</Text>} />
      <Field label="Name" value={name} onChangeText={setName} error={errors.name} autoComplete="name" />
      <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Phone" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: S.sm }}>
        <Text weight="semibold" size={15}>Make this my default address</Text>
        <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: C.brand, false: '#E5E7EB' }} />
      </View>
      {!!errors.general && (
        <View style={{ padding: S.md, borderRadius: R.md, backgroundColor: C.redBg, marginTop: S.md }}>
          <Text size={14} color={C.red}>{errors.general}</Text>
        </View>
      )}
    </Sheet>
  );
}
