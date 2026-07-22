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
  SafeAreaView
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getTrip, updateTripSettings } from '../services/dbService';
import { useTranslation } from '../services/translationService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SUPPORTED_CURRENCIES, formatCurrencyLabel, getCurrencySymbol } from '../utils/currencyRegistry';

type TripSettingsRouteProp = RouteProp<RootStackParamList, 'TripSettings'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TripSettings'>;

const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'ILS', 'JPY', 'CHF', 'CNY', 'NZD', 'THB', 'INR', 'AED', 'CUSTOM'];

export default function TripSettingsScreen() {
  const route = useRoute<TripSettingsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { tripId } = route.params;

  const { t, isRTL } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [exchangeRate, setExchangeRate] = useState('3.70');
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h'>('24h');
  const [tripName, setTripName] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const trip = await getTrip(tripId);
        if (trip) {
          setTripName(trip.name);
          if (trip.baseCurrency) {
            if (POPULAR_CURRENCIES.includes(trip.baseCurrency) && trip.baseCurrency !== 'CUSTOM') {
              setBaseCurrency(trip.baseCurrency);
              setIsCustomMode(false);
            } else {
              setBaseCurrency('CUSTOM');
              setCustomCurrency(trip.baseCurrency);
              setIsCustomMode(true);
            }
          }
          if (trip.exchangeRateToILS) setExchangeRate(trip.exchangeRateToILS.toString());
          if (trip.timeFormat) setTimeFormat(trip.timeFormat);
        }
      } catch (err) {
        console.error('Failed to load trip settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [tripId]);

  const handleSave = async () => {
    const finalCurrency = isCustomMode ? customCurrency.trim().toUpperCase() : baseCurrency;
    if (!finalCurrency) {
      const errorMsg = isRTL 
        ? 'אנא הזן קוד מטבע תקין' 
        : 'Please enter a valid currency code';
      if (Platform.OS === 'web') alert(errorMsg); else Alert.alert('Error', errorMsg);
      return;
    }

    const parsedRate = parseFloat(exchangeRate);
    if (isNaN(parsedRate) || !isFinite(parsedRate) || parsedRate <= 0) {
      const errorMsg = isRTL 
        ? 'אנא הזן שער חליפין תקין (מספר חיובי גדול מ-0)' 
        : 'Please enter a valid numeric exchange rate (positive number greater than 0)';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      return;
    }

    try {
      setSaving(true);
      await updateTripSettings(tripId, finalCurrency, parsedRate, timeFormat);
      
      const successMsg = isRTL 
        ? 'ההגדרות נשמרו בהצלחה!' 
        : 'Settings saved successfully!';
      if (Platform.OS === 'web') {
        alert(successMsg);
      } else {
        Alert.alert('Success', successMsg);
      }
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save settings:', err);
      const errorMsg = isRTL 
        ? 'שגיאה בשמירת ההגדרות.' 
        : 'Failed to save settings.';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
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

  const activeDisplayCurrency = isCustomMode ? (customCurrency.toUpperCase() || 'CURR') : baseCurrency;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={[styles.title, textAlignStyle]}>
            {isRTL ? `הגדרות טיול עבור ${tripName}` : `Trip Settings for ${tripName}`}
          </Text>
          <Text style={[styles.subtitle, textAlignStyle]}>
            {isRTL 
              ? 'הגדר את מטבע הבסיס, שער ההמרה ופורמט הצגת השעה' 
              : 'Define trip base currency, conversion rate, and time display format'}
          </Text>

          {/* Currency Selection Grid */}
          <Text style={[styles.label, textAlignStyle]}>
            {isRTL ? 'מטבע בסיס *' : 'Base Currency *'}
          </Text>
          <View style={[styles.currencyRow, rowDirectionStyle, { flexWrap: 'wrap' }]}>
            {POPULAR_CURRENCIES.map((curr) => {
              const isSelected = isCustomMode ? curr === 'CUSTOM' : baseCurrency === curr;
              const displayLabel = curr === 'CUSTOM'
                ? (isRTL ? '➕ אחר (מותאם אישית)' : '➕ Custom Currency')
                : formatCurrencyLabel(curr);
              return (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currencyChip,
                    isSelected && styles.currencyChipSelected
                  ]}
                  onPress={() => {
                    if (curr === 'CUSTOM') {
                      setBaseCurrency('CUSTOM');
                      setIsCustomMode(true);
                    } else {
                      setBaseCurrency(curr);
                      setIsCustomMode(false);
                      const found = SUPPORTED_CURRENCIES.find(c => c.code === curr);
                      if (found) setExchangeRate(found.defaultRateToILS.toString());
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.currencyChipText,
                      isSelected && styles.currencyChipTextSelected
                    ]}
                  >
                    {displayLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Currency Text Input if CUSTOM selected */}
          {isCustomMode && (
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.label, textAlignStyle]}>
                {isRTL ? 'הזן קוד/סמל מטבע מותאם אישית (למשל: SGD, HUF, CZK, ₪) *' : 'Enter Custom Currency Code (e.g. SGD, HUF, CZK, ₪) *'}
              </Text>
              <TextInput
                style={[styles.input, textAlignStyle, { backgroundColor: '#fff' }]}
                value={customCurrency}
                onChangeText={setCustomCurrency}
                placeholder="e.g. SGD, HUF, CZK, ₪"
                placeholderTextColor="#adb5bd"
                autoCapitalize="characters"
              />
            </View>
          )}

          {/* Exchange Rate Input */}
          <Text style={[styles.label, textAlignStyle]}>
            {isRTL 
              ? `שער המרה מ-${formatCurrencyLabel(activeDisplayCurrency)} לשקל (ILS) *` 
              : `Exchange Rate from ${formatCurrencyLabel(activeDisplayCurrency)} to ILS *`}
          </Text>
          <TextInput
            style={[styles.input, textAlignStyle]}
            value={exchangeRate}
            onChangeText={setExchangeRate}
            keyboardType="decimal-pad"
            placeholder="e.g. 4.05"
            placeholderTextColor="#adb5bd"
          />

          {/* Currency Reference & Exchange Rates Table */}
          <Text style={[styles.label, textAlignStyle, { marginTop: 10, fontSize: 13, color: colors.primary }]}>
            📊 {isRTL ? 'טבלת מטבעות ושערי המרה (לחץ לבחירה)' : 'Currency Rates Reference Table (Tap to select)'}
          </Text>
          <View style={styles.currencyTableContainer}>
            <View style={[styles.currencyTableHeader, rowDirectionStyle]}>
              <Text style={[styles.currencyTableCell, styles.currencyTableHeaderText, textAlignStyle, { flex: 2 }]}>
                {isRTL ? 'מטבע (שם)' : 'Currency (Code)'}
              </Text>
              <Text style={[styles.currencyTableCell, styles.currencyTableHeaderText, { width: 50, textAlign: 'center' }]}>
                {isRTL ? 'סמל' : 'Symbol'}
              </Text>
              <Text style={[styles.currencyTableCell, styles.currencyTableHeaderText, textAlignStyle, { flex: 2 }]}>
                {isRTL ? 'שער לשקל (ILS)' : 'Rate to ILS (₪)'}
              </Text>
            </View>
            <View style={{ maxHeight: 150, overflow: 'auto' as any }}>
              {SUPPORTED_CURRENCIES.map((c) => {
                const isRowSelected = !isCustomMode && baseCurrency === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[
                      styles.currencyTableRow,
                      rowDirectionStyle,
                      isRowSelected && { backgroundColor: '#e7f5ff' }
                    ]}
                    onPress={() => {
                      setBaseCurrency(c.code);
                      setExchangeRate(c.defaultRateToILS.toString());
                      setIsCustomMode(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.currencyTableCell, textAlignStyle, { flex: 2, fontWeight: isRowSelected ? 'bold' : 'normal' }]}>
                      {formatCurrencyLabel(c.code, c.symbol)}
                    </Text>
                    <Text style={[styles.currencyTableCell, { width: 50, textAlign: 'center', fontWeight: 'bold', color: colors.primary }]}>
                      {c.symbol}
                    </Text>
                    <Text style={[styles.currencyTableCell, textAlignStyle, { flex: 2, color: '#495057' }]}>
                      1 {c.code} = ₪{c.defaultRateToILS.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Time Format Selector */}
          <Text style={[styles.label, textAlignStyle, { marginTop: 14 }]}>
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

          {/* Static Preview Info Card */}
          <View style={[styles.previewCard, rowDirectionStyle]}>
            <Text style={styles.previewText}>
              💡 {isRTL 
                ? `תצוגה מקדימה: 100 ${formatCurrencyLabel(activeDisplayCurrency)} = ₪${(100 * (parseFloat(exchangeRate) || 0)).toFixed(2)} | פורמט: ${timeFormat}`
                : `Preview: 100 ${formatCurrencyLabel(activeDisplayCurrency)} = ₪${(100 * (parseFloat(exchangeRate) || 0)).toFixed(2)} | Format: ${timeFormat}`}
            </Text>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
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
    maxWidth: 500,
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
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 10,
  },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
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
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: '#f8f9fa',
    marginBottom: 16,
  },
  previewCard: {
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
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
    marginBottom: 12,
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
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  currencyTableHeaderText: {
    fontWeight: 'bold',
    color: '#343a40',
    fontSize: 12,
  },
  currencyTableRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    alignItems: 'center',
  },
  currencyTableCell: {
    fontSize: 13,
    color: '#212529',
  },
});
