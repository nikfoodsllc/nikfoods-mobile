import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { calculateCartClubbing } from '../cartLogic';
import { cartStore } from '../cartStore';
import { zipcodeStore } from '../zipcodeStore';

export default function CartScreen() {
  const [items, setItems] = useState(cartStore.getItems());
  const [total, setTotal] = useState(cartStore.getTotal());
  const [minOrderValue, setMinOrderValue] = useState(zipcodeStore.getMinOrderValue());
  const [zipcode, setZipcode] = useState(zipcodeStore.getZipcode());

  useEffect(() => {
    const unsubscribeCart = cartStore.subscribe(() => {
      setItems([...cartStore.getItems()]);
      setTotal(cartStore.getTotal());
    });
    const unsubscribeZip = zipcodeStore.subscribe(() => {
      setMinOrderValue(zipcodeStore.getMinOrderValue());
      setZipcode(zipcodeStore.getZipcode());
    });
    return () => {
      unsubscribeCart();
      unsubscribeZip();
    };
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

  const effectiveMin = minOrderValue || 25;
  const clubbingResult = calculateCartClubbing(items, effectiveMin);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your cart</Text>
        <TouchableOpacity onPress={() => cartStore.clear()}>
          <Text style={styles.clearBtn}>Clear all</Text>
        </TouchableOpacity>
      </View>

      {/* Min order info banner */}
      {zipcode && (
        <View style={styles.minOrderBanner}>
          <Text style={styles.minOrderBannerText}>
            {'📍 ' + zipcode + ' · Min. order $' + effectiveMin.toFixed(2) + ' per delivery day'}
          </Text>
        </View>
      )}

      <FlatList
        data={clubbingResult.dayAnalysis}
        keyExtractor={(day) => day.date}
        contentContainerStyle={styles.list}
        renderItem={({ item: day }) => {
          const meetsMin = day.meetsMinimum;
          const hasWarning = day.deliveryMessage?.type === 'warning';
          const hasError = day.deliveryMessage?.type === 'error';

          return (
            <View style={styles.dateGroup}>
              {/* Date header with status indicator */}
              <View style={[
                styles.dateHeader,
                meetsMin && styles.dateHeaderGreen,
                hasWarning && styles.dateHeaderAmber,
                hasError && styles.dateHeaderRed,
              ]}>
                <View style={styles.dateHeaderLeft}>
                  <Text style={[
                    styles.dateHeaderText,
                    meetsMin && styles.dateHeaderTextGreen,
                    hasWarning && styles.dateHeaderTextAmber,
                    hasError && styles.dateHeaderTextRed,
                  ]}>
                    {meetsMin ? '✅' : hasWarning ? '⚠️' : '❌'} {'Delivery: ' + day.dateFormatted}
                  </Text>
                  <Text style={[
                    styles.daySubtotal,
                    meetsMin && styles.daySubtotalGreen,
                    (hasWarning || hasError) && styles.daySubtotalAmber,
                  ]}>
                    {'$' + day.dayTotal.toFixed(2) + ' / $' + effectiveMin.toFixed(2) + ' min'}
                  </Text>
                </View>
              </View>

              {/* Warning/error message */}
              {day.deliveryMessage && (
                <View style={[
                  styles.messageBox,
                  hasWarning && styles.messageBoxAmber,
                  hasError && styles.messageBoxRed,
                ]}>
                  <Text style={[
                    styles.messageText,
                    hasWarning && styles.messageTextAmber,
                    hasError && styles.messageTextRed,
                  ]}>
                    {day.deliveryMessage.message}
                  </Text>
                </View>
              )}

              {/* Items */}
              {day.items.map((item, index) => (
                <View
                  key={`${item.id}-${item.deliveryDate}-${item.selectedPortion ?? 'default'}-${item.spiceLevel ?? 'none'}-${index}`}
                  style={styles.card}
                >
                  {item.url ? (
                    <Image source={{ uri: item.url }} style={styles.image} />
                  ) : (
                    <View style={[styles.image, styles.imagePlaceholder]} />
                  )}
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.selectedPortion && (
                      <Text style={styles.subText}>{'Portion: ' + item.selectedPortion}</Text>
                    )}
                    {item.spiceLevel && (
                      <Text style={styles.subText}>{'Spice: ' + item.spiceLevel}</Text>
                    )}
                    <Text style={styles.price}>{'$' + (item.price * item.quantity).toFixed(2)}</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => cartStore.updateQuantity(
                          item.id, item.deliveryDate, item.quantity - 1,
                          item.selectedPortion, item.spiceLevel
                        )}
                      >
                        <Text style={styles.qtyBtnText}>{'-'}</Text>
                      </TouchableOpacity>
                      <Text style={styles.qty}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => cartStore.updateQuantity(
                          item.id, item.deliveryDate, item.quantity + 1,
                          item.selectedPortion, item.spiceLevel
                        )}
                      >
                        <Text style={styles.qtyBtnText}>{'+'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalValue}>{'$' + total.toFixed(2)}</Text>
        </View>
        {clubbingResult.canCheckout ? (
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => router.push('/(tabs)/checkout')}
          >
            <Text style={styles.checkoutBtnText}>Proceed to checkout</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.checkoutBtnDisabled}>
            <Text style={styles.checkoutBtnDisabledText}>
              {'Add $' + clubbingResult.totalShortfall.toFixed(2) + ' more'}
            </Text>
          </View>
        )}
      </View>

      {/* Cannot checkout message */}
      {!clubbingResult.canCheckout && clubbingResult.checkoutBlockMessage ? (
        <View style={styles.blockBanner}>
          <Text style={styles.blockBannerText}>{clubbingResult.checkoutBlockMessage}</Text>
        </View>
      ) : null}
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
  minOrderBanner: { backgroundColor: '#F0F9FF', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#BAE6FD' },
  minOrderBannerText: { fontSize: 13, color: '#0369A1', fontWeight: '500' },
  list: { padding: 16, gap: 16, paddingBottom: 140 },
  dateGroup: { gap: 8 },
  dateHeader: { backgroundColor: '#FFF3E8', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  dateHeaderGreen: { backgroundColor: '#E8F5E9' },
  dateHeaderAmber: { backgroundColor: '#FFF8E1' },
  dateHeaderRed: { backgroundColor: '#FFEBEE' },
  dateHeaderLeft: { gap: 2 },
  dateHeaderText: { fontSize: 13, fontWeight: '600', color: '#E07B39' },
  dateHeaderTextGreen: { color: '#2E7D32' },
  dateHeaderTextAmber: { color: '#F57F17' },
  dateHeaderTextRed: { color: '#C62828' },
  daySubtotal: { fontSize: 12, color: '#888', marginTop: 2 },
  daySubtotalGreen: { color: '#2E7D32' },
  daySubtotalAmber: { color: '#F57F17' },
  messageBox: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  messageBoxAmber: { backgroundColor: '#FFFDE7', borderColor: '#FFD54F' },
  messageBoxRed: { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' },
  messageText: { fontSize: 13, lineHeight: 18 },
  messageTextAmber: { color: '#E65100' },
  messageTextRed: { color: '#C62828' },
  card: { backgroundColor: '#fff', borderRadius: 12, flexDirection: 'row', overflow: 'hidden', borderWidth: 0.5, borderColor: '#E8E8E4' },
  image: { width: 90, height: 90 },
  imagePlaceholder: { backgroundColor: '#F0EDE8' },
  info: { flex: 1, padding: 12, justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  subText: { fontSize: 12, color: '#888', marginTop: 2 },
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
  checkoutBtnDisabled: { backgroundColor: '#F5F0EB', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E0D8D0' },
  checkoutBtnDisabledText: { color: '#888', fontSize: 14, fontWeight: '600' },
  blockBanner: { position: 'absolute', bottom: 80, left: 16, right: 16, backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#EF9A9A' },
  blockBannerText: { fontSize: 13, color: '#C62828', textAlign: 'center', fontWeight: '500' },
});