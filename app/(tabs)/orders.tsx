import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { authStore } from '../authStore';

const API_BASE = 'https://www.nikfoods.com/api';

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  deliveryDate: string;
};

type Order = {
  _id: string;
  orderId: string;
  status: string;
  paymentStatus: string;
  totalPaid: number;
  createdAt: string;
  items: OrderItem[];
  address: {
    street_address: string;
    city: string;
    postal_code: string;
  };
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending:          { bg: '#FFF3E8', text: '#E07B39', label: 'Pending' },
  confirmed:        { bg: '#E8F5E9', text: '#2E7D32', label: 'Confirmed' },
  preparing:        { bg: '#E3F2FD', text: '#1565C0', label: 'Preparing' },
  ready:            { bg: '#F3E5F5', text: '#6A1B9A', label: 'Ready' },
  out_for_delivery: { bg: '#E0F7FA', text: '#00695C', label: 'Out for delivery' },
  delivered:        { bg: '#E8F5E9', text: '#2E7D32', label: 'Delivered' },
  cancelled:        { bg: '#FFEBEE', text: '#C62828', label: 'Cancelled' },
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const token = authStore.getToken();

  useEffect(() => {
    if (!token) { router.replace('/(tabs)/login'); return; }
    fetchOrders(1, filter, true);
  }, [filter]);

  const fetchOrders = async (pageNum: number, status: string, reset: boolean = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const response = await fetch(
        `${API_BASE}/orders?page=${pageNum}&limit=10&status=${status}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        const newOrders = data.data.items || [];
        setOrders(reset ? newOrders : prev => [...prev, ...newOrders]);
        setHasMore(data.data.hasNextPage || false);
        setPage(pageNum);
      }
    } catch (e) {
      console.log('Failed to fetch orders');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch { return dateString; }
  };

  const filters: { key: 'all' | 'active' | 'delivered' | 'cancelled'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBack}>{'← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My orders</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E07B39" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>{'📦'}</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>Your orders will appear here once you place one</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.browseBtnText}>Browse menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {orders.map(order => {
            const status = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
            return (
              <View key={order._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.orderId}>{'Order #' + order.orderId}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.itemsList}>
                  {order.items?.slice(0, 3).map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemName}>{(item.quantity || 1) + 'x ' + (item.name || 'Item')}</Text>
                      <Text style={styles.itemPrice}>{'$' + ((item.price || 0) * (item.quantity || 1)).toFixed(2)}</Text>
                    </View>
                  ))}
                  {order.items?.length > 3 && (
                    <Text style={styles.moreItems}>{'+ ' + (order.items.length - 3) + ' more items'}</Text>
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.cardBottom}>
                  {order.address && (
                    <Text style={styles.addressText} numberOfLines={1}>
                      {order.address.street_address + ', ' + order.address.city}
                    </Text>
                  )}
                  <Text style={styles.totalText}>{'$' + (order.totalPaid || 0).toFixed(2)}</Text>
                </View>
              </View>
            );
          })}

          {hasMore && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => fetchOrders(page + 1, filter)}
              disabled={loadingMore}
            >
              {loadingMore
                ? <ActivityIndicator color="#E07B39" />
                : <Text style={styles.loadMoreText}>Load more orders</Text>
              }
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E4' },
  headerBack: { fontSize: 14, color: '#E07B39', fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  filterBar: { maxHeight: 56, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E4' },
  filterBarContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 12, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F0EB', borderWidth: 1, borderColor: '#E0D8D0' },
  filterChipActive: { backgroundColor: '#E07B39', borderColor: '#E07B39' },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#333' },
  filterChipTextActive: { color: '#fff' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  browseBtn: { backgroundColor: '#E07B39', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  browseBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: '#E8E8E4' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderId: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  orderDate: { fontSize: 12, color: '#888', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 0.5, backgroundColor: '#F0EDE8', marginVertical: 12 },
  itemsList: { gap: 6 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontSize: 13, color: '#333', flex: 1 },
  itemPrice: { fontSize: 13, fontWeight: '500', color: '#1A1A1A' },
  moreItems: { fontSize: 12, color: '#888', marginTop: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addressText: { fontSize: 12, color: '#888', flex: 1, marginRight: 8 },
  totalText: { fontSize: 14, fontWeight: '700', color: '#E07B39' },
  loadMoreBtn: { paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 10, backgroundColor: '#fff' },
  loadMoreText: { fontSize: 14, color: '#E07B39', fontWeight: '500' },
});