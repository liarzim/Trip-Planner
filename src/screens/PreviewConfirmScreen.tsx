import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createEvent } from '../services/dbService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTranslation } from '../services/translationService';

type PreviewConfirmRouteProp = RouteProp<RootStackParamList, 'PreviewConfirm'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PreviewConfirm'>;

interface ParsedEvent {
  title: string;
  type: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  bookingReference?: string;
  latitude?: number;
  longitude?: number;
}

export default function PreviewConfirmScreen() {
  const route = useRoute<PreviewConfirmRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { tripId, parsedEvents } = route.params;

  const { t, isRTL } = useTranslation();

  const [events, setEvents] = useState<ParsedEvent[]>(
    parsedEvents.map(e => ({
      title: e.title || '',
      type: e.type || 'activity',
      date: e.date || '',
      startTime: e.startTime || '',
      endTime: e.endTime || '',
      location: e.location || '',
      bookingReference: e.bookingReference || '',
      latitude: e.latitude,
      longitude: e.longitude,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFieldChange = (index: number, field: keyof ParsedEvent, value: string) => {
    const updated = [...events];
    if (field === 'latitude' || field === 'longitude') {
      const parsed = parseFloat(value);
      updated[index] = { ...updated[index], [field]: isNaN(parsed) ? undefined : parsed };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEvents(updated);
  };

  const handleDeleteRow = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    // Validate required fields
    for (let i = 0; i < events.length; i++) {
      const item = events[i];
      if (!item.title.trim()) {
        setError(`Event #${i + 1} must have a title.`);
        return;
      }
      if (!item.date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(item.date.trim())) {
        setError(`Event #${i + 1} must have a valid date in YYYY-MM-DD format.`);
        return;
      }
    }

    setError('');
    setSaving(true);

    try {
      // Save all events to Firestore
      await Promise.all(
        events.map((event) => {
          // Combine date and time to preserve chronology in startTime field
          const combinedStart = event.startTime
            ? `${event.date} ${event.startTime}`
            : event.date;
          const combinedEnd = event.endTime
            ? `${event.date} ${event.endTime}`
            : '';

          return createEvent(
            tripId,
            event.title.trim(),
            event.type.toLowerCase(),
            combinedStart,
            combinedEnd,
            event.latitude,
            event.longitude,
            event.bookingReference?.trim() || undefined
          );
        })
      );

      alert(isRTL ? `שמר בהצלחה ${events.length} אירועים לטיול שלך!` : `Successfully saved ${events.length} events to your trip!`);
      navigation.navigate('TripDashboard', { tripId });
    } catch (err: any) {
      setError(err.message || 'Failed to save events to trip.');
    } finally {
      setSaving(false);
    }
  };

  const isWeb = Platform.OS === 'web';

  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };
  const rowDirectionStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };

  const renderWebTable = () => (
    <ScrollView horizontal style={styles.webScrollHorizontal}>
      <View style={styles.tableContainer}>
        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeader, rowDirectionStyle]}>
          <Text style={[styles.tableHeaderCell, { width: 180 }, textAlignStyle]}>{isRTL ? 'שם האירוע *' : 'Event Title *'}</Text>
          <Text style={[styles.tableHeaderCell, { width: 180 }, textAlignStyle]}>{isRTL ? 'סוג *' : 'Type *'}</Text>
          <Text style={[styles.tableHeaderCell, { width: 130 }, textAlignStyle]}>{isRTL ? 'תאריך *' : 'Date *'}</Text>
          <Text style={[styles.tableHeaderCell, { width: 100 }, textAlignStyle]}>{isRTL ? 'שעת התחלה' : 'Start Time'}</Text>
          <Text style={[styles.tableHeaderCell, { width: 100 }, textAlignStyle]}>{isRTL ? 'שעת סיום' : 'End Time'}</Text>
          <Text style={[styles.tableHeaderCell, { width: 150 }, textAlignStyle]}>{isRTL ? 'מיקום' : 'Location'}</Text>
          <Text style={[styles.tableHeaderCell, { width: 130 }, textAlignStyle]}>{isRTL ? 'מספר הזמנה' : 'Booking Ref'}</Text>
          <Text style={[styles.tableHeaderCell, { width: 80, textAlign: 'center' }]}>{isRTL ? 'פעולה' : 'Action'}</Text>
        </View>

        {/* Table Body */}
        {events.length === 0 ? (
          <View style={styles.emptyTable}>
            <Text style={styles.emptyTableText}>{isRTL ? 'אין אירועים להצגה.' : 'No events to display. All events were deleted.'}</Text>
          </View>
        ) : (
          events.map((item, index) => (
            <View key={index} style={[styles.tableRow, rowDirectionStyle]}>
              <View style={{ width: 180, paddingHorizontal: 4 }}>
                <TextInput
                  style={[styles.tableInput, textAlignStyle]}
                  value={item.title}
                  onChangeText={(val) => handleFieldChange(index, 'title', val)}
                  placeholder="Flight UA123"
                />
              </View>
              <View style={{ width: 180, paddingHorizontal: 4 }}>
                <View style={[styles.tableTypeSelector, rowDirectionStyle]}>
                  {['flight', 'hotel', 'restaurant', 'activity', 'other'].map((typeVal) => (
                    <TouchableOpacity
                      key={typeVal}
                      style={[
                        styles.tableTypeBtn,
                        item.type === typeVal && styles.tableTypeBtnActive,
                      ]}
                      onPress={() => handleFieldChange(index, 'type', typeVal)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.tableTypeBtnText,
                          item.type === typeVal && styles.tableTypeBtnTextActive,
                        ]}
                      >
                        {typeVal.substring(0, 3).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ width: 130, paddingHorizontal: 4 }}>
                <TextInput
                  style={[styles.tableInput, textAlignStyle]}
                  value={item.date}
                  onChangeText={(val) => handleFieldChange(index, 'date', val)}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={{ width: 100, paddingHorizontal: 4 }}>
                <TextInput
                  style={[styles.tableInput, textAlignStyle]}
                  value={item.startTime}
                  onChangeText={(val) => handleFieldChange(index, 'startTime', val)}
                  placeholder="14:30"
                />
              </View>
              <View style={{ width: 100, paddingHorizontal: 4 }}>
                <TextInput
                  style={[styles.tableInput, textAlignStyle]}
                  value={item.endTime}
                  onChangeText={(val) => handleFieldChange(index, 'endTime', val)}
                  placeholder="18:00"
                />
              </View>
              <View style={{ width: 150, paddingHorizontal: 4 }}>
                <TextInput
                  style={[styles.tableInput, textAlignStyle]}
                  value={item.location}
                  onChangeText={(val) => handleFieldChange(index, 'location', val)}
                  placeholder="Paris, France"
                />
              </View>
              <View style={{ width: 130, paddingHorizontal: 4 }}>
                <TextInput
                  style={[styles.tableInput, textAlignStyle]}
                  value={item.bookingReference}
                  onChangeText={(val) => handleFieldChange(index, 'bookingReference', val)}
                  placeholder="REF123"
                />
              </View>
              <View style={{ width: 80, alignItems: 'center' }}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteRow(index)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderMobileCards = () => (
    <ScrollView contentContainerStyle={styles.mobileCardsContainer}>
      {events.length === 0 ? (
        <View style={styles.emptyTable}>
          <Text style={styles.emptyTableText}>{isRTL ? 'אין אירועים להצגה.' : 'No events to display. All events were deleted.'}</Text>
        </View>
      ) : (
        events.map((item, index) => (
          <View key={index} style={[styles.eventCard, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.cardHeaderRow, rowDirectionStyle]}>
              <Text style={styles.cardIndexText}>{isRTL ? `אירוע #${index + 1}` : `Event #${index + 1}`}</Text>
              <TouchableOpacity
                style={styles.mobileDeleteBtn}
                onPress={() => handleDeleteRow(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.mobileDeleteBtnText}>{isRTL ? 'הסר' : 'Remove'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { width: '100%' }]}>
              <Text style={[styles.label, textAlignStyle]}>{isRTL ? 'שם האירוע *' : 'Title *'}</Text>
              <TextInput
                style={[styles.input, textAlignStyle]}
                value={item.title}
                onChangeText={(val) => handleFieldChange(index, 'title', val)}
                placeholder="Flight UA123"
              />
            </View>

            <View style={[styles.inputGroup, { width: '100%' }]}>
              <Text style={[styles.label, textAlignStyle]}>{isRTL ? 'סוג *' : 'Type *'}</Text>
              <View style={[styles.typeSelector, rowDirectionStyle]}>
                {['flight', 'hotel', 'restaurant', 'activity', 'other'].map((typeVal) => (
                  <TouchableOpacity
                    key={typeVal}
                    style={[
                      styles.typeSelectorBtn,
                      item.type === typeVal && styles.typeSelectorBtnActive,
                    ]}
                    onPress={() => handleFieldChange(index, 'type', typeVal)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.typeSelectorBtnText,
                        item.type === typeVal && styles.typeSelectorBtnTextActive,
                      ]}
                    >
                      {typeVal.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.row, rowDirectionStyle, { width: '100%' }]}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>
                <Text style={[styles.label, textAlignStyle]}>{isRTL ? 'תאריך *' : 'Date *'}</Text>
                <TextInput
                  style={[styles.input, textAlignStyle]}
                  value={item.date}
                  onChangeText={(val) => handleFieldChange(index, 'date', val)}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginRight: isRTL ? 8 : 0, marginLeft: isRTL ? 0 : 8 }]}>
                <Text style={[styles.label, textAlignStyle]}>{isRTL ? 'שעת התחלה' : 'Start Time'}</Text>
                <TextInput
                  style={[styles.input, textAlignStyle]}
                  value={item.startTime}
                  onChangeText={(val) => handleFieldChange(index, 'startTime', val)}
                  placeholder="14:30"
                />
              </View>
            </View>

            <View style={[styles.row, rowDirectionStyle, { width: '100%' }]}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>
                <Text style={[styles.label, textAlignStyle]}>{isRTL ? 'שעת סיום' : 'End Time'}</Text>
                <TextInput
                  style={[styles.input, textAlignStyle]}
                  value={item.endTime}
                  onChangeText={(val) => handleFieldChange(index, 'endTime', val)}
                  placeholder="18:00"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginRight: isRTL ? 8 : 0, marginLeft: isRTL ? 0 : 8 }]}>
                <Text style={[styles.label, textAlignStyle]}>{isRTL ? 'מספר הזמנה' : 'Booking Ref'}</Text>
                <TextInput
                  style={[styles.input, textAlignStyle]}
                  value={item.bookingReference}
                  onChangeText={(val) => handleFieldChange(index, 'bookingReference', val)}
                  placeholder="LH123"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { width: '100%' }]}>
              <Text style={[styles.label, textAlignStyle]}>{isRTL ? 'מיקום' : 'Location'}</Text>
              <TextInput
                style={[styles.input, textAlignStyle]}
                value={item.location}
                onChangeText={(val) => handleFieldChange(index, 'location', val)}
                placeholder="Paris, France"
              />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, rowDirectionStyle]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('TripDashboard', { tripId })}
        >
          <Text style={styles.backText}>{t('preview.cancel_btn')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('preview.title')}</Text>
        <TouchableOpacity
          style={styles.saveHeaderButton}
          onPress={handleSaveAll}
          disabled={saving || events.length === 0}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveHeaderText}>{isRTL ? 'שמור' : 'Save'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.introCard, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={styles.introTitle}>🔍  {isRTL ? 'אירועים שחולצו' : 'Extracted Itinerary Events'}</Text>
        <Text style={[styles.introSubtitle, textAlignStyle]}>
          {isRTL 
            ? `מצאנו ${events.length} אירועים. אנא בדוק, ערוך או מחק פריטים לפני שמירתם.`
            : `We found ${events.length} events. Please review, edit, or delete items before saving them.`
          }
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={[styles.content, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        {isWeb ? renderWebTable() : renderMobileCards()}
      </View>

      {/* Floating Save Button on Mobile / Web Footer */}
      {isWeb ? (
        <View style={styles.webFooter}>
          <TouchableOpacity
            style={styles.webSaveButton}
            onPress={handleSaveAll}
            disabled={saving || events.length === 0}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.mobileSaveButtonText}>
                {isRTL ? `שמור ${events.length} אירועים לטיול` : `Save ${events.length} Events to Trip`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mobileFooter}>
          <TouchableOpacity
            style={styles.mobileSaveButton}
            onPress={handleSaveAll}
            disabled={saving || events.length === 0}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.mobileSaveButtonText}>
                {isRTL ? `שמור ${events.length} אירועים לטיול` : `Save ${events.length} Events to Trip`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  backText: {
    color: colors.textLight,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  saveHeaderButton: {
    backgroundColor: colors.primary,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  saveHeaderText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  introCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  introTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  introSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    lineHeight: 18,
  },
  errorText: {
    color: '#fa5252',
    backgroundColor: '#fff5f5',
    padding: 12,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffe3e3',
  },
  content: {
    flex: 1,
  },
  webScrollHorizontal: {
    flex: 1,
  },
  tableContainer: {
    padding: 20,
  },
  tableRow: {
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeader: {
    backgroundColor: '#f1f3f5',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#dee2e6',
  },
  tableHeaderCell: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    paddingHorizontal: 8,
  },
  tableInput: {
    height: 36,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
    fontSize: typography.sizes.sm,
    color: colors.text,
    width: '100%',
  },
  tableTypeSelector: {
    width: '100%',
  },
  tableTypeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 5,
    marginRight: 2,
    backgroundColor: colors.white,
  },
  tableTypeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tableTypeBtnText: {
    fontSize: 8,
    fontWeight: typography.weights.semibold,
    color: colors.textLight,
  },
  tableTypeBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffe3e3',
  },
  deleteButtonText: {
    color: '#fa5252',
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  emptyTable: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTableText: {
    fontFamily: typography.fontFamily,
    color: colors.textLight,
    fontSize: typography.sizes.md,
  },
  mobileCardsContainer: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  cardHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    paddingBottom: 8,
    width: '100%',
  },
  cardIndexText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  mobileDeleteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffe3e3',
  },
  mobileDeleteBtnText: {
    color: '#fa5252',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textLight,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  typeSelector: {
    marginTop: 4,
  },
  typeSelectorBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: colors.white,
  },
  typeSelectorBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeSelectorBtnText: {
    fontSize: 9,
    fontWeight: typography.weights.semibold,
    color: colors.textLight,
  },
  typeSelectorBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  row: {
    // Row style handled dynamically
  },
  mobileFooter: {
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mobileSaveButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSaveButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  webFooter: {
    padding: 20,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  webSaveButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    width: '100%',
    maxWidth: 400,
  },
});
