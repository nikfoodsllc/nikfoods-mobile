import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { cartStore } from '../cartStore';

const API_BASE = 'https://www.nikfoods.com/api';

type DateOption = {
  id: string;
  date: string;
  formattedDate: string;
  fullDate: string;
  isPast: boolean;
  isPastCutoff: boolean;
  flatCategoryEnabled: boolean;
  dayWiseCategoryEnabled: boolean;
};

export default function ItemScreen() {
  const {
    id, name, description, price, url, veg,
    categoryId, listingType,
    portions: portionsParam,
    portionPrices: portionPricesParam,
    hasSpiceLevel: hasSpiceLevelParam,
    spiceLevel: spiceLevelParam,
  } = useLocalSearchParams<{
    id: string; name: string; description: string; price: string;
    url: string; veg: string; categoryId: string; listingType: string;
    portions: string; portionPrices: string;
    hasSpiceLevel: string; spiceLevel: string; hasCombo: string;
  }>();

  const portions: string[] = JSON.parse(portionsParam || '[]');
  const portionPrices: number[] = JSON.parse(portionPricesParam || '[]');
  const hasSpiceLevel = hasSpiceLevelParam === 'true';
  const spiceLevels: string[] = JSON.parse(spiceLevelParam || '[]');
  const isVeg = veg === 'true';
  const hasPortions = portions.length > 0 && portionPrices.length > 0;

  const [availableDates, setAvailableDates] = useState<DateOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<DateOption | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [selectedPortionIndex, setSelectedPortionIndex] = useState(0);
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<string>('');

  useEffect(() => {
    fetch(`${API_BASE}/available-dates`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const validDates = data.dates.filter(
            (d: DateOption) => !d.isPast && !d.isPastCutoff
          );
          setAvailableDates(validDates);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const itemPrice = hasPortions ? portionPrices[selectedPortionIndex] : parseFloat(price || '0');

  const handleAdd = () => {
    if (!selectedDate) {
      setShowDatePicker(true);
      return;
    }
    cartStore.addItem({
      id: id,
      name: name,
      price: itemPrice,
      url: url || '',
      veg: isVeg,
      deliveryDate: selectedDate.date,
      deliveryDateFormatted: selectedDate.fullDate || selectedDate.formattedDate,
      ...(hasPortions && { selectedPortion: portions[selectedPortionIndex] }),
      ...(hasSpiceLevel && selectedSpiceLevel && { spiceLevel: selectedSpiceLevel }),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>{'← Back'}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        {url ? (
          <Image source={{ uri: url }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{name}</Text>
            <View style={[styles.vegBadge, { backgroundColor: isVeg ? '#E8F5E9' : '#FFEBEE' }]}>
              <View style={[styles.vegDot, { backgroundColor: isVeg ? '#2E7D32' : '#C62828' }]} />
              <Text style={[styles.vegText, { color: isVeg ? '#2E7D32' : '#C62828' }]}>
                {isVeg ? 'Veg' : 'Non-veg'}
              </Text>
            </View>
          </View>

          <Text style={styles.price}>{'$' + itemPrice.toFixed(2)}</Text>
          <Text style={styles.description}>{description}</Text>

          {/* Portion Selector */}
          {hasPortions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Your Portion</Text>
              {portions.map((portion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionRow, selectedPortionIndex === index && styles.optionRowSelected]}
                  onPress={() => setSelectedPortionIndex(index)}
                >
                  <View style={[styles.radio, selectedPortionIndex === index && styles.radioSelected]}>
                    {selectedPortionIndex === index && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.optionLabel}>{portion}</Text>
                  <Text style={styles.optionPrice}>{'$' + portionPrices[index]?.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Spice Level Selector */}
          {hasSpiceLevel && spiceLevels.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Spice Level</Text>
              <View style={styles.spiceRow}>
                {spiceLevels.map((level, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.spiceChip, selectedSpiceLevel === level && styles.spiceChipSelected]}
                    onPress={() => setSelectedSpiceLevel(level)}
                  >
                    <Text style={[styles.spiceChipText, selectedSpiceLevel === level && styles.spiceChipTextSelected]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Date Selector */}
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>{'Select delivery date'}</Text>
            {loading ? (
              <View style={styles.dateSelectorLoading}>
                <ActivityIndicator size="small" color="#E07B39" />
                <Text style={styles.dateSelectorLoadingText}>{'Loading available dates...'}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.dateSelectorText, !selectedDate && styles.dateSelectorPlaceholder]}>
                  {selectedDate ? (selectedDate.fullDate || selectedDate.formattedDate) : 'Choose a delivery date'}
                </Text>
                <Text style={styles.dateSelectorArrow}>{'▼'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>{'Total'}</Text>
          <Text style={styles.footerPriceValue}>{'$' + itemPrice.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, added && styles.addBtnSuccess]}
          onPress={handleAdd}
        >
          <Text style={styles.addBtnText}>
            {added ? '✓ Added!' : !selectedDate ? 'Select date first' : 'Add to cart'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{'Choose delivery date'}</Text>
            {loading ? (
              <ActivityIndicator color="#E07B39" style={{ margin: 20 }} />
            ) : availableDates.length === 0 ? (
              <Text style={styles.noDateText}>{'No delivery dates available right now.'}</Text>
            ) : (
              <ScrollView>
                {availableDates.map(d => (
                  <TouchableOpacity
                    key={d.id || d.date}
                    style={[styles.dateOption, selectedDate?.date === d.date && styles.dateOptionSelected]}
                    onPress={() => { setSelectedDate(d); setShowDatePicker(false); }}
                  >
                    <View>
                      <Text style={[styles.dateOptionText, selectedDate?.date === d.date && styles.dateOptionTextSelected]}>
                        {d.fullDate || d.formattedDate}
                      </Text>
                      {d.formattedDate && d.fullDate && (
                        <Text style={styles.dateOptionSub}>{d.formattedDate}</Text>
                      )}
                    </View>
                    {selectedDate?.date === d.date && <Text style={styles.checkmark}>{'✓'}</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.modalCloseText}>{'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  backBtn: { position: 'absolute', top: 56, left: 16, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: '#E0D8D0' },
  backBtnText: { fontSize: 14, color: '#333', fontWeight: '500' },
  scroll: { paddingBottom: 120 },
  image: { width: '100%', height: 280 },
  imagePlaceholder: { width: '100%', height: 280, backgroundColor: '#F0EDE8' },
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', flex: 1, marginRight: 12 },
  vegBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  vegDot: { width: 8, height: 8, borderRadius: 4 },
  vegText: { fontSize: 12, fontWeight: '500' },
  price: { fontSize: 24, fontWeight: '700', color: '#E07B39', marginBottom: 16 },
  description: { fontSize: 15, color: '#555', lineHeight: 24 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  optionRowSelected: { borderColor: '#E07B39', backgroundColor: '#FFF5EE' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radioSelected: { borderColor: '#E07B39' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E07B39' },
  optionLabel: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  optionPrice: { fontSize: 15, fontWeight: '700', color: '#E07B39' },
  spiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  spiceChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E0D8D0', backgroundColor: '#fff' },
  spiceChipSelected: { backgroundColor: '#E07B39', borderColor: '#E07B39' },
  spiceChipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  spiceChipTextSelected: { color: '#fff' },
  dateSection: { marginTop: 24 },
  dateLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 10 },
  dateSelectorLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  dateSelectorLoadingText: { fontSize: 14, color: '#888' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E07B39', borderRadius: 12, padding: 14, backgroundColor: '#fff' },
  dateSelectorText: { fontSize: 15, color: '#333' },
  dateSelectorPlaceholder: { color: '#aaa' },
  dateSelectorArrow: { fontSize: 12, color: '#E07B39' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E8E8E4', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerPrice: { flex: 1 },
  footerPriceLabel: { fontSize: 12, color: '#888' },
  footerPriceValue: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  addBtn: { backgroundColor: '#E07B39', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  addBtnSuccess: { backgroundColor: '#2E7D32' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  noDateText: { fontSize: 15, color: '#888', textAlign: 'center', padding: 20, lineHeight: 24 },
  dateOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: '#F0EDE8' },
  dateOptionSelected: {},
  dateOptionText: { fontSize: 15, color: '#333', fontWeight: '500' },
  dateOptionTextSelected: { color: '#E07B39', fontWeight: '600' },
  dateOptionSub: { fontSize: 12, color: '#888', marginTop: 2 },
  checkmark: { color: '#E07B39', fontSize: 16, fontWeight: '700' },
  modalClose: { marginTop: 20, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E0D8D0' },
  modalCloseText: { fontSize: 15, color: '#666', fontWeight: '500' },
});