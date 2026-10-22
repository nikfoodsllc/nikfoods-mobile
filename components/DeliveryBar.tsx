import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, FONT, R, S, shadowSm } from '@/constants/theme';
import AddressForm from '@/components/AddressForm';
import { Button, Sheet, Text, tap } from '@/components/ui';
import { IAddress } from '@/types/auth';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useAddresses } from '@/lib/useAddresses';

/** Where we deliver: one tap opens a sheet to enter a zip or pick a saved address. Shows the minimum order for the zip. */
export default function DeliveryBar() {
  const toast = useToast();
  const { user } = useAuth();
  const { selectedZipcode, minOrderValue, updateAddress, updateZipcode, cart } = useCart();
  const { addresses, selectedAddressId, reload } = useAddresses();
  const [open, setOpen] = useState(false);
  const [zip, setZip] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // adding or changing an address happens right here (a form over the page you are on), never on another screen
  const [form, setForm] = useState<IAddress | 'new' | null>(null);
  const idsBefore = React.useRef<string[]>([]);
  const openForm = (target: IAddress | 'new') => {
    idsBefore.current = addresses.map((a) => a._id?.toString() ?? '');
    setOpen(false);
    // the first sheet has to finish closing before the next one can open
    setTimeout(() => setForm(target), 380);
  };
  const saved = async () => {
    const was = form;
    setForm(null);
    await reload();
    // a new address becomes the delivery address
    if (was === 'new') {
      try {
        const token = localStorage.getItem('accessToken');
        const r = await fetch('/api/address', { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        const fresh = (Array.isArray(j?.data?.items) ? (j.data.items as IAddress[]) : []).find((a) => !idsBefore.current.includes(a._id?.toString() ?? ''));
        if (fresh?._id) await updateAddress(fresh._id.toString());
      } catch {
        // saved; it can be chosen from the list
      }
    } else if (was && selectedAddressId && was._id?.toString() === selectedAddressId) {
      // the address in use was changed: the cart picks up the new details
      await updateAddress(selectedAddressId).catch(() => {});
    }
    toast('Address saved');
  };
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

  // A complete 5 digit zip is applied as soon as it is typed: tapping "Set" while the keyboard is up did not register on iPhones (the
  // first touch only closed the keyboard), so nobody has to depend on that tap. "Set" and the keyboard's Done key still work.
  useEffect(() => {
    if (!open || busy || !/^\d{5}$/.test(zip)) return;
    const t = setTimeout(() => void submitZip(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, open]);

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
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, borderRadius: R.pill, paddingVertical: 10, paddingLeft: 10, paddingRight: S.lg, opacity: pressed ? 0.9 : 1 }, shadowSm]}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="location" size={18} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="semibold" size={15} numberOfLines={1}>{line}</Text>
          <Text size={13} color={C.muted}>{minOrderValue && minOrderValue > 0 ? `Daily minimum $${minOrderValue.toFixed(2)}` : 'Daily minimum shows after you add a zip'}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={C.muted} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Deliver to" footer={
        <View>
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
        </View>
      }>
        {user && (
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
                  <Pressable onPress={() => openForm(a)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit address" style={{ paddingHorizontal: S.sm, paddingVertical: 6 }}>
                    <Text weight="semibold" size={14} color={C.brandDark}>Edit</Text>
                  </Pressable>
                </Pressable>
              );
            })}
            <Button variant="outline" icon="add" label="Add address" onPress={() => openForm('new')} />
          </View>
        )}
      </Sheet>
      <AddressForm address={form} onClose={() => setForm(null)} onSaved={() => void saved()} />
    </>
  );
}
