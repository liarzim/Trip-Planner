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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../config/firebaseConfig';
import { saveTripForUser } from '../services/dbService';
import CalendarPicker from '../components/CalendarPicker';

export default function CreateTripScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calendar visibility states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleCreate = async () => {
    if (!name || !startDate || !endDate) {
      setError('Please fill in all fields.');
      return;
    }

    // Basic date format validation (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      setError('Dates must be in YYYY-MM-DD format.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to create a trip.');
      }

      // Save the trip to Firestore, linking to the user's group
      await saveTripForUser(currentUser.uid, name, startDate, endDate);
      
      // Navigate back to HomeScreen
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Failed to create trip.');
    } finally {
      setLoading(false);
    }
  };

  const renderFormContent = () => (
    <View style={styles.card}>
      <Text style={styles.title}>Plan New Trip</Text>
      <Text style={styles.subtitle}>Enter the details of your upcoming adventure</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Trip Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Vacation in Hawaii"
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Start Date</Text>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => {
            setShowStartPicker(!showStartPicker);
            setShowEndPicker(false);
          }}
        >
          <View pointerEvents="none">
            <TextInput
              style={styles.input}
              placeholder="Select start date"
              value={startDate}
              editable={false}
            />
          </View>
        </TouchableOpacity>
        {showStartPicker && (
          <CalendarPicker
            initialDate={startDate || undefined}
            onSelectDate={(date) => {
              setStartDate(date);
              setShowStartPicker(false);
            }}
            onClose={() => setShowStartPicker(false)}
          />
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>End Date</Text>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => {
            setShowEndPicker(!showEndPicker);
            setShowStartPicker(false);
          }}
        >
          <View pointerEvents="none">
            <TextInput
              style={styles.input}
              placeholder="Select end date"
              value={endDate}
              editable={false}
            />
          </View>
        </TouchableOpacity>
        {showEndPicker && (
          <CalendarPicker
            initialDate={endDate || undefined}
            onSelectDate={(date) => {
              setEndDate(date);
              setShowEndPicker(false);
            }}
            onClose={() => setShowEndPicker(false)}
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Create Trip</Text>
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
  );

  // Return standard view on Web to prevent keyboard handler issues blocking mouse clicks
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {renderFormContent()}
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {renderFormContent()}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
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
