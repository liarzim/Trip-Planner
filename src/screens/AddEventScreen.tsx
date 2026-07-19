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

type AddEventRouteProp = RouteProp<RootStackParamList, 'AddEvent'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddEvent'>;

export default function AddEventScreen() {
  const route = useRoute<AddEventRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { tripId } = route.params;

  const [title, setTitle] = useState('');
  const [type, setType] = useState('flight'); // Default type: flight
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title || !type || !startTime) {
      setError('Please fill in all required fields (Title, Type, Start Time).');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await createEvent(tripId, title, type, startTime, endTime);
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Failed to add event.');
    } finally {
      setLoading(false);
    }
  };

  const eventTypes = [
    { label: '✈️ Flight', value: 'flight' },
    { label: '🏨 Hotel', value: 'hotel' },
    { label: '📍 POI', value: 'poi' },
  ];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>Add Itinerary Event</Text>
            <Text style={styles.subtitle}>Specify the details of your activity</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Event Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Flight to Paris, Check-in at Hilton"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="sentences"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Event Type *</Text>
              <View style={styles.typeSelectorContainer}>
                {eventTypes.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.typeOption,
                      type === item.value && styles.typeOptionSelected,
                    ]}
                    onPress={() => setType(item.value)}
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
              <Text style={styles.label}>Start Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 08:30 AM, 14:00"
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>End Time (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 11:30 AM, 18:00"
                value={endTime}
                onChangeText={setEndTime}
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
                <Text style={styles.primaryButtonText}>Save Event</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
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
