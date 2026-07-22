import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { signOut } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth } from '../config/firebaseConfig';
import { getTripsForUser, updateTripStatus, updateTripDetails, deleteTrip } from '../services/dbService';
import { Trip } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTranslation } from '../services/translationService';
import LanguageSelector from '../components/LanguageSelector';
import DatePickerInput from '../components/DatePickerInput';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'planned' | 'archived'>('all');

  // Edit Trip Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const { t, isRTL } = useTranslation();

  const user = auth.currentUser;
  const welcomeName = user?.displayName || user?.email || 'Traveler';

  const fetchTrips = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getTripsForUser(user.uid);
      setTrips(data);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTrips();
    }, [user])
  );

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Toggle Archive / Unarchive Trip
  const handleToggleArchive = async (trip: Trip) => {
    const newStatus = trip.status === 'archived' ? 'planned' : 'archived';
    try {
      await updateTripStatus(trip.id, newStatus);
      await fetchTrips();
    } catch (err) {
      console.error('Error updating trip status:', err);
    }
  };

  // Delete Trip
  const handleDeleteTrip = async (trip: Trip) => {
    const confirmMsg = isRTL 
      ? `האם אתה בטוח שברצונך למחוק את הטיול "${trip.name}"? כל האירועים והמסמכים יימחקו.`
      : `Are you sure you want to delete "${trip.name}"? All associated events and documents will be deleted.`;

    const confirmDelete = async () => {
      try {
        await deleteTrip(trip.id);
        await fetchTrips();
      } catch (err) {
        console.error('Error deleting trip:', err);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        await confirmDelete();
      }
    } else {
      Alert.alert(
        isRTL ? 'מחיקת טיול' : 'Delete Trip',
        confirmMsg,
        [
          { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel' },
          { text: isRTL ? 'מחק' : 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (trip: Trip) => {
    setEditingTripId(trip.id);
    setEditName(trip.name);
    setEditStartDate(trip.startDate);
    setEditEndDate(trip.endDate);
    setEditError('');
    setIsEditModalVisible(true);
  };

  // Save Edit Trip
  const handleSaveEdit = async () => {
    if (!editName.trim() || !editStartDate.trim() || !editEndDate.trim()) {
      setEditError(isRTL ? 'אנא מלא את כל השדות' : 'Please fill in all fields');
      return;
    }
    if (!editingTripId) return;

    try {
      setEditSaving(true);
      await updateTripDetails(editingTripId, editName.trim(), editStartDate.trim(), editEndDate.trim());
      setIsEditModalVisible(false);
      setEditingTripId(null);
      await fetchTrips();
    } catch (err) {
      console.error('Error saving trip details:', err);
      setEditError(isRTL ? 'נכשל בעדכון הטיול' : 'Failed to update trip');
    } finally {
      setEditSaving(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'archived':
        return { bg: '#f1f3f5', text: '#868e96' };
      case 'completed':
        return { bg: colors.primaryLight, text: colors.primary };
      case 'planned':
      default:
        return { bg: colors.secondaryLight, text: colors.secondary };
    }
  };

  const filteredTrips = trips.filter((tItem) => {
    if (activeTab === 'planned') return tItem.status !== 'archived';
    if (activeTab === 'archived') return tItem.status === 'archived';
    return true;
  });

  const renderTripItem = ({ item }: { item: Trip }) => {
    const statusStyle = getStatusBadgeStyle(item.status);
    const dateRange = isRTL 
      ? `📅  ${item.startDate} עד ${item.endDate}` 
      : `📅  ${item.startDate} to ${item.endDate}`;

    return (
      <View style={[styles.tripCard, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('TripDashboard', { tripId: item.id })}
          activeOpacity={0.8}
        >
          <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.tripName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {item.status === 'archived'
                  ? (isRTL ? 'בארכיון' : 'ARCHIVED')
                  : t(`home.${item.status.toLowerCase()}`).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={[styles.cardFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.tripDate, { textAlign: isRTL ? 'right' : 'left' }]}>
              {dateRange}
            </Text>
            <Text style={[styles.arrowIcon, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Action Toolbar for Edit, Archive, and Delete */}
        <View style={[styles.cardActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity 
            style={[styles.tripActionBtn, styles.editBtn]} 
            onPress={() => handleOpenEditModal(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.editBtnText}>✏️  {isRTL ? 'ערוך' : 'Edit'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tripActionBtn, styles.archiveBtn]} 
            onPress={() => handleToggleArchive(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.archiveBtnText}>
              📦  {item.status === 'archived' ? (isRTL ? 'שחזר' : 'Unarchive') : (isRTL ? 'ארכיון' : 'Archive')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tripActionBtn, styles.deleteBtn]} 
            onPress={() => handleDeleteTrip(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteBtnText}>🗑️  {isRTL ? 'מחק' : 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const rowDirectionStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };
  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, rowDirectionStyle]}>
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={styles.welcomeText}>{t('home.welcome')},</Text>
          <Text style={styles.userName}>{welcomeName}</Text>
        </View>
        <View style={[styles.headerRight, rowDirectionStyle]}>
          <LanguageSelector />
          <TouchableOpacity 
            style={[
              styles.signOutButton, 
              { 
                marginLeft: isRTL ? 0 : 10, 
                marginRight: isRTL ? 10 : 0 
              }
            ]} 
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>{t('home.sign_out')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.content, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        <View style={[styles.titleRow, rowDirectionStyle]}>
          <Text style={[styles.sectionTitle, textAlignStyle]}>{t('home.my_trips')}</Text>
          
          {/* Tab Filter buttons */}
          <View style={[styles.tabBar, rowDirectionStyle]}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                {isRTL ? 'הכל' : 'All'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'planned' && styles.tabBtnActive]}
              onPress={() => setActiveTab('planned')}
            >
              <Text style={[styles.tabText, activeTab === 'planned' && styles.tabTextActive]}>
                {isRTL ? 'פעילים' : 'Active'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'archived' && styles.tabBtnActive]}
              onPress={() => setActiveTab('archived')}
            >
              <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>
                {isRTL ? 'ארכיון' : 'Archived'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredTrips}
            keyExtractor={(item) => item.id}
            renderItem={renderTripItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('home.no_trips')}</Text>
                <Text style={styles.emptySubText}>{t('home.create_first')}</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Floating Action Button for Trip Creation */}
      <TouchableOpacity 
        style={[
          styles.fab, 
          isRTL ? { left: 24, right: undefined } : { right: 24, left: undefined }
        ]} 
        onPress={() => navigation.navigate('CreateTrip')}
        activeOpacity={0.9}
      >
        <Text style={styles.fabText}>+ {t('home.add_trip')}</Text>
      </TouchableOpacity>

      {/* Edit Trip Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, textAlignStyle]}>
              ✏️ {isRTL ? 'עריכת פרטי טיול' : 'Edit Trip Details'}
            </Text>

            {editError ? <Text style={styles.errorText}>{editError}</Text> : null}

            <Text style={[styles.inputLabel, textAlignStyle]}>{isRTL ? 'שם הטיול' : 'Trip Name'}</Text>
            <TextInput 
              style={[styles.input, textAlignStyle]}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Paris Summer Vacation"
            />

            <Text style={[styles.inputLabel, textAlignStyle]}>{isRTL ? 'תאריך התחלה (YYYY-MM-DD)' : 'Start Date (YYYY-MM-DD)'}</Text>
            <DatePickerInput
              value={editStartDate}
              onChange={setEditStartDate}
              placeholder="2026-08-01"
              isRTL={isRTL}
            />

            <Text style={[styles.inputLabel, textAlignStyle]}>{isRTL ? 'תאריך סיום (YYYY-MM-DD)' : 'End Date (YYYY-MM-DD)'}</Text>
            <DatePickerInput
              value={editEndDate}
              onChange={setEditEndDate}
              placeholder="2026-08-10"
              isRTL={isRTL}
            />

            <View style={[styles.modalActionsRow, rowDirectionStyle]}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>{isRTL ? 'ביטול' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveBtn}
                onPress={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>{isRTL ? 'שמור שינויים' : 'Save Changes'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRight: {
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
  },
  userName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  signOutButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffe3e3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: colors.error,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  titleRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  tabBar: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 2,
  },
  tabBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 90, 
  },
  tripCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  cardFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripDate: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    flex: 1,
  },
  arrowIcon: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  cardActionsRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 10,
    gap: 8,
  },
  tripActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    backgroundColor: '#e7f5ff',
  },
  editBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  archiveBtn: {
    backgroundColor: '#fff9db',
  },
  archiveBtnText: {
    color: '#f59f00',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#fff5f5',
  },
  deleteBtnText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: 6,
  },
  emptySubText: {
    fontFamily: typography.fontFamily,
    color: colors.textLight,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: colors.primary,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    width: '100%',
    maxWidth: 450,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 8,
  },
  modalActionsRow: {
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
  },
  modalCancelText: {
    color: colors.textLight,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalSaveText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
