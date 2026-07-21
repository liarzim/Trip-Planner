import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createEvent } from '../services/dbService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTranslation } from '../services/translationService';
import MapPicker from '../components/MapPicker';
import { colors } from '../theme/colors';

type AddEventRouteProp = RouteProp<RootStackParamList, 'AddEvent'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddEvent'>;

export default function AddEventScreen() {
  const route = useRoute<AddEventRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { tripId } = route.params;

  const { t, isRTL } = useTranslation();

  const [title, setTitle] = useState('');
  const [type, setType] = useState('flight'); // Default type: flight
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title || !type || !startTime) {
      setError(t('event.required_error'));
      return;
    }

    const latVal = latitude ? parseFloat(latitude) : undefined;
    const lonVal = longitude ? parseFloat(longitude) : undefined;

    if (latitude && isNaN(latVal!)) {
      setError(t('event.lat_error'));
      return;
    }
    if (longitude && isNaN(lonVal!)) {
      setError(t('event.lon_error'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      await createEvent(
        tripId, 
        title, 
        type as 'flight' | 'hotel' | 'waypoint', 
        startTime, 
        endTime, 
        latVal, 
        lonVal, 
        bookingReference || undefined,
        description || undefined
      );
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Failed to add event.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelected = (lat: number, lon: number) => {
    setLatitude(lat.toString());
    setLongitude(lon.toString());
  };

  const eventTypes = [
    { label: `✈️ ${t('event.flight')}`, value: 'flight' },
    { label: `🏨 ${t('event.hotel')}`, value: 'hotel' },
    { label: `📍 ${isRTL ? 'נקודת ציון' : 'Waypoint'}`, value: 'waypoint' },
  ];

  // Dynamic layout alignment rules based on RTL orientation
  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };
  const rowDirectionStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };

  const formContent = (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={[styles.card, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        <Text style={styles.title}>{t('event.add_title')}</Text>
        <Text style={styles.subtitle}>{t('event.specify_details')}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('event.title_label')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle]}
            placeholder={t('event.title_placeholder')}
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('event.type_label')}</Text>
          <View style={[styles.typeSelectorContainer, rowDirectionStyle]}>
            {eventTypes.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.typeOption,
                  type === item.value && styles.typeOptionSelected,
                ]}
                onPress={() => setType(item.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    type === item.value && styles.typeOptionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('event.start_time')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle]}
            placeholder={t('event.start_placeholder')}
            value={startTime}
            onChangeText={setStartTime}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('event.end_time')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle]}
            placeholder={t('event.end_placeholder')}
            value={endTime}
            onChangeText={setEndTime}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('event.booking_ref')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle]}
            placeholder={t('event.booking_placeholder')}
            value={bookingReference}
            onChangeText={setBookingReference}
            autoCapitalize="characters"
          />
        </View>

        <View style={[styles.row, rowDirectionStyle]}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>
            <Text style={[styles.label, textAlignStyle]}>{t('event.latitude')}</Text>
            <TextInput
              style={[styles.input, textAlignStyle]}
              placeholder="e.g. 48.8566"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1, marginRight: isRTL ? 8 : 0, marginLeft: isRTL ? 0 : 8 }]}>
            <Text style={[styles.label, textAlignStyle]}>{t('event.longitude')}</Text>
            <TextInput
              style={[styles.input, textAlignStyle]}
              placeholder="e.g. 2.3522"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Interactive Map Picker */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('event.pin_location')}</Text>
          <MapPicker
            latitude={latitude ? parseFloat(latitude) : undefined}
            longitude={longitude ? parseFloat(longitude) : undefined}
            onSelectLocation={handleLocationSelected}
            lang={getLanguage()}
            isRTL={isRTL}
            t={t}
          />
        </View>

        {/* Multiline Notes Text Box */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('event.description')}</Text>
          <TextInput
            style={[styles.input, styles.multilineInput, textAlignStyle]}
            placeholder={t('event.description_placeholder')}
            value={description}
            onChangeText={setDescription}
            multiline={true}
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('event.save')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>{t('event.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Focus Bug Bypass on Web: return a regular View layout to prevent input click blocking
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {formContent}
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {formContent}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

// Global language utility mapping helper
function getLanguage() {
  const { getLanguage } = require('../services/translationService');
  return getLanguage();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#868e96',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorText: {
    color: '#fa5252',
    backgroundColor: '#fff5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#212529',
    backgroundColor: '#f8f9fa',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  typeOptionSelected: {
    borderColor: '#228be6',
    backgroundColor: '#e7f5ff',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
  },
  typeOptionTextSelected: {
    color: '#228be6',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primaryButton: {
    backgroundColor: '#228be6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  secondaryButtonText: {
    color: '#495057',
    fontSize: 15,
    fontWeight: '600',
  },
});
