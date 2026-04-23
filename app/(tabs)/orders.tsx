import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { authStore } from '../authStore';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchOrders = async () => {
    try {
      await authStore.loadFromStorage();
      const token = authStore.getToken();
      if (!token) { setLoading(false); return; }
      const res = await fetch('https://www.nikfoods.com/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(data.data?.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchOrders(); };
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
  const formatDelivery = (d: string) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#8b5cf6',
    ready: '#10b981', out_for_delivery: '#f97316', delivered: '#22c55e', cancelled: '#ef4444',
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#E07B39" />
    </View>
  );

  if (!authStore.getToken()) return (
    <View style={styles.centered}>
      <Text style={styles.emptyText}>Please log in to view your orders</Text>
      <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(tabs)/login')}>
        <Text style={styles.loginBtnText}>Sign in</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOrder = ({ item: order }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{order.orderId}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[order.status] || '#6b7280' }]}>
          <Text style={styles.badgeText}>{order.status?.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>

      {order.items?.map((day: any, di: number) => (
        <View key={di} style={styles.dayBlock}>
          <Text style={styles.dayLabel}>{'📅 ' + day.day + ' · ' + formatDelivery(day.deliveryDate)}</Text>
          {day.items?.map((lineItem: any, li: number) => (
            <View key={li} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{lineItem.food?.name ?? 'Item'}</Text>
                {lineItem.selectedPortion ? (
                  <Text style={styles.itemSub}>{'Portion: ' + lineItem.selectedPortion}</Text>
                ) : null}
                {lineItem.spiceLevel ? (
                  <Text style={styles.itemSub}>{'Spice: ' + lineItem.spiceLevel}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.itemQty}>{'x' + lineItem.quantity}</Text>
                <Text style={styles.itemPrice}>{'$' + lineItem.price?.toFixed(2)}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.dayTotal}>{'Day total: $' + day.dayTotal?.toFixed(2)}</Text>
        </View>
      ))}

      <View style={styles.footer}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Subtotal</Text>
          <Text style={styles.breakdownValue}>{'$' + order.subtotal?.toFixed(2)}</Text>
        </View>
        {order.tip > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Tip</Text>
            <Text style={styles.breakdownValue}>{'$' + order.tip?.toFixed(2)}</Text>
          </View>
        )}
        {order.platformFee > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee</Text>
            <Text style={styles.breakdownValue}>{'$' + order.platformFee?.toFixed(2)}</Text>
          </View>
        )}
        {order.taxes > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Taxes</Text>
            <Text style={styles.breakdownValue}>{'$' + order.taxes?.toFixed(2)}</Text>
          </View>
        )}
        {order.deliveryFee > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Delivery Fee</Text>
            <Text style={styles.breakdownValue}>{'$' + order.deliveryFee?.toFixed(2)}</Text>
          </View>
        )}
        {order.discount?.amount > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{'Discount (' + order.discount.code + ')'}</Text>
            <Text style={[styles.breakdownValue, { color: '#22c55e' }]}>
              {'-$' + order.discount.amount?.toFixed(2)}
            </Text>
          </View>
        )}
        <View style={[styles.breakdownRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Paid</Text>
          <Text style={styles.totalValue}>{'$' + order.totalPaid?.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>{'← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.filters}>
        {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.pill, filter === s && styles.pillActive]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.pillText, filter === s && styles.pillTextActive]}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No orders found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={o => o._id}
          renderItem={renderOrder}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E4' },
  backBtn: { fontSize: 14, color: '#E07B39', fontWeight: '500', width: 60 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  emptyText: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  loginBtn: { backgroundColor: '#E07B39', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  loginBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  filters: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexWrap: 'wrap', backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E4' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e5e7eb' },
  pillActive: { backgroundColor: '#E07B39' },
  pillText: { fontSize: 12, color: '#374151' },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  orderDate: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  dayBlock: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10, marginTop: 6 },
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  itemSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  itemQty: { fontSize: 12, color: '#6b7280' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#E07B39' },
  dayTotal: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 4 },
  footer: { borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 10, paddingTop: 10 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakdownLabel: { fontSize: 13, color: '#6b7280' },
  breakdownValue: { fontSize: 13, color: '#374151' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 6, paddingTop: 10 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 15, fontWeight: '700', color: '#E07B39' },
});