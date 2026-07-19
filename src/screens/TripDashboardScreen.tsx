import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Linking,
  Modal
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getDocumentAsync } from 'expo-document-picker';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getEventsForTrip, getExpensesForTrip, getDocumentsForTrip, saveDocument } from '../services/dbService';
import { uploadTripDocument } from '../services/storageService';
import { getCachedOrDownloadFile, isFileCached } from '../services/fileCacheService';
import { Event, Expense, Document } from '../types';
import { useNetworkState } from '../hooks/useNetworkState';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type TripDashboardRouteProp = RouteProp<RootStackParamList, 'TripDashboard'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TripDashboard'>;

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function TripDashboardScreen() {
  const route = useRoute<TripDashboardRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { tripId } = route.params;

  // Track network connectivity state
  const isOnline = useNetworkState();

  const [events, setEvents] = useState<Event[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentUploading, setDocumentUploading] = useState(false);

  // File cache mapping states
  const [cachedDocUris, setCachedDocUris] = useState<{[docId: string]: string}>({});
  const [downloadingDocs, setDownloadingDocs] = useState<{[docId: string]: boolean}>({});

  // QR Code Modal State
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [selectedBookingRef, setSelectedBookingRef] = useState('');

  // Daily Checklist State
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', text: 'Pack tickets & passports', completed: false },
    { id: '2', text: 'Confirm booking references', completed: false },
    { id: '3', text: 'Check local weather forecast', completed: false },
    { id: '4', text: 'Charge external powerbanks & phones', completed: false },
  ]);

  // Fetch events, expenses, and documents in parallel on screen focus
  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const fetchDashboardData = async () => {
        try {
          setLoading(true);
          const [fetchedEvents, fetchedExpenses, fetchedDocs] = await Promise.all([
            getEventsForTrip(tripId),
            getExpensesForTrip(tripId),
            getDocumentsForTrip(tripId)
          ]);
          
          if (active) {
            setEvents(fetchedEvents);
            setExpenses(fetchedExpenses);
            setDocuments(fetchedDocs);
            
            // Map which loaded documents are already cached locally on device
            await checkCacheStatuses(fetchedDocs);
          }
        } catch (error) {
          console.error('Failed to fetch dashboard data:', error);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      fetchDashboardData();

      return () => {
        active = false;
      };
    }, [tripId])
  );

  // Checks device storage for cached versions of documents
  const checkCacheStatuses = async (docs: Document[]) => {
    const uris: {[docId: string]: string} = {};
    const localDir = FileSystem.documentDirectory;

    for (const docItem of docs) {
      const isCached = await isFileCached(docItem.name);
      if (isCached && localDir) {
        uris[docItem.id] = `${localDir}${encodeURIComponent(docItem.name)}`;
      }
    }
    setCachedDocUris(uris);
  };

  // Open Document handler: opens local file via share/view sheet, or remote URL on web/fallback
  const handleOpenDocument = async (docId: string, remoteUrl: string) => {
    const localUri = cachedDocUris[docId];

    if (localUri) {
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(localUri);
        } else {
          Linking.openURL(localUri).catch((err) => console.error("Couldn't open local URI", err));
        }
      } catch (err) {
        console.error('Failed to share local document:', err);
        Linking.openURL(remoteUrl).catch((err) => console.error("Couldn't open remote URL", err));
      }
    } else {
      Linking.openURL(remoteUrl).catch((err) => console.error("Couldn't open URL", err));
    }
  };

  // Downloads document to local filecache
  const handleMakeAvailableOffline = async (docId: string, url: string, name: string) => {
    setDownloadingDocs((prev) => ({ ...prev, [docId]: true }));
    try {
      const localUri = await getCachedOrDownloadFile(url, name);
      setCachedDocUris((prev) => ({ ...prev, [docId]: localUri }));
    } catch (error) {
      console.error('Failed to cache file offline:', error);
      alert('Failed to cache file for offline access.');
    } finally {
      setDownloadingDocs((prev) => ({ ...prev, [docId]: false }));
    }
  };

  // Open picker, upload to Storage, and save metadata to Firestore
  const handlePickAndUpload = async () => {
    try {
      const result = await getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setDocumentUploading(true);

      // 1. Upload the file to Firebase Storage
      const downloadUrl = await uploadTripDocument(tripId, file.uri, file.name);

      // 2. Save document metadata in Firestore
      await saveDocument(tripId, file.name, downloadUrl);

      // 3. Refresh list
      const updatedDocs = await getDocumentsForTrip(tripId);
      setDocuments(updatedDocs);
      await checkCacheStatuses(updatedDocs);
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setDocumentUploading(false);
    }
  };

  // Deep Link Navigation with Komoot (with Google Maps fallback)
  const handleNavigateKomoot = async (lat: number, lon: number) => {
    const komootUrl = `komoot://tour?lat=${lat}&lon=${lon}`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

    try {
      const isSupported = await Linking.canOpenURL(komootUrl);
      if (isSupported) {
        await Linking.openURL(komootUrl);
      } else {
        await Linking.openURL(googleMapsUrl);
      }
    } catch (err) {
      console.error('Deep linking error:', err);
      Linking.openURL(googleMapsUrl);
    }
  };

  // Toggle checklist item state
  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  // Calculate total spent across logged expenses
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);

  const getEventBadgeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'flight':
        return { bg: colors.primaryLight, text: colors.primary };
      case 'hotel':
        return { bg: '#ebfbee', text: '#2b8a3e' };
      case 'poi':
      case 'sightseeing':
        return { bg: colors.secondaryLight, text: colors.secondary };
      default:
        return { bg: '#f1f3f5', text: '#495057' };
    }
  };

  const renderEventItem = ({ item }: { item: Event }) => {
    const badge = getEventBadgeStyle(item.type);
    const hasCoordinates = typeof item.latitude === 'number' && typeof item.longitude === 'number';

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {item.type.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.eventTime}>
          ⏰  {item.startTime} {item.endTime ? `to ${item.endTime}` : ''}
        </Text>

        {/* Action buttons under event */}
        <View style={styles.eventActionsRow}>
          {item.bookingReference ? (
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => {
                setSelectedBookingRef(item.bookingReference!);
                setIsQrModalVisible(true);
              }}
            >
              <Text style={styles.actionBtnText}>🎫  Ticket QR</Text>
            </TouchableOpacity>
          ) : null}

          {hasCoordinates ? (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnSecondary]} 
              onPress={() => handleNavigateKomoot(item.latitude!, item.longitude!)}
            >
              <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>🚴  Komoot Map</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footerSection}>
      {/* Daily Checklist Section */}
      <View style={styles.checklistCard}>
        <Text style={styles.checklistTitle}>📋  Daily Packing & Checklist</Text>
        {checklist.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.checklistItemRow}
            onPress={() => toggleChecklistItem(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, item.completed && styles.checkboxCompleted]}>
              {item.completed && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={[styles.checklistText, item.completed && styles.checklistTextCompleted]}>
              {item.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Attached Documents Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Attached Documents</Text>
        <TouchableOpacity 
          style={styles.attachButton} 
          onPress={handlePickAndUpload}
          disabled={documentUploading}
        >
          {documentUploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.attachButtonText}>+ Add Doc</Text>
          )}
        </TouchableOpacity>
      </View>

      {documents.length === 0 ? (
        <View style={styles.emptyDocContainer}>
          <Text style={styles.emptyDocText}>No documents attached yet.</Text>
        </View>
      ) : (
        documents.map((doc) => {
          const isDownloading = !!downloadingDocs[doc.id];
          const isCached = !!cachedDocUris[doc.id];

          return (
            <View key={doc.id} style={styles.docRow}>
              <View style={styles.docRowInfo}>
                <Text style={styles.docEmoji}>📄</Text>
                <Text style={styles.docName} numberOfLines={1}>
                  {doc.name}
                </Text>
                {isCached && <Text style={styles.offlineBadge}>💾 Offline</Text>}
              </View>

              <View style={styles.docRowActions}>
                {!isCached && (
                  <TouchableOpacity
                    style={[styles.docActionBtn, styles.downloadBtn]}
                    onPress={() => handleMakeAvailableOffline(doc.id, doc.downloadUrl, doc.name)}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.downloadBtnText}>↓ Keep Offline</Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.docActionBtn, styles.openBtn]}
                  onPress={() => handleOpenDocument(doc.id, doc.downloadUrl)}
                >
                  <Text style={styles.openBtnText}>Open</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <TouchableOpacity 
          style={styles.mapHeaderButton} 
          onPress={() => navigation.navigate('TripMap', { tripId })}
        >
          <Text style={styles.mapHeaderText}>🗺️  Map</Text>
        </TouchableOpacity>
      </View>

      {/* Offline Mode Warning Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚠️  Offline Mode: Showing cached data. Changes will sync when online.
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Total Spent Summary Card - Redesigned as Prominent Hero Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Spent</Text>
          <Text style={styles.summaryAmount}>${totalSpent.toFixed(2)} USD</Text>
          <Text style={styles.summarySubtitle}>Logged from {expenses.length} expenses</Text>
        </View>

        <Text style={styles.sectionTitle}>Daily Itinerary & Events</Text>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={renderEventItem}
            contentContainerStyle={styles.listContainer}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No events added to this trip yet.</Text>
                <Text style={styles.emptySubText}>Start building your itinerary below!</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Floating Action Button Container */}
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.button, styles.eventButton]}
          onPress={() => navigation.navigate('AddEvent', { tripId })}
        >
          <Text style={styles.buttonText}>+ Add Event</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.expenseButton]}
          onPress={() => navigation.navigate('AddExpense', { tripId })}
        >
          <Text style={styles.buttonText}>+ Add Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Ticket QR Code Modal */}
      <Modal
        visible={isQrModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Booking Reference QR</Text>
            <Text style={styles.modalSubtitle}>Scan at boarding terminal or reception desk</Text>
            {selectedBookingRef ? (
              <View style={styles.qrWrapper}>
                <QRCode value={selectedBookingRef} size={180} />
              </View>
            ) : null}
            <Text style={styles.bookingRefText}>REF: {selectedBookingRef}</Text>
            <TouchableOpacity 
              style={styles.closeModalButton} 
              onPress={() => setIsQrModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
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
    height: 44, // Touch target safety
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  backText: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  mapHeaderButton: {
    height: 44, // Touch target safety
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  mapHeaderText: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  offlineBanner: {
    backgroundColor: '#fff9db',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffe066',
  },
  offlineBannerText: {
    color: '#856404',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 0,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryLight,
    opacity: 0.85,
    marginBottom: 4,
  },
  summaryAmount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginBottom: 4,
  },
  summarySubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.primaryLight,
    opacity: 0.75,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 110,
  },
  eventCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  eventTime: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginBottom: 12,
  },
  eventActionsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  actionBtn: {
    height: 38,
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  actionBtnSecondary: {
    backgroundColor: colors.secondaryLight,
    borderColor: '#ffecda',
  },
  actionBtnTextSecondary: {
    color: colors.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  emptySubText: {
    fontFamily: typography.fontFamily,
    color: colors.textLight,
    fontSize: typography.sizes.sm,
  },
  buttonRow: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    height: 48, // Touch target accessibility
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  eventButton: {
    backgroundColor: colors.primary,
  },
  expenseButton: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  footerSection: {
    marginTop: 24,
    paddingBottom: 40,
  },
  checklistCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  checklistTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkboxTick: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: typography.weights.bold,
  },
  checklistText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  checklistTextCompleted: {
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attachButton: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachButtonText: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  emptyDocContainer: {
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyDocText: {
    fontFamily: typography.fontFamily,
    color: colors.textLight,
    fontSize: typography.sizes.sm,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  docEmoji: {
    marginRight: 8,
    fontSize: 16,
  },
  docName: {
    fontFamily: typography.fontFamily,
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    flex: 1,
    marginRight: 6,
  },
  offlineBadge: {
    fontSize: 9,
    color: colors.success,
    backgroundColor: '#ebfbee',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontWeight: typography.weights.bold,
  },
  docRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docActionBtn: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: 6,
  },
  downloadBtn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  downloadBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  openBtn: {
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  openBtnText: {
    color: '#495057',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  bookingRefText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 20,
  },
  closeModalButton: {
    backgroundColor: colors.primary,
    height: 44, // Touch target safety
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});
