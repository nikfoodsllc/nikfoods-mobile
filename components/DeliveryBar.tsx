import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { C, FONT, R, S, shadowSm } from '@/constants/theme';
import { Button, Sheet, Text, tap } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useAddresses } from '@/lib/useAddresses';

/** Where we deliver: one tap opens a sheet to enter a zip or pick a saved address. Shows the minimum order for the zip. */
export default function DeliveryBar() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { selectedZipcode, minOrderValue, updateAddress, updateZipcode, cart } = useCart();
  const { addresses, selectedAddressId } = useAddresses();
  const [open, setOpen] = useState(false);
  const [zip, setZip] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const current = addresses.find((a) => a._id?.toString() === selectedAddressId);
  const line = current ? `${current.street_address.split(',')[0]}` : selectedZipcode ? `Zip ${selectedZipcode}` : 'Add your zip code';

  const submitZip = async () => {
    const z = zip.trim();
    if (!/^\d{5}(-\d{4})?$/.test(z)) {
      setError('Enter a 5 digit zip code');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/zipcode-config?zipcode=${encodeURIComponent(z)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setError(data.message || data.error || "We don't deliver there yet");
        return;
      }
      await updateZipcode(z);
      setOpen(false);
      setZip('');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const pick = (id: string) => {
    void updateAddress(id).catch(() => toast('Could not select that address', 'error'));
    setOpen(false);
  };

  void cart;
  return (
    <>
      <Pressable
        onPress={() => {
          tap();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Change delivery location"
        style={[{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.cream, borderWidth: 1, borderColor: C.creamLine, borderRadius: R.lg, paddingVertical: S.md, paddingHorizontal: S.md }]}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="location" size={18} color={C.onBrand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="semibold" size={15} numberOfLines={1}>{line}</Text>
          <Text size={13} color={C.muted}>{minOrderValue && minOrderValue > 0 ? `Daily minimum $${minOrderValue.toFixed(2)}` : 'Daily minimum shows after you add a zip'}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={C.muted} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Deliver to">
        {user && addresses.length > 0 && (
          <View style={{ marginBottom: S.lg }}>
            {addresses.map((a) => {
              const id = a._id?.toString() ?? '';
              const on = id === selectedAddressId;
              return (
                <Pressable key={id} onPress={() => pick(id)} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.lg, borderWidth: 1.5, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.cream : C.white, marginBottom: S.sm }}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? C.brand : '#D1D5DB'} />
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold" size={15} numberOfLines={2}>{a.street_address}</Text>
                    <Text size={13} color={C.muted}>{[a.apartment, a.city, a.postal_code].filter(Boolean).join(', ')}</Text>
                  </View>
                </Pressable>
              );
            })}
            <Button
              variant="outline"
              icon="add"
              label="Add address"
              onPress={() => {
                setOpen(false);
                router.push('/addresses');
              }}
            />
          </View>
        )}
        <Text weight="semibold" size={15} style={{ marginBottom: S.sm }}>{user && addresses.length > 0 ? 'Or use a zip code' : 'Zip code'}</Text>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <TextInput
            value={zip}
            onChangeText={(t) => {
              setZip(t.replace(/[^\d-]/g, '').slice(0, 10));
              setError('');
            }}
            placeholder="98109"
            placeholderTextColor={C.faint}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={submitZip}
            style={[{ flex: 1, height: 52, borderRadius: R.md, borderWidth: 1.5, borderColor: error ? C.red : C.line, paddingHorizontal: S.lg, fontFamily: FONT.medium, fontSize: 17, color: C.text }, shadowSm]}
          />
          <Button label="Set" onPress={submitZip} loading={busy} style={{ minWidth: 88 }} />
        </View>
        {!!error && <Text size={13} color={C.red} style={{ marginTop: S.sm }}>{error}</Text>}
      </Sheet>
    </>
  );
}
