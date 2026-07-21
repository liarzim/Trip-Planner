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
import { createExpense } from '../services/dbService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTranslation } from '../services/translationService';

type AddExpenseRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddExpense'>;

export default function AddExpenseScreen() {
  const route = useRoute<AddExpenseRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { tripId } = route.params;

  const { t, isRTL } = useTranslation();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!amount || !currency || !category || !description) {
      setError(t('expense.required_error'));
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await createExpense(tripId, parsedAmount, currency, category, description);
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Food', 'Transport', 'Accommodation', 'Other'];

  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };
  const rowDirectionStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };

  const renderFormContent = () => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={[styles.card, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        <Text style={styles.title}>{t('expense.add_title')}</Text>
        <Text style={styles.subtitle}>{t('expense.specify_details')}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('expense.amount')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle]}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('expense.currency')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle]}
            placeholder="e.g. USD, EUR"
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
            maxLength={3}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('expense.category')}</Text>
          <View style={[styles.categoryContainer, rowDirectionStyle]}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryOption,
                  category === cat && styles.categoryOptionSelected,
                ]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, textAlignStyle]}>{t('expense.description')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle]}
            placeholder={t('expense.description_placeholder')}
            value={description}
            onChangeText={setDescription}
            autoCapitalize="sentences"
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
            <Text style={styles.primaryButtonText}>{t('expense.save')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>{t('expense.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

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
  categoryContainer: {
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  categoryOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 2,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    minWidth: '45%',
    marginBottom: 8,
  },
  categoryOptionSelected: {
    borderColor: '#228be6',
    backgroundColor: '#e7f5ff',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
  },
  categoryTextSelected: {
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
