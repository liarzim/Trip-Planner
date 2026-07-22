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

type TripSettingsRouteProp = RouteProp<RootStackParamList, 'TripSettings'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TripSettings'>;

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'ILS'];

export default function TripSettingsScreen() {
  const route = useRoute<TripSettingsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { tripId } = route.params;

  const { t, isRTL } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('3.70');
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h'>('24h');
  const [tripName, setTripName] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const trip = await getTrip(tripId);
        if (trip) {
          setTripName(trip.name);
          if (trip.baseCurrency) setBaseCurrency(trip.baseCurrency);
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
      await updateTripSettings(tripId, baseCurrency, parsedRate, timeFormat);
      
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
          <View style={[styles.currencyRow, rowDirectionStyle]}>
            {CURRENCIES.map((curr) => (
              <TouchableOpacity
                key={curr}
                style={[
                  styles.currencyChip,
                  baseCurrency === curr && styles.currencyChipSelected
                ]}
                onPress={() => setBaseCurrency(curr)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.currencyChipText,
                    baseCurrency === curr && styles.currencyChipTextSelected
                  ]}
                >
                  {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Exchange Rate Input */}
          <Text style={[styles.label, textAlignStyle]}>
            {isRTL 
              ? `שער המרה מ-${baseCurrency} לשקל (ILS) *` 
              : `Exchange Rate from ${baseCurrency} to ILS *`}
          </Text>
          <TextInput
            style={[styles.input, textAlignStyle]}
            value={exchangeRate}
            onChangeText={setExchangeRate}
            keyboardType="decimal-pad"
            placeholder="e.g. 4.05"
            placeholderTextColor="#adb5bd"
          />

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
                ? `תצוגה מקדימה: 100 ${baseCurrency} = ₪${(100 * (parseFloat(exchangeRate) || 0)).toFixed(2)} | פורמט: ${timeFormat}`
                : `Preview: 100 ${baseCurrency} = ₪${(100 * (parseFloat(exchangeRate) || 0)).toFixed(2)} | Format: ${timeFormat}`}
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
});
