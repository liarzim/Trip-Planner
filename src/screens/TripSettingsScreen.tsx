import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getTrip, updateTripSettings, DEFAULT_PACKING_CATEGORIES } from '../services/dbService';
import { useTranslation } from '../services/translationService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SUPPORTED_CURRENCIES, CurrencyInfo } from '../utils/currencyRegistry';
import { CurrencyRowItem } from '../types';

type TripSettingsRouteProp = RouteProp<RootStackParamList, 'TripSettings'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TripSettings'>;

export default function TripSettingsScreen() {
  const route = useRoute<TripSettingsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { tripId } = route.params;

  const { t, isRTL } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tripName, setTripName] = useState('');
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h'>('24h');

  // Packing categories state
  const [packingCategories, setPackingCategories] = useState<string[]>(DEFAULT_PACKING_CATEGORIES);
  const [newCategoryText, setNewCategoryText] = useState('');

  // Currency Table state
  const [currenciesList, setCurrenciesList] = useState<CurrencyRowItem[]>(SUPPORTED_CURRENCIES);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('3.70');

  // Editing state for table row
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editSymbol, setEditSymbol] = useState('');
  const [editRate, setEditRate] = useState('');

  // Add new currency row state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newRate, setNewRate] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const trip = await getTrip(tripId);
        if (trip) {
          setTripName(trip.name);
          if (trip.currenciesTable && Array.isArray(trip.currenciesTable) && trip.currenciesTable.length > 0) {
            setCurrenciesList(trip.currenciesTable);
          } else {
            setCurrenciesList(SUPPORTED_CURRENCIES);
          }
          if (trip.baseCurrency) {
            setSelectedCurrencyCode(trip.baseCurrency);
          }
          if (trip.exchangeRateToILS) {
            setExchangeRate(trip.exchangeRateToILS.toString());
          }
          if (trip.timeFormat) {
            setTimeFormat(trip.timeFormat);
          }
          if (trip.packingCategories && Array.isArray(trip.packingCategories) && trip.packingCategories.length > 0) {
            setPackingCategories(trip.packingCategories);
          } else {
            setPackingCategories(DEFAULT_PACKING_CATEGORIES);
          }
        }
      } catch (err) {
        console.error('Failed to load trip settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [tripId]);

  const handleAddCategory = () => {
    const clean = newCategoryText.trim();
    if (!clean) return;
    if (packingCategories.includes(clean)) {
      const msg = isRTL ? 'קטגוריה זו כבר קיימת' : 'Category already exists';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Notice', msg);
      return;
    }
    setPackingCategories(prev => [...prev, clean]);
    setNewCategoryText('');
  };

  const handleDeleteCategory = (catName: string) => {
    if (packingCategories.length <= 1) {
      const msg = isRTL ? 'חייבת להישאר לפחות קטגוריה אחת' : 'Must keep at least one category';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Notice', msg);
      return;
    }
    setPackingCategories(prev => prev.filter(c => c !== catName));
  };

  const handleSelectCurrency = (item: CurrencyRowItem) => {
    setSelectedCurrencyCode(item.code);
    setExchangeRate(item.rateToILS.toString());
  };

  const handleStartEditRow = (index: number) => {
    const item = currenciesList[index];
    setEditingIndex(index);
    setEditCode(item.code);
    setEditSymbol(item.symbol);
    setEditRate(item.rateToILS.toString());
  };

  const handleSaveEditRow = () => {
    if (editingIndex === null) return;
    const parsedRate = parseFloat(editRate);
    if (isNaN(parsedRate) || !isFinite(parsedRate) || parsedRate <= 0) {
      const msg = isRTL ? 'אנא הזן שער חליפין תקין' : 'Please enter a valid numeric rate';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Error', msg);
      return;
    }
    const code = editCode.trim().toUpperCase() || 'CURR';
    const symbol = editSymbol.trim() || '$';
    
    const updated = [...currenciesList];
    const oldCode = updated[editingIndex].code;
    updated[editingIndex] = {
      code,
      symbol,
      rateToILS: parsedRate
    };
    setCurrenciesList(updated);

    if (selectedCurrencyCode === oldCode) {
      setSelectedCurrencyCode(code);
      setExchangeRate(parsedRate.toString());
    }
    setEditingIndex(null);
  };

  const handleDeleteRow = (index: number) => {
    if (currenciesList.length <= 1) {
      const msg = isRTL ? 'לא ניתן למחוק את המטבע האחרון' : 'Cannot delete the last remaining currency';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Error', msg);
      return;
    }
    const deletedItem = currenciesList[index];
    const updated = currenciesList.filter((_, i) => i !== index);
    setCurrenciesList(updated);

    if (selectedCurrencyCode === deletedItem.code) {
      setSelectedCurrencyCode(updated[0].code);
      setExchangeRate(updated[0].rateToILS.toString());
    }
  };

  const handleAddRow = () => {
    const code = newCode.trim().toUpperCase();
    const symbol = newSymbol.trim() || '$';
    const parsedRate = parseFloat(newRate);
    if (!code || isNaN(parsedRate) || !isFinite(parsedRate) || parsedRate <= 0) {
      const msg = isRTL ? 'אנא הזן קוד מטבע ושער תקין' : 'Please enter valid currency code and numeric rate';
      if (Platform.OS === 'web') alert(msg); else Alert.alert('Error', msg);
      return;
    }

    const updated = [...currenciesList, { code, symbol, rateToILS: parsedRate }];
    setCurrenciesList(updated);
    setSelectedCurrencyCode(code);
    setExchangeRate(parsedRate.toString());

    setNewCode('');
    setNewSymbol('');
    setNewRate('');
    setIsAddingRow(false);
  };

  const handleSaveSettings = async () => {
    const selectedItem = currenciesList.find(c => c.code === selectedCurrencyCode) || currenciesList[0];
    const parsedRate = parseFloat(exchangeRate) || selectedItem.rateToILS;

    if (isNaN(parsedRate) || !isFinite(parsedRate) || parsedRate <= 0) {
      const errorMsg = isRTL 
        ? 'אנא הזן שער חליפין תקין (מספר חיובי גדול מ-0)' 
        : 'Please enter a valid numeric exchange rate';
      if (Platform.OS === 'web') alert(errorMsg); else Alert.alert('Error', errorMsg);
      return;
    }

    try {
      setSaving(true);
      await updateTripSettings(tripId, selectedItem.code, parsedRate, timeFormat, currenciesList, packingCategories);
      
      const successMsg = isRTL 
        ? 'ההגדרות נשמרו בהצלחה!' 
        : 'Settings saved successfully!';
      if (Platform.OS === 'web') alert(successMsg); else Alert.alert('Success', successMsg);
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save settings:', err);
      const errorMsg = isRTL 
        ? 'שגיאה בשמירת ההגדרות.' 
        : 'Failed to save settings.';
      if (Platform.OS === 'web') alert(errorMsg); else Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const rowDirectionStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };
  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedItem = currenciesList.find(c => c.code === selectedCurrencyCode) || { code: 'USD', symbol: '$', rateToILS: 3.70 };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={[styles.title, textAlignStyle]}>
            {isRTL ? `הגדרות טיול עבור ${tripName}` : `Trip Settings for ${tripName}`}
          </Text>
          <Text style={[styles.subtitle, textAlignStyle]}>
            {isRTL 
              ? 'נהל את טבלת המטבעות, בחר מטבע בסיס, ערוך שערי המרה ופורמט הצגת השעה' 
              : 'Manage currency table, select base currency, edit rates, and set time format'}
          </Text>

          {/* Currency Reference & Management Table */}
          <View style={[styles.sectionHeaderRow, rowDirectionStyle]}>
            <Text style={[styles.sectionTitleText, textAlignStyle]}>
              📊 {isRTL ? 'טבלת מטבעות ושערי המרה (לחץ לבחירת מטבע בסיס)' : 'Currency Rates Table (Tap row to set Base Currency)'}
            </Text>
            <TouchableOpacity 
              style={styles.addRowTriggerBtn}
              onPress={() => setIsAddingRow(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.addRowTriggerBtnText}>
                ➕ {isRTL ? 'הוסף מטבע' : 'Add Currency'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form to add a new currency row */}
          {isAddingRow && (
            <View style={styles.addRowFormCard}>
              <Text style={[styles.addRowFormTitle, textAlignStyle]}>
                ➕ {isRTL ? 'הוספת מטבע חדש לטבלה' : 'Add New Currency to Table'}
              </Text>
              <View style={[styles.formRow, rowDirectionStyle]}>
                <View style={[styles.formCol, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>{isRTL ? 'קוד' : 'Code'}</Text>
                  <TextInput
                    style={styles.tableInput}
                    placeholder="e.g. THB"
                    value={newCode}
                    onChangeText={setNewCode}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={[styles.formCol, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>{isRTL ? 'סמל' : 'Symbol'}</Text>
                  <TextInput
                    style={styles.tableInput}
                    placeholder="e.g. ฿"
                    value={newSymbol}
                    onChangeText={setNewSymbol}
                  />
                </View>
                <View style={[styles.formCol, { flex: 2 }]}>
                  <Text style={styles.inputLabel}>{isRTL ? 'שער לשקל (₪)' : 'Rate to ILS (₪)'}</Text>
                  <TextInput
                    style={styles.tableInput}
                    placeholder="e.g. 0.10"
                    value={newRate}
                    onChangeText={setNewRate}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={[styles.formActionsRow, rowDirectionStyle]}>
                <TouchableOpacity style={styles.saveRowBtn} onPress={handleAddRow}>
                  <Text style={styles.saveRowBtnText}>✔️ {isRTL ? 'אישור הוספה' : 'Confirm Add'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelRowBtn} onPress={() => setIsAddingRow(false)}>
                  <Text style={styles.cancelRowBtnText}>{isRTL ? 'ביטול' : 'Cancel'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Main Currency Table */}
          <View style={styles.currencyTableContainer}>
            <View style={[styles.currencyTableHeader, rowDirectionStyle]}>
              <Text style={[styles.currencyTableCell, styles.currencyTableHeaderText, { width: 40, textAlign: 'center' }]}>
                ✓
              </Text>
              <Text style={[styles.currencyTableCell, styles.currencyTableHeaderText, textAlignStyle, { flex: 2 }]}>
                {isRTL ? 'מטבע (שם)' : 'Currency (Code)'}
              </Text>
              <Text style={[styles.currencyTableCell, styles.currencyTableHeaderText, { width: 50, textAlign: 'center' }]}>
                {isRTL ? 'סמל' : 'Symbol'}
              </Text>
              <Text style={[styles.currencyTableCell, styles.currencyTableHeaderText, textAlignStyle, { flex: 2 }]}>
                {isRTL ? 'שער לשקל (ILS)' : 'Rate to ILS (₪)'}
              </Text>
              <Text style={[styles.currencyTableCell, styles.currencyTableHeaderText, { width: 80, textAlign: 'center' }]}>
                {isRTL ? 'פעולות' : 'Actions'}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 240 }}>
              {currenciesList.map((item, index) => {
                const isSelected = selectedCurrencyCode === item.code;
                const isEditing = editingIndex === index;

                if (isEditing) {
                  return (
                    <View key={index} style={[styles.currencyTableEditRow, rowDirectionStyle]}>
                      <TextInput
                        style={[styles.tableInput, { flex: 1.5, marginRight: 4 }]}
                        value={editCode}
                        onChangeText={setEditCode}
                        autoCapitalize="characters"
                      />
                      <TextInput
                        style={[styles.tableInput, { width: 45, marginRight: 4, textAlign: 'center' }]}
                        value={editSymbol}
                        onChangeText={setEditSymbol}
                      />
                      <TextInput
                        style={[styles.tableInput, { flex: 2, marginRight: 4 }]}
                        value={editRate}
                        onChangeText={setEditRate}
                        keyboardType="decimal-pad"
                      />
                      <TouchableOpacity style={styles.iconBtn} onPress={handleSaveEditRow}>
                        <Text style={{ fontSize: 16 }}>💾</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => setEditingIndex(null)}>
                        <Text style={{ fontSize: 16 }}>❌</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    key={item.code + index}
                    style={[
                      styles.currencyTableRow,
                      rowDirectionStyle,
                      isSelected && { backgroundColor: '#e7f5ff', borderLeftWidth: 4, borderLeftColor: colors.primary }
                    ]}
                    onPress={() => handleSelectCurrency(item)}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16 }}>
                        {isSelected ? '🔘' : '⚪'}
                      </Text>
                    </View>
                    <Text style={[styles.currencyTableCell, textAlignStyle, { flex: 2, fontWeight: isSelected ? 'bold' : 'normal' }]}>
                      {item.code} ({item.symbol})
                    </Text>
                    <Text style={[styles.currencyTableCell, { width: 50, textAlign: 'center', fontWeight: 'bold', color: colors.primary }]}>
                      {item.symbol}
                    </Text>
                    <Text style={[styles.currencyTableCell, textAlignStyle, { flex: 2, color: '#495057' }]}>
                      1 {item.code} = ₪{item.rateToILS.toFixed(2)}
                    </Text>
                    <View style={[rowDirectionStyle, { width: 80, justifyContent: 'center', gap: 6 }]}>
                      <TouchableOpacity onPress={() => handleStartEditRow(index)} style={styles.iconBtn}>
                        <Text style={{ fontSize: 14 }}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteRow(index)} style={styles.iconBtn}>
                        <Text style={{ fontSize: 14 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Active Selected Currency Rate Detail */}
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.label, textAlignStyle]}>
              {isRTL 
                ? `שער המרה פעיל מ-${selectedItem.code} (${selectedItem.symbol}) לשקל (ILS) *` 
                : `Active Exchange Rate from ${selectedItem.code} (${selectedItem.symbol}) to ILS *`}
            </Text>
            <TextInput
              style={[styles.input, textAlignStyle]}
              value={exchangeRate}
              onChangeText={setExchangeRate}
              keyboardType="decimal-pad"
              placeholder="e.g. 3.70"
              placeholderTextColor="#adb5bd"
            />
          </View>

          {/* Time Format Selector */}
          <Text style={[styles.label, textAlignStyle, { marginTop: 8 }]}>
            ⏱️ {isRTL ? 'פורמט הצגת שעה *' : 'Display Time Format *'}
          </Text>
          <View style={[styles.currencyRow, rowDirectionStyle]}>
            <TouchableOpacity
              style={[
                styles.currencyChip,
                { flex: 1, alignItems: 'center' },
                timeFormat === '24h' && styles.currencyChipSelected
              ]}
              onPress={() => setTimeFormat('24h')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.currencyChipText,
                  timeFormat === '24h' && styles.currencyChipTextSelected
                ]}
              >
                24-Hour (14:30)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.currencyChip,
                { flex: 1, alignItems: 'center' },
                timeFormat === '12h' && styles.currencyChipSelected
              ]}
              onPress={() => setTimeFormat('12h')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.currencyChipText,
                  timeFormat === '12h' && styles.currencyChipTextSelected
                ]}
              >
                12-Hour (02:30 PM)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Packing & Equipment Categories Management */}
          <Text style={[styles.label, textAlignStyle, { marginTop: 16, color: colors.primary, fontWeight: 'bold' }]}>
            🎒 {isRTL ? 'קטגוריות רשימת אריזה וציוד' : 'Packing & Equipment Categories'}
          </Text>

          <View style={{ backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#dee2e6', marginBottom: 16 }}>
            <View style={[rowDirectionStyle, { flexWrap: 'wrap', gap: 8, marginBottom: 12 }]}>
              {packingCategories.map((cat, idx) => (
                <View
                  key={cat + idx}
                  style={[rowDirectionStyle, {
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: colors.primary,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    gap: 6
                  }]}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>
                    {cat}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={{ padding: 2 }}>
                    <Text style={{ fontSize: 12, color: '#e03131', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={[rowDirectionStyle, { gap: 8 }]}>
              <TextInput
                style={[styles.input, textAlignStyle, { flex: 1, backgroundColor: '#ffffff' }]}
                placeholder={isRTL ? 'שם קטגוריה חדשה (למשל: ⛺ ציוד קמפינג)...' : 'New category name...'}
                value={newCategoryText}
                onChangeText={setNewCategoryText}
              />
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                onPress={handleAddCategory}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                  + {isRTL ? 'הוסף' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Static Preview Info Card */}
          <View style={[styles.previewCard, rowDirectionStyle]}>
            <Text style={styles.previewText}>
              💡 {isRTL 
                ? `תצוגה מקדימה: 100 ${selectedItem.code} (${selectedItem.symbol}) = ₪${(100 * (parseFloat(exchangeRate) || 0)).toFixed(2)} | פורמט: ${timeFormat}`
                : `Preview: 100 ${selectedItem.code} (${selectedItem.symbol}) = ₪${(100 * (parseFloat(exchangeRate) || 0)).toFixed(2)} | Format: ${timeFormat}`}
            </Text>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveSettings}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>
                {isRTL ? 'שמור הגדרות' : 'Save Settings'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>
              {isRTL ? 'ביטול' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  card: {
    width: '100%',
    maxWidth: 550,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  addRowTriggerBtn: {
    backgroundColor: '#ebfbee',
    borderColor: '#40c057',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addRowTriggerBtnText: {
    color: '#2b8a3e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addRowFormCard: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  addRowFormTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  formCol: {
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 11,
    color: '#495057',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  tableInput: {
    height: 36,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    backgroundColor: '#fff',
    color: '#212529',
  },
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  saveRowBtn: {
    backgroundColor: '#2b8a3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveRowBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelRowBtn: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelRowBtnText: {
    color: '#495057',
    fontSize: 12,
  },
  currencyTableContainer: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  currencyTableHeader: {
    backgroundColor: '#f1f3f5',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  currencyTableHeaderText: {
    fontWeight: 'bold',
    color: '#343a40',
    fontSize: 12,
  },
  currencyTableRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    alignItems: 'center',
  },
  currencyTableEditRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#74c0fc',
    backgroundColor: '#e7f5ff',
    alignItems: 'center',
  },
  currencyTableCell: {
    fontSize: 13,
    color: '#212529',
  },
  iconBtn: {
    padding: 4,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  currencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  currencyChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  currencyChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#495057',
  },
  currencyChipTextSelected: {
    color: colors.white,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: '#f8f9fa',
  },
  previewCard: {
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#a5d8ff',
  },
  previewText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: '#0b7285',
    fontWeight: typography.weights.medium,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  saveBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  cancelBtn: {
    backgroundColor: '#f1f3f5',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#495057',
  },
});
