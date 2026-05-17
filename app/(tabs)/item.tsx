import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { cartStore } from '../cartStore';
import { itemCache } from '../itemCache';

const API_BASE = 'https://www.nikfoods.com/api';

type DateOption = {
  id: string;
  date: string;
  formattedDate: string;
  fullDate: string;
  isPast: boolean;
  isPastCutoff: boolean;
};

type SectionItem = {
  _id: string;
  item: {
    _id: string;
    name: string;
    description: string;
    price: number;
    veg: boolean;
    url: string;
  };
  portion: string;
  price: number;
  portionId: string;
  isDefault: boolean;
  isAvailable: boolean;
};

type Section = {
  _id: string;
  title: string;
  selectedItems: SectionItem[];
  minSelection: number;
  maxSelection: number;
  isRequired: boolean;
  sequence: number;
};

export default function ItemScreen() {
  const {
    id, name, description, price, url, veg,
    categoryId, listingType, fixedDeliveryDate,
  } = useLocalSearchParams<{
    id: string; name: string; description: string; price: string;
    url: string; veg: string; categoryId: string; listingType: string;
    fixedDeliveryDate: string;
  }>();

  const cached = itemCache.get(id) || {};
  const portions: string[] = cached.portions || [];
  const portionPrices: number[] = cached.portionPrices || [];
  const hasSpiceLevel: boolean = cached.hasSpiceLevel || false;
  const spiceLevels: string[] = cached.spiceLevel || [];
  const hasCombo: boolean = cached.hasCombo || false;
  const isEco: boolean = cached.isEcoFriendlyContainer || false;
  const ecoCharge: number = cached.ecoContainerCharge || 0;
  const sections: Section[] = cached.sections || [];
  const isVeg = veg === 'true';
  const hasPortions = portions.length > 0 && portionPrices.length > 0;
  const isDayWise = listingType === 'day-wise' && !!fixedDeliveryDate;

  // Derive date directly from params on every render — no useState/useEffect.
  // This ensures correct date even when Expo Router reuses the screen instance.
  const fixedDateOption: DateOption | null = isDayWise && fixedDeliveryDate
    ? (() => {
        const [year, month, day] = fixedDeliveryDate.split('-').map(Number);
        const formatted = new Date(year, month - 1, day).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });
        return {
          id: fixedDeliveryDate,
          date: fixedDeliveryDate,
          formattedDate: formatted,
          fullDate: formatted,
          isPast: false,
          isPastCutoff: false,
        };
      })()
    : null;

  const [availableDates, setAvailableDates] = useState<DateOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<DateOption | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(!isDayWise);
  const [added, setAdded] = useState(false);
  const [selectedPortionIndex, setSelectedPortionIndex] = useState(0);
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<string>('');
  const [ecoContainer, setEcoContainer] = useState(false);
  const [sectionSelections, setSectionSelections] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    if (cached.sections) {
      (cached.sections as Section[]).forEach(section => {
        const defaultItem = section.selectedItems.find(si => si.isDefault);
        if (defaultItem) {
          defaults[section._id] = defaultItem.portionId;
        } else if (section.selectedItems.length > 0) {
          defaults[section._id] = section.selectedItems[0].portionId;
        }
      });
    }
    return defaults;
  });

  // For day-wise: always use fixedDateOption derived from params.
  // For flat items: use the user-selected date from the picker.
  const effectiveDate = isDayWise ? fixedDateOption : selectedDate;

  useEffect(() => {
    if (isDayWise) {
      setLoading(false);
      return;
    }
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

  const basePrice = hasPortions ? portionPrices[selectedPortionIndex] : parseFloat(price || '0');

  const extraFromSections = Object.entries(sectionSelections).reduce((sum, [sectionId, portionId]) => {
    for (const section of sections) {
      const found = section.selectedItems.find(si => si.portionId === portionId);
      if (found) return sum + (found.price || 0);
    }
    return sum;
  }, 0);

  const ecoExtra = ecoContainer ? ecoCharge : 0;
  const itemPrice = basePrice + extraFromSections + ecoExtra;

  const allRequiredSectionsSelected = sections
    .filter(s => s.isRequired)
    .every(s => sectionSelections[s._id]);

  const handleAdd = () => {
    if (!effectiveDate) {
      setShowDatePicker(true);
      return;
    }
    if (hasCombo && !allRequiredSectionsSelected) return;

    const comboDesc = sections.map(s => {
      const sel = s.selectedItems.find(si => si.portionId === sectionSelections[s._id]);
      return sel ? `${s.title}: ${sel.item.name}` : '';
    }).filter(Boolean).join(', ');

    cartStore.addItem({
      id: id,
      name: hasCombo && comboDesc ? `${name} (${comboDesc})` : name,
      price: itemPrice,
      url: url || '',
      veg: isVeg,
      deliveryDate: effectiveDate.date,
      deliveryDateFormatted: effectiveDate.fullDate || effectiveDate.formattedDate,
      ...(hasPortions && { selectedPortion: portions[selectedPortionIndex] }),
      ...(hasSpiceLevel && selectedSpiceLevel && { spiceLevel: selectedSpiceLevel }),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const selectSectionItem = (sectionId: string, portionId: string) => {
    setSectionSelections(prev => ({ ...prev, [sectionId]: portionId }));
  };

  const canAddToCart = effectiveDate &&
    (!hasCombo || allRequiredSectionsSelected) &&
    (!hasSpiceLevel || spiceLevels.length === 0 || selectedSpiceLevel);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
      >
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

          {hasSpiceLevel && spiceLevels.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Select Spice Level</Text>
                <Text style={styles.requiredGreen}>Required</Text>
              </View>
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

          {hasCombo && sections.map(section => (
            <View key={section._id} style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={[styles.requiredGreen, !sectionSelections[section._id] && styles.requiredOrange]}>
                  {section.isRequired ? 'Required' : 'Optional'}
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                {'Select ' + section.minSelection + (section.maxSelection > 1 ? '-' + section.maxSelection : '') + ' item' + (section.maxSelection > 1 ? 's' : '')}
              </Text>
              {section.selectedItems.map((si, idx) => (
                <TouchableOpacity
                  key={si._id || idx}
                  style={[styles.comboOptionRow, sectionSelections[section._id] === si.portionId && styles.optionRowSelected]}
                  onPress={() => selectSectionItem(section._id, si.portionId)}
                >
                  <View style={[styles.radio, sectionSelections[section._id] === si.portionId && styles.radioSelected]}>
                    {sectionSelections[section._id] === si.portionId && <View style={styles.radioDot} />}
                  </View>
                  {si.item.url ? (
                    <Image source={{ uri: si.item.url }} style={styles.comboItemImage} />
                  ) : null}
                  <View style={styles.comboItemInfo}>
                    <Text style={styles.comboItemName}>{si.item.name}</Text>
                    {si.portion ? <Text style={styles.comboItemPortion}>{si.portion}</Text> : null}
                  </View>
                  {si.price > 0 && (
                    <Text style={styles.comboItemPrice}>{'+$' + si.price.toFixed(2)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {isEco && ecoCharge > 0 && (
            <View style={styles.section}>
              <TouchableOpacity style={styles.ecoRow} onPress={() => setEcoContainer(!ecoContainer)}>
                <View style={[styles.checkbox, ecoContainer && styles.checkboxChecked]}>
                  {ecoContainer && <Text style={styles.checkmark}>{'✓'}</Text>}
                </View>
                <View style={styles.ecoInfo}>
                  <Text style={styles.ecoTitle}>Use Eco-Friendly Container</Text>
                  <Text style={styles.ecoSubtitle}>Sustainable packaging for a greener planet</Text>
                </View>
                <Text style={styles.ecoPrice}>{'+$' + ecoCharge.toFixed(2)}</Text>
              </TouchableOpacity>
            </View>
          )}

          {isDayWise ? (
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>{'Delivery date'}</Text>
              <View style={styles.fixedDateBox}>
                <Text style={styles.fixedDateText}>
                  {'📅 ' + (fixedDateOption?.fullDate || fixedDeliveryDate)}
                </Text>
                <Text style={styles.fixedDateSub}>Available to order on this date</Text>
              </View>
            </View>
          ) : (
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
          )}

          {hasCombo && !allRequiredSectionsSelected && (
            <Text style={styles.validationHint}>{'Please make selections for all required sections above'}</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>{'Total'}</Text>
          <Text style={styles.footerPriceValue}>{'$' + itemPrice.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, added && styles.addBtnSuccess, !canAddToCart && styles.addBtnDisabled]}
          onPress={handleAdd}
        >
          <Text style={styles.addBtnText}>
            {added ? '✓ Added!' : !effectiveDate ? 'Select date first' : !canAddToCart ? 'Make selections' : 'Add to cart'}
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
                    <Text style={[styles.dateOptionText, selectedDate?.date === d.date && styles.dateOptionTextSelected]}>
                      {d.fullDate || d.formattedDate}
                    </Text>
                    {selectedDate?.date === d.date && <Text style={styles.checkmarkDate}>{'✓'}</Text>}
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
  section: { marginTop: 24, borderTopWidth: 0.5, borderTopColor: '#F0EDE8', paddingTop: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  sectionSubtitle: { fontSize: 12, color: '#888', marginBottom: 12 },
  requiredGreen: { fontSize: 11, fontWeight: '600', color: '#2E7D32', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  requiredOrange: { color: '#E07B39', backgroundColor: '#FFF3E8' },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 12, marginBottom: 8, backgroundColor: '#fff' },
  optionRowSelected: { borderColor: '#E07B39', backgroundColor: '#FFF5EE' },
  comboOptionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 12, marginBottom: 8, backgroundColor: '#fff', gap: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  radioSelected: { borderColor: '#E07B39' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E07B39' },
  optionLabel: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  optionPrice: { fontSize: 15, fontWeight: '700', color: '#E07B39' },
  comboItemImage: { width: 44, height: 44, borderRadius: 8 },
  comboItemInfo: { flex: 1 },
  comboItemName: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  comboItemPortion: { fontSize: 12, color: '#888', marginTop: 2 },
  comboItemPrice: { fontSize: 13, fontWeight: '600', color: '#E07B39' },
  spiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  spiceChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E0D8D0', backgroundColor: '#fff' },
  spiceChipSelected: { backgroundColor: '#E07B39', borderColor: '#E07B39' },
  spiceChipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  spiceChipTextSelected: { color: '#fff' },
  ecoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: '#E0D8D0', borderRadius: 12, backgroundColor: '#fff' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#E0D8D0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  ecoInfo: { flex: 1 },
  ecoTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  ecoSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  ecoPrice: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
  dateSection: { marginTop: 24 },
  dateLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 10 },
  fixedDateBox: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 12, padding: 14 },
  fixedDateText: { fontSize: 15, color: '#0369A1', fontWeight: '600' },
  fixedDateSub: { fontSize: 12, color: '#0369A1', marginTop: 4, opacity: 0.8 },
  dateSelectorLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  dateSelectorLoadingText: { fontSize: 14, color: '#888' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E07B39', borderRadius: 12, padding: 14, backgroundColor: '#fff' },
  dateSelectorText: { fontSize: 15, color: '#333' },
  dateSelectorPlaceholder: { color: '#aaa' },
  dateSelectorArrow: { fontSize: 12, color: '#E07B39' },
  validationHint: { marginTop: 12, fontSize: 13, color: '#E07B39', textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E8E8E4', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerPrice: { flex: 1 },
  footerPriceLabel: { fontSize: 12, color: '#888' },
  footerPriceValue: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  addBtn: { backgroundColor: '#E07B39', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  addBtnSuccess: { backgroundColor: '#2E7D32' },
  addBtnDisabled: { backgroundColor: '#ccc' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  noDateText: { fontSize: 15, color: '#888', textAlign: 'center', padding: 20, lineHeight: 24 },
  dateOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: '#F0EDE8' },
  dateOptionSelected: {},
  dateOptionText: { fontSize: 15, color: '#333', fontWeight: '500' },
  dateOptionTextSelected: { color: '#E07B39', fontWeight: '600' },
  checkmarkDate: { color: '#E07B39', fontSize: 16, fontWeight: '700' },
  modalClose: { marginTop: 20, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E0D8D0' },
  modalCloseText: { fontSize: 15, color: '#666', fontWeight: '500' },
});