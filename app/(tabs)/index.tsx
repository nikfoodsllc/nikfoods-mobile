import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { authStore } from '../authStore';
import { itemCache } from '../itemCache';

const API_BASE = 'https://www.nikfoods.com/api';

type Category = {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  listingType: 'flat' | 'day-wise';
};

type FoodItem = {
  _id: string;
  name: string;
  description: string;
  price: number;
  url: string;
  veg: boolean;
  portions: string[];
  portionPrices: number[];
  hasSpiceLevel: boolean;
  spiceLevel: string[];
  hasCombo: boolean;
  isEcoFriendlyContainer: boolean;
  ecoContainerCharge: number;
  sections: any[];
  itemType: string;
  fixedDeliveryDate?: string;
};

type Address = {
  _id: string;
  street: string;
  street_address: string;
  city: string;
  state: string;
  zipcode: string;
  postal_code: string;
  isDefault: boolean;
};

export default function MenuScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const fetchAddress = async () => {
    const token = authStore.getToken();
    if (!token) {
      setAddressLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/address`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const addresses: Address[] = data.data?.items || data.data?.addresses || [];
      const def = addresses.find(a => a.isDefault) || addresses[0] || null;
      setDefaultAddress(def);
    } catch {
      // silently fail
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    fetchAddress();
    const unsubscribe = authStore.subscribe(() => {
      fetchAddress();
    });
    fetch(`${API_BASE}/categories`)
      .then(r => r.json())
      .then(data => {
        const cats = data.data.items;
        setCategories(cats);
        setLoading(false);
        if (cats.length > 0) loadCategory(cats[0]);
      })
      .catch(() => {
        setError('Could not load menu. Check your connection.');
        setLoading(false);
      });
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAddress();
    }, [])
  );

  const loadCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setItemsLoading(true);
    setItems([]);

    fetch(`${API_BASE}/food-items-by-category?categoryId=${cat._id}`)
      .then(r => r.json())
      .then(data => {
        if (cat.listingType === 'flat') {
          setItems(data.data.foodItems || []);
        } else {
          const dayWise: Record<string, FoodItem[]> = data.data.dayWiseItems || {};
          const sortedDates = Object.keys(dayWise).sort((a, b) =>
            new Date(a).getTime() - new Date(b).getTime()
          );
          const allItems: FoodItem[] = sortedDates.flatMap((date) => {
            const dateItems = dayWise[date];
            if (!Array.isArray(dateItems)) return [];
            return dateItems.map((item: FoodItem, idx: number) => ({
              ...item,
              _id: `${item._id}-${date}-${idx}`,
              fixedDeliveryDate: date,
            }));
          });
          setItems(allItems);
        }
        setItemsLoading(false);
      })
      .catch((e) => {
        console.log('Load error:', e);
        setError('Could not load items.');
        setItemsLoading(false);
      });
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#E07B39" />
      <Text style={styles.loadingText}>Loading menu...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  const displayedItems = vegOnly ? items.filter(item => item.veg) : items;

  const getDisplayPrice = (item: FoodItem) => {
    if (item.portions && item.portions.length > 0 && item.portionPrices && item.portionPrices.length > 0) {
      const minPrice = Math.min(...item.portionPrices);
      return `From $${minPrice.toFixed(2)}`;
    }
    return '$' + (item.price || 0).toFixed(2);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NikFoods</Text>
        <Text style={styles.headerSub}>Authentic Indian food</Text>
      </View>

      {!addressLoading && (
        defaultAddress ? (
          <TouchableOpacity
            style={styles.addressBanner}
            onPress={() => router.push('/(tabs)/addresses')}
            activeOpacity={0.8}
          >
            <Text style={styles.addressBannerLabel}>📍 Delivering to</Text>
            <Text style={styles.addressBannerText} numberOfLines={1}>
              {(defaultAddress.street_address || defaultAddress.street)}, {defaultAddress.city}, {defaultAddress.postal_code || defaultAddress.zipcode}
            </Text>
            <Text style={styles.addressBannerChange}>Change →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addressBannerWarning}
            onPress={() => router.push('/(tabs)/addresses')}
            activeOpacity={0.8}
          >
            <Text style={styles.addressBannerWarningText}>
              📍 No delivery address on file — tap to add one
            </Text>
          </TouchableOpacity>
        )
      )}

      <TouchableOpacity
        style={styles.vegToggleRow}
        onPress={() => setVegOnly(!vegOnly)}
        activeOpacity={0.8}
      >
        <Text style={styles.vegToggleLabel}>Veg Only</Text>
        <View style={[styles.toggleTrack, { backgroundColor: vegOnly ? '#2E7D32' : '#ccc' }]}>
          <View style={[styles.toggleThumb, { transform: [{ translateX: vegOnly ? 20 : 2 }] }]} />
        </View>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catBar}
        contentContainerStyle={styles.catBarContent}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat._id}
            style={[styles.catChip, selectedCategory?._id === cat._id && styles.catChipActive]}
            onPress={() => loadCategory(cat)}
          >
            <Text style={[styles.catChipText, selectedCategory?._id === cat._id && styles.catChipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {itemsLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E07B39" />
        </View>
      )}

      <FlatList
        data={displayedItems}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const showDateHeader = !!item.fixedDeliveryDate &&
            (index === 0 || displayedItems[index - 1]?.fixedDeliveryDate !== item.fixedDeliveryDate);
          const dateLabel = item.fixedDeliveryDate
            ? (() => {
                const [year, month, day] = item.fixedDeliveryDate!.split('-').map(Number);
                return new Date(year, month - 1, day).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric'
                });
              })()
            : null;

          return (
            <View>
              {showDateHeader && dateLabel && (
                <View style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>{'📅 ' + dateLabel}</Text>
                </View>
              )}
              <View style={styles.card}>
                {item.url ? (
                  <Image source={{ uri: item.url }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]} />
                )}
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={[styles.vegDot, { backgroundColor: item.veg ? '#2E7D32' : '#C62828' }]} />
                  </View>
                  <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{getDisplayPrice(item)}</Text>
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => {
                        itemCache.set(item._id, {
                          portions: item.portions || [],
                          portionPrices: item.portionPrices || [],
                          hasSpiceLevel: item.hasSpiceLevel || false,
                          spiceLevel: item.spiceLevel || [],
                          hasCombo: item.hasCombo || false,
                          isEcoFriendlyContainer: item.isEcoFriendlyContainer || false,
                          ecoContainerCharge: item.ecoContainerCharge || 0,
                          sections: item.sections || [],
                          itemType: item.itemType || 'simple',
                          fixedDeliveryDate: item.fixedDeliveryDate || null,
                        });
                        router.push({
                          pathname: '/(tabs)/item',
                          params: {
                            id: item._id,
                            name: item.name,
                            description: item.description,
                            price: String(item.price),
                            url: item.url,
                            veg: String(item.veg),
                            categoryId: selectedCategory?._id,
                            listingType: selectedCategory?.listingType,
                            fixedDeliveryDate: item.fixedDeliveryDate || '',
                          }
                        });
                      }}
                    >
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#888', fontSize: 15 },
  errorText: { color: '#CC3300', fontSize: 15, textAlign: 'center' },
  header: { backgroundColor: '#E07B39', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 14, color: '#FFE5D0', marginTop: 2 },
  addressBanner: { backgroundColor: '#FFF8F3', borderBottomWidth: 0.5, borderBottomColor: '#F0D5C0', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressBannerLabel: { fontSize: 12, color: '#E07B39', fontWeight: '600', flexShrink: 0 },
  addressBannerText: { fontSize: 12, color: '#333', flex: 1 },
  addressBannerChange: { fontSize: 12, color: '#E07B39', fontWeight: '600', flexShrink: 0 },
  addressBannerWarning: { backgroundColor: '#FFF3E8', borderBottomWidth: 0.5, borderBottomColor: '#F0D5C0', paddingHorizontal: 16, paddingVertical: 10 },
  addressBannerWarningText: { fontSize: 12, color: '#C45500', fontWeight: '500' },
  vegToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginRight: 16, marginTop: 8, gap: 8 },
  vegToggleLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 2 },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  catBar: { height: 60, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E8E4' },
  catBarContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 12, alignItems: 'center' },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F0EB', borderWidth: 1, borderColor: '#E0D8D0', height: 36, justifyContent: 'center', alignItems: 'center' },
  catChipActive: { backgroundColor: '#E07B39', borderColor: '#E07B39' },
  catChipText: { fontSize: 13, fontWeight: '500', color: '#000000' },
  catChipTextActive: { fontSize: 13, fontWeight: '500', color: '#ffffff' },
  loadingOverlay: { position: 'absolute', top: 200, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  list: { padding: 16, gap: 12 },
  dayHeader: { backgroundColor: '#FFF3E8', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 4, marginTop: 8 },
  dayHeaderText: { fontSize: 14, fontWeight: '700', color: '#E07B39' },
  card: { backgroundColor: '#fff', borderRadius: 12, flexDirection: 'row', overflow: 'hidden', borderWidth: 0.5, borderColor: '#E8E8E4' },
  image: { width: 110, height: 110 },
  imagePlaceholder: { backgroundColor: '#F0EDE8' },
  info: { flex: 1, padding: 12, justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', flex: 1, marginRight: 8 },
  vegDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  desc: { fontSize: 12, color: '#888', marginTop: 4, lineHeight: 17 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  price: { fontSize: 15, fontWeight: '700', color: '#E07B39' },
  addBtn: { backgroundColor: '#E07B39', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});