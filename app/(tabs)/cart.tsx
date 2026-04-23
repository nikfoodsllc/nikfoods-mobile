import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { cartStore } from '../cartStore';

export default function CartScreen() {
  const [items, setItems] = useState(cartStore.getItems());
  const [total, setTotal] = useState(cartStore.getTotal());

  useEffect(() => {
    const unsubscribe = cartStore.subscribe(() => {
      setItems([...cartStore.getItems()]);
      setTotal(cartStore.getTotal());
    });
    return unsubscribe;
  }, []);

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add some delicious items from the menu</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.browseBtnText}>Browse menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groupedByDate = items.reduce((groups: Record<string, typeof items>, item) => {
    const date = item.deliveryDateFormatted;
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
    return groups;
  }, {});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your cart</Text>
        <TouchableOpacity onPress={() => cartStore.clear()}>
          <Text style={styles.clearBtn}>Clear all</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={Object.entries(groupedByDate)}
        keyExtractor={([date]) => date}
        contentContainerStyle={styles.list}
        renderItem={({ item: [date, dateItems] }) => (
          <View style={styles.dateGroup}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{'Delivery: ' + date}</Text>
            </View>
            {dateItems.map(item => (
              <View key={item.id + item.deliveryDate} style={styles.card}>
                {item.url ? (
                  <Image source={{ uri: item.url }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]} />
                )}
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.price}>{'$' + (item.price * item.quantity).toFixed(2)}</Text>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => cartStore.updateQuantity(item.id, item.deliveryDate, item.quantity - 1)}
                    >
                      <Text style={styles.qtyBtnText}>{'-'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => cartStore.updateQuantity(item.id, item.deliveryDate, item.quantity + 1)}
                    >
                      <Text style={styles.qtyBtnText}>{'+'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalValue}>{'$' + total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/(tabs)/checkout')}>
          <Text style={styles.checkoutBtnText}>Proceed to checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 24 },
  browseBtn: { backgroundColor: '#E07B39', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  browseBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E4' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  clearBtn: { fontSize: 14, color: '#E07B39', fontWeight: '500' },
  list: { padding: 16, gap: 16, paddingBottom: 120 },
  dateGroup: { gap: 10 },
  dateHeader: { backgroundColor: '#FFF3E8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  dateHeaderText: { fontSize: 13, fontWeight: '600', color: '#E07B39' },
  card: { backgroundColor: '#fff', borderRadius: 12, flexDirection: 'row', overflow: 'hidden', borderWidth: 0.5, borderColor: '#E8E8E4' },
  image: { width: 90, height: 90 },
  imagePlaceholder: { backgroundColor: '#F0EDE8' },
  info: { flex: 1, padding: 12, justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  price: { fontSize: 15, fontWeight: '700', color: '#E07B39' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F5F0EB', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#E0D8D0' },
  qtyBtnText: { fontSize: 18, color: '#333', fontWeight: '500' },
  qty: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', minWidth: 20, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E8E8E4', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerTotal: { flex: 1 },
  footerTotalLabel: { fontSize: 12, color: '#888' },
  footerTotalValue: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  checkoutBtn: { backgroundColor: '#E07B39', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  checkoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});