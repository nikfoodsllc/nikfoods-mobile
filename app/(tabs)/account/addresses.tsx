import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddressForm from '@/components/AddressForm';
import { useToast } from '@/components/Toast';
import { Button, Card, Text } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useCart } from '@/contexts/CartContext';
import { useApiClient } from '@/hooks/useApiClient';
import { useAddresses } from '@/lib/useAddresses';
import { IAddress } from '@/types/auth';

export default function Addresses() {
  const router = useRouter();
  const toast = useToast();
  const { authenticatedFetch } = useApiClient();
  const { clearSelectedAddressIfDeleted, updateAddress } = useCart();
  const { addresses, reload, selectedAddressId } = useAddresses();
  const [editing, setEditing] = useState<IAddress | 'new' | null>(null);

  const remove = (a: IAddress) => {
    Alert.alert('Delete this address?', a.street_address, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const id = a._id?.toString() ?? '';
            const r = await authenticatedFetch(`/api/address?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!r.ok) throw new Error('x');
            await clearSelectedAddressIfDeleted(id);
            await reload();
            toast('Address deleted');
          } catch {
            toast('Could not delete the address', 'error');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, paddingVertical: S.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text weight="bold" size={22} style={{ marginLeft: S.md }}>Addresses</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 120 }}>
        {addresses.length === 0 && <Text color={C.muted} style={{ textAlign: 'center', marginTop: S.xl }}>No saved addresses yet</Text>}
        {addresses.map((a) => {
          const id = a._id?.toString() ?? '';
          const on = id === selectedAddressId;
          return (
            <Card key={id}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.md }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text weight="semibold" size={16}>{a.street_address}</Text>
                    {a.isDefault && <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: C.cream }}><Text size={11} weight="bold" color={C.brandDark}>Default</Text></View>}
                  </View>
                  <Text size={14} color={C.muted} style={{ marginTop: 2 }}>{[a.apartment, a.city, a.postal_code].filter(Boolean).join(', ')}</Text>
                  {!!a.floor && <Text size={13} color={C.muted} style={{ marginTop: 2 }}>{a.floor}</Text>}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.md }}>
                {on ? (
                  // the address in use is a status, not a button
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40 }}>
                    <Ionicons name="checkmark-circle" size={20} color={C.green} />
                    <Text weight="semibold" size={14} color={C.green}>Delivering here</Text>
                  </View>
                ) : (
                  <Button small variant="outline" label="Deliver here" onPress={() => void updateAddress(id).then(() => toast('Delivery address set')).catch(() => toast('Could not select that address', 'error'))} style={{ flex: 1 }} />
                )}
                <Button small variant="outline" label="Edit" onPress={() => setEditing(a)} />
                <Pressable onPress={() => remove(a)} hitSlop={8} accessibilityLabel="Delete address" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="trash-outline" size={20} color={C.red} />
                </Pressable>
              </View>
            </Card>
          );
        })}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: S.lg, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line }}>
        <Button label="Add address" icon="add" onPress={() => setEditing('new')} />
      </View>
      <AddressForm address={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); toast('Address saved'); }} />
    </SafeAreaView>
  );
}
