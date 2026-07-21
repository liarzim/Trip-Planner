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
  Modal,
  Platform,
  TextInput,
  ScrollView
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getDocumentAsync } from 'expo-document-picker';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getEventsForTrip, getExpensesForTrip, getDocumentsForTrip, saveDocument, getTrip, createEvent } from '../services/dbService';
import { uploadTripDocument } from '../services/storageService';
import { getCachedOrDownloadFile, isFileCached } from '../services/fileCacheService';
import { Event, Expense, Document } from '../types';
import { useNetworkState } from '../hooks/useNetworkState';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import MapPicker from '../components/MapPicker';
import { functions } from '../config/firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { useTranslation } from '../services/translationService';
import LanguageSelector from '../components/LanguageSelector';
import DashboardMap from '../components/DashboardMap';
import PackingList from '../components/PackingList';

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
  const [showMapOnMobile, setShowMapOnMobile] = useState(false);

  const { t, isRTL } = useTranslation();

  // Track network connectivity state
  const isOnline = useNetworkState();

  const [events, setEvents] = useState<Event[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentUploading, setDocumentUploading] = useState(false);

  // Word document parsing states
  const [parsing, setParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<any>(null);

  // File cache mapping states
  const [cachedDocUris, setCachedDocUris] = useState<{[docId: string]: string}>({});
  const [downloadingDocs, setDownloadingDocs] = useState<{[docId: string]: boolean}>({});

  // QR Code Modal State
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [selectedBookingRef, setSelectedBookingRef] = useState('');

  // Trip start date state
  const [tripStartDate, setTripStartDate] = useState('');

  // Add Event Modal Form State
  const [isAddEventModalVisible, setIsAddEventModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('flight');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLatitude, setEventLatitude] = useState('');
  const [eventLongitude, setEventLongitude] = useState('');
  const [eventBookingReference, setEventBookingReference] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventSaving, setEventSaving] = useState(false);
  const [eventFormError, setEventFormError] = useState('');

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
          const [fetchedEvents, fetchedExpenses, fetchedDocs, fetchedTrip] = await Promise.all([
            getEventsForTrip(tripId),
            getExpensesForTrip(tripId),
            getDocumentsForTrip(tripId),
            getTrip(tripId)
          ]);
          
          if (active) {
            setEvents(fetchedEvents);
            setExpenses(fetchedExpenses);
            setDocuments(fetchedDocs);
            if (fetchedTrip) {
              setTripStartDate(fetchedTrip.startDate);
            }
            
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

  // Helper to parse time string into minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const clean = timeStr.trim().toLowerCase();
    
    // Match 12-hour: e.g. 10:00 pm, 08:30 am
    const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const ampm = match12[3];
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    
    // Match 24-hour: e.g. 22:00, 14:30
    const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = parseInt(match24[2], 10);
      return hours * 60 + minutes;
    }
    
    return null;
  };

  // Helper to add 1 day to YYYY-MM-DD string
  const addDayToDateStr = (dateStr: string): string => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleOpenAddEventModal = () => {
    setEventTitle('');
    setEventType('flight');
    setEventDate(tripStartDate || new Date().toISOString().split('T')[0]);
    setEventStartTime('');
    setEventEndTime('');
    setEventLatitude('');
    setEventLongitude('');
    setEventBookingReference('');
    setEventDescription('');
    setEventFormError('');
    setIsAddEventModalVisible(true);
  };

  const handleSaveEvent = async () => {
    if (!eventTitle.trim() || !eventType || !eventStartTime.trim() || !eventDate.trim()) {
      setEventFormError(t('event.required_error') || 'Required fields missing');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim())) {
      setEventFormError('Date must be in YYYY-MM-DD format (e.g. 2026-07-21)');
      return;
    }

    const latVal = eventLatitude ? parseFloat(eventLatitude) : undefined;
    const lonVal = eventLongitude ? parseFloat(eventLongitude) : undefined;

    if (eventLatitude && isNaN(latVal!)) {
      setEventFormError(t('event.lat_error'));
      return;
    }
    if (eventLongitude && isNaN(lonVal!)) {
      setEventFormError(t('event.lon_error'));
      return;
    }

    setEventFormError('');
    setEventSaving(true);

    try {
      let endEventDate = eventDate;
      const startMin = parseTimeToMinutes(eventStartTime);
      const endMin = parseTimeToMinutes(eventEndTime);
      if (startMin !== null && endMin !== null && endMin < startMin) {
        endEventDate = addDayToDateStr(eventDate);
      }

      const combinedStart = `${eventDate} ${eventStartTime}`;
      const combinedEnd = eventEndTime ? `${endEventDate} ${eventEndTime}` : '';

      await createEvent(
        tripId,
        eventTitle.trim(),
        eventType.toLowerCase(),
        combinedStart,
        combinedEnd,
        latVal,
        lonVal,
        eventBookingReference?.trim() || undefined,
        eventDescription?.trim() || undefined
      );

      // Refresh list
      const updatedEvents = await getEventsForTrip(tripId);
      setEvents(updatedEvents);

      setIsAddEventModalVisible(false);
    } catch (err: any) {
      setEventFormError(err.message || 'Failed to save event.');
    } finally {
      setEventSaving(false);
    }
  };

  const handleEventLocationSelected = (lat: number, lon: number) => {
    setEventLatitude(lat.toString());
    setEventLongitude(lon.toString());
  };

  // Web drag-and-drop events and file processors
  const handleDragOver = (e: any) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: any) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.docx')) {
        await processWebFile(file);
      } else {
        alert('Please drop a valid .docx (Word) file.');
      }
    }
  };

  const handleWebFileChange = async (e: any) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      await processWebFile(file);
    }
  };

  const processWebFile = async (file: File) => {
    setParsing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultUrl = reader.result as string;
          const base64Data = resultUrl.split(',')[1];

          const parseTripDocumentFn = httpsCallable(functions, 'parseTripDocument', { timeout: 180000 });
          const response = await parseTripDocumentFn({ base64Data });

          const data = response.data as { success: boolean; events: any[] };
          if (data && data.success && Array.isArray(data.events)) {
            navigation.navigate('PreviewConfirm', {
              tripId,
              parsedEvents: data.events
            });
          } else {
            alert('Could not parse any travel events from the document.');
          }
        } catch (innerError: any) {
          console.error('Failed to parse during file read:', innerError);
          const errorMsg = innerError.message || String(innerError);
          let friendlyMsg = t('error.generic_parsing');
          if (errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('busy') || errorMsg.includes('503')) {
            friendlyMsg = t('error.gemini_busy');
          } else if (errorMsg.includes('prepayment') || errorMsg.includes('depleted') || errorMsg.includes('exhausted') || errorMsg.includes('429')) {
            friendlyMsg = t('error.quota_exceeded');
          } else {
            friendlyMsg = `${t('error.generic_parsing')} (${errorMsg})`;
          }
          alert(friendlyMsg);
        } finally {
          setParsing(false);
        }
      };
      reader.onerror = () => {
        alert('Failed to read the local file.');
        setParsing(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('File reading preparation failed:', error);
      alert(`File load error: ${error.message || error}`);
      setParsing(false);
    }
  };

  // Mobile document picker and base64 parsing helper
  const handlePickAndParseDocx = async () => {
    try {
      const result = await getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setParsing(true);

      // Read file content as base64 using expo-file-system legacy namespace
      const base64Data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const parseTripDocumentFn = httpsCallable(functions, 'parseTripDocument', { timeout: 180000 });
      const response = await parseTripDocumentFn({ base64Data });

      const data = response.data as { success: boolean; events: any[] };
      if (data && data.success && Array.isArray(data.events)) {
        navigation.navigate('PreviewConfirm', {
          tripId,
          parsedEvents: data.events
        });
      } else {
        alert('Could not parse any travel events from the document.');
      }
    } catch (error: any) {
      console.error('Failed to parse itinerary document:', error);
      const errorMsg = error.message || String(error);
      let friendlyMsg = t('error.generic_parsing');
      if (errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('busy') || errorMsg.includes('503')) {
        friendlyMsg = t('error.gemini_busy');
      } else if (errorMsg.includes('prepayment') || errorMsg.includes('depleted') || errorMsg.includes('exhausted') || errorMsg.includes('429')) {
        friendlyMsg = t('error.quota_exceeded');
      } else {
        friendlyMsg = `${t('error.generic_parsing')} (${errorMsg})`;
      }
      alert(friendlyMsg);
    } finally {
      setParsing(false);
    }
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

    const rowDirectionStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };
    const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };
    const alignSelfStyle = { alignSelf: (isRTL ? 'flex-end' : 'flex-start') as 'flex-start' | 'flex-end' };

    return (
      <View style={[styles.eventCard, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.eventHeader, rowDirectionStyle]}>
          <Text style={[styles.eventTitle, textAlignStyle]}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg, alignSelf: 'center' }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {t(`event.${item.type.toLowerCase()}`).toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.eventTime, textAlignStyle]}>
          ⏰  {item.startTime} {item.endTime ? (isRTL ? `עד ${item.endTime}` : `to ${item.endTime}`) : ''}
        </Text>

        {/* Notes/Description Rendering */}
        {item.description ? (
          <Text style={[
            styles.eventDescription, 
            isRTL ? styles.eventDescriptionRTL : null,
            textAlignStyle
          ]}>
            {item.description}
          </Text>
        ) : null}

        {/* Action buttons under event */}
        <View style={[styles.eventActionsRow, rowDirectionStyle]}>
          {item.bookingReference ? (
            <TouchableOpacity 
              style={[styles.actionBtn, { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]} 
              onPress={() => {
                setSelectedBookingRef(item.bookingReference!);
                setIsQrModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnText}>🎫  {t('dashboard.ticket_qr')}</Text>
            </TouchableOpacity>
          ) : null}

          {hasCoordinates ? (
            <TouchableOpacity 
              style={[
                styles.actionBtn, 
                styles.actionBtnSecondary,
                { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }
              ]} 
              onPress={() => handleNavigateKomoot(item.latitude!, item.longitude!)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>🚴  {t('dashboard.komoot_map')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    const rowDirectionStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };
    const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };

    return (
      <View style={styles.footerSection}>
        {/* Dynamic Packing List Section */}
        <PackingList tripId={tripId} />

        {/* Import Itinerary DOCX Card */}
        <View style={styles.importCard}>
          <Text style={[styles.importTitle, textAlignStyle]}>{t('dashboard.import_title')}</Text>
          <Text style={[styles.importSubtitle, textAlignStyle]}>
            {t('dashboard.import_subtitle')}
          </Text>

          {Platform.OS === 'web' ? (
            <TouchableOpacity
              style={[
                styles.dragZone,
                isDragging && styles.dragZoneActive,
              ]}
              onPress={() => fileInputRef.current?.click()}
              {...({
                onDragOver: handleDragOver,
                onDragLeave: handleDragLeave,
                onDrop: handleDrop,
              } as any)}
              activeOpacity={0.8}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".docx"
                style={{ display: 'none' }}
                onChange={handleWebFileChange}
              />
              <Text style={styles.dragZoneEmoji}>📥</Text>
              <Text style={styles.dragZoneText}>
                {isDragging ? t('dashboard.drag_active') : t('dashboard.drag_idle')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.mobilePickerBtn}
              onPress={handlePickAndParseDocx}
              activeOpacity={0.8}
            >
              <Text style={styles.mobilePickerBtnText}>📁  {t('dashboard.choose_doc')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Attached Documents Section */}
        <View style={[styles.sectionHeaderRow, rowDirectionStyle]}>
          <Text style={[styles.sectionTitle, textAlignStyle]}>{t('dashboard.attached_docs')}</Text>
          <TouchableOpacity 
            style={styles.attachButton} 
            onPress={handlePickAndUpload}
            disabled={documentUploading}
            activeOpacity={0.7}
          >
            {documentUploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.attachButtonText}>{t('dashboard.add_doc')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {documents.length === 0 ? (
          <View style={styles.emptyDocContainer}>
            <Text style={styles.emptyDocText}>{t('dashboard.no_docs')}</Text>
          </View>
        ) : (
          documents.map((doc) => {
            const isDownloading = !!downloadingDocs[doc.id];
            const isCached = !!cachedDocUris[doc.id];

            return (
              <View key={doc.id} style={[styles.docRow, rowDirectionStyle]}>
                <View style={[styles.docRowInfo, rowDirectionStyle]}>
                  <Text style={[styles.docEmoji, { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>📄</Text>
                  <Text style={[styles.docName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  {isCached && (
                    <Text style={[
                      styles.offlineBadge,
                      { marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }
                    ]}>
                      {t('dashboard.offline_badge')}
                    </Text>
                  )}
                </View>

                <View style={[styles.docRowActions, rowDirectionStyle]}>
                  {!isCached && (
                    <TouchableOpacity
                      style={[styles.docActionBtn, styles.downloadBtn, { marginRight: isRTL ? 6 : 0, marginLeft: isRTL ? 0 : 6 }]}
                      onPress={() => handleMakeAvailableOffline(doc.id, doc.downloadUrl, doc.name)}
                      disabled={isDownloading}
                      activeOpacity={0.7}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.downloadBtnText}>{t('dashboard.keep_offline')}</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.docActionBtn, styles.openBtn]}
                    onPress={() => handleOpenDocument(doc.id, doc.downloadUrl)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.openBtnText}>{t('dashboard.open_btn')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  };

  const rowDirectionStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };
  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };

  const isWeb = Platform.OS === 'web';

  const dashboardContent = (
    <View style={styles.dashboardContainer}>
      {/* Total Spent Summary Card - Redesigned as Prominent Hero Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{t('dashboard.total_spent')}</Text>
        <Text style={styles.summaryAmount}>${totalSpent.toFixed(2)} USD</Text>
        <Text style={styles.summarySubtitle}>
          {t('dashboard.logged_from', { count: expenses.length.toString() })}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, textAlignStyle]}>{t('dashboard.itinerary')}</Text>

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
              <Text style={styles.emptyText}>{t('dashboard.no_events')}</Text>
              <Text style={styles.emptySubText}>{t('dashboard.start_building')}</Text>
            </View>
          }
        />
      )}
    </View>
  );

  if (!isWeb && showMapOnMobile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, rowDirectionStyle]}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowMapOnMobile(false)}>
            <Text style={styles.backText}>{isRTL ? '← רשימה' : '← List'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
          <View style={[rowDirectionStyle, { alignItems: 'center' }]}>
            <LanguageSelector />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <DashboardMap events={events} />
        </View>
        <TouchableOpacity 
          style={styles.mobileMapFab}
          onPress={() => setShowMapOnMobile(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>📋 {isRTL ? 'רשימה' : 'List'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, rowDirectionStyle]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backText}>{isRTL ? '→ הטיולים שלי' : '← Dashboard'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
        
        <View style={[rowDirectionStyle, { alignItems: 'center' }]}>
          <LanguageSelector />
        </View>
      </View>

      {/* Offline Mode Warning Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚠️  {t('dashboard.offline_mode')}
          </Text>
        </View>
      )}

      {isWeb ? (
        <View style={[styles.webSplitLayout, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.webDashboardColumn}>
            {dashboardContent}
            <View style={[styles.webButtonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity 
                style={[styles.webActionBtn, styles.eventButton]}
                onPress={handleOpenAddEventModal}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>{t('dashboard.add_event')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.webActionBtn, styles.expenseButton]}
                onPress={() => navigation.navigate('AddExpense', { tripId })}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>{t('dashboard.add_expense')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.webMapColumn}>
            <DashboardMap events={events} />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.content, { direction: isRTL ? 'rtl' : 'ltr', flex: 1 }]}>
            {dashboardContent}
          </View>
          
          <View style={[styles.buttonRow, rowDirectionStyle]}>
            <TouchableOpacity 
              style={[styles.button, styles.eventButton]}
              onPress={handleOpenAddEventModal}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{t('dashboard.add_event')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.expenseButton]}
              onPress={() => navigation.navigate('AddExpense', { tripId })}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{t('dashboard.add_expense')}</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.mobileMapFab}
            onPress={() => setShowMapOnMobile(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.fabText}>🗺️ {isRTL ? 'מפה' : 'Map'}</Text>
          </TouchableOpacity>
        </View>
      )}

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
              activeOpacity={0.7}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Event Modal Popup */}
      <Modal
        visible={isAddEventModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddEventModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.eventModalContainer}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, textAlignStyle]}>
                {isRTL ? 'הוספת אירוע חדש' : 'Add New Event'}
              </Text>
              <Text style={[styles.modalSubtitle, textAlignStyle, { marginBottom: 10 }]}>
                {isRTL ? 'ציין את פרטי האירוע ותאריכו' : 'Specify the event details and date'}
              </Text>

              {eventFormError ? (
                <Text style={styles.modalFormErrorText}>{eventFormError}</Text>
              ) : null}

              {/* Title */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.modalFormLabel, textAlignStyle]}>
                  {isRTL ? 'כותרת האירוע *' : 'Event Title *'}
                </Text>
                <TextInput
                  style={[styles.modalFormInput, textAlignStyle]}
                  placeholder={isRTL ? 'למשל: טיסת אל על ללונדון' : 'e.g. Flight to London'}
                  value={eventTitle}
                  onChangeText={setEventTitle}
                  autoCapitalize="sentences"
                />
              </View>

              {/* Type selector */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.modalFormLabel, textAlignStyle]}>
                  {isRTL ? 'סוג אירוע *' : 'Event Type *'}
                </Text>
                <View style={[styles.modalFormTypeSelector, rowDirectionStyle]}>
                  {[
                    { label: `✈️ ${isRTL ? 'טיסה' : 'Flight'}`, value: 'flight' },
                    { label: `🏨 ${isRTL ? 'מלון' : 'Hotel'}`, value: 'hotel' },
                    { label: `📍 ${isRTL ? 'אטרקציה' : 'POI'}`, value: 'poi' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.modalFormTypeOption,
                        eventType === item.value && styles.modalFormTypeOptionSelected,
                      ]}
                      onPress={() => setEventType(item.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalFormTypeOptionText,
                          eventType === item.value && styles.modalFormTypeOptionTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.modalFormLabel, textAlignStyle]}>
                  {isRTL ? 'תאריך אירוע (YYYY-MM-DD) *' : 'Event Date (YYYY-MM-DD) *'}
                </Text>
                <TextInput
                  style={[styles.modalFormInput, textAlignStyle]}
                  placeholder="YYYY-MM-DD"
                  value={eventDate}
                  onChangeText={setEventDate}
                />
              </View>

              {/* Start & End Times */}
              <View style={[styles.modalFormRow, rowDirectionStyle]}>
                <View style={[styles.modalFormCol]}>
                  <Text style={[styles.modalFormLabel, textAlignStyle]}>
                    {isRTL ? 'שעת התחלה *' : 'Start Time *'}
                  </Text>
                  <TextInput
                    style={[styles.modalFormInput, textAlignStyle]}
                    placeholder="e.g. 10:30 AM / 22:30"
                    value={eventStartTime}
                    onChangeText={setEventStartTime}
                  />
                </View>
                <View style={[styles.modalFormCol]}>
                  <Text style={[styles.modalFormLabel, textAlignStyle]}>
                    {isRTL ? 'שעת סיום' : 'End Time'}
                  </Text>
                  <TextInput
                    style={[styles.modalFormInput, textAlignStyle]}
                    placeholder="e.g. 02:00 AM / 14:00"
                    value={eventEndTime}
                    onChangeText={setEventEndTime}
                  />
                </View>
              </View>

              {/* Booking Reference */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.modalFormLabel, textAlignStyle]}>
                  {isRTL ? 'סימוכין הזמנה' : 'Booking Reference'}
                </Text>
                <TextInput
                  style={[styles.modalFormInput, textAlignStyle]}
                  placeholder="e.g. AX79B"
                  value={eventBookingReference}
                  onChangeText={setEventBookingReference}
                  autoCapitalize="characters"
                />
              </View>

              {/* Latitude & Longitude */}
              <View style={[styles.modalFormRow, rowDirectionStyle]}>
                <View style={[styles.modalFormCol]}>
                  <Text style={[styles.modalFormLabel, textAlignStyle]}>
                    {isRTL ? 'קו רוחב' : 'Latitude'}
                  </Text>
                  <TextInput
                    style={[styles.modalFormInput, textAlignStyle]}
                    placeholder="e.g. 48.8566"
                    value={eventLatitude}
                    onChangeText={setEventLatitude}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.modalFormCol]}>
                  <Text style={[styles.modalFormLabel, textAlignStyle]}>
                    {isRTL ? 'קו אורך' : 'Longitude'}
                  </Text>
                  <TextInput
                    style={[styles.modalFormInput, textAlignStyle]}
                    placeholder="e.g. 2.3522"
                    value={eventLongitude}
                    onChangeText={setEventLongitude}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Interactive Map Picker */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.modalFormLabel, textAlignStyle]}>
                  {isRTL ? 'סמן מיקום על המפה' : 'Pin location on map'}
                </Text>
                <MapPicker
                  latitude={eventLatitude ? parseFloat(eventLatitude) : undefined}
                  longitude={eventLongitude ? parseFloat(eventLongitude) : undefined}
                  onSelectLocation={handleEventLocationSelected}
                  lang={isRTL ? 'he' : 'en'}
                  isRTL={isRTL}
                  t={t}
                />
              </View>

              {/* Additional Notes / Description */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.modalFormLabel, textAlignStyle]}>
                  {isRTL ? 'הערות נוספות' : 'Additional Notes'}
                </Text>
                <TextInput
                  style={[styles.modalFormInput, styles.modalFormMultilineInput, textAlignStyle]}
                  placeholder={isRTL ? 'פרטים נוספים כגון טרמינל, הנחיות...' : 'Additional details, terminal, directions...'}
                  value={eventDescription}
                  onChangeText={setEventDescription}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>

              {/* Buttons */}
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEvent}
                disabled={eventSaving}
                activeOpacity={0.8}
              >
                {eventSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>
                    {isRTL ? 'שמור אירוע' : 'Save Event'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsAddEventModalVisible(false)}
                disabled={eventSaving}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>
                  {isRTL ? 'ביטול' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cloud Parsing Overlay */}
      {parsing && (
        <View style={styles.parsingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.parsingText}>{t('dashboard.analyzing')}</Text>
          <Text style={styles.parsingSubtitle}>{t('dashboard.gemini_extracting')}</Text>
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
    height: 44,
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
    width: '100%',
  },
  eventHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  eventTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
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
    marginBottom: 6,
  },
  eventDescription: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: '#495057',
    fontStyle: 'italic',
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#228be6',
    width: '100%',
    boxSizing: 'border-box' as any,
  },
  eventDescriptionRTL: {
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderRightColor: '#228be6',
  },
  eventActionsRow: {
    marginTop: 4,
    width: '100%',
  },
  actionBtn: {
    height: 38,
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
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
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    height: 48,
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
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    width: '100%',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
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
    width: '100%',
  },
  emptyDocText: {
    fontFamily: typography.fontFamily,
    color: colors.textLight,
    fontSize: typography.sizes.sm,
  },
  docRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  docRowInfo: {
    alignItems: 'center',
    flex: 1,
  },
  docEmoji: {
    fontSize: 16,
  },
  docName: {
    fontFamily: typography.fontFamily,
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    flex: 1,
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
    alignItems: 'center',
  },
  docActionBtn: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 6,
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
    height: 44,
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
  importCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    width: '100%',
  },
  importTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 6,
  },
  importSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginBottom: 16,
    lineHeight: 18,
  },
  dragZone: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4fbf7',
    width: '100%',
  },
  dragZoneActive: {
    backgroundColor: '#e8f7ee',
    borderColor: '#2b8a3e',
  },
  dragZoneEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  dragZoneText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    textAlign: 'center',
  },
  mobilePickerBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  mobilePickerBtnText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  parsingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  parsingText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
  },
  parsingSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
  },
  webSplitLayout: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  webDashboardColumn: {
    width: '40%',
    minWidth: 420,
    maxWidth: 500,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: '100%',
    backgroundColor: colors.white,
  },
  webMapColumn: {
    flex: 1,
    height: '100%',
    padding: 16,
    backgroundColor: '#f1f3f5',
  },
  dashboardContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  webButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  webActionBtn: {
    flex: 1,
    marginHorizontal: 6,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMapFab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    backgroundColor: colors.primary,
    borderRadius: 28,
    width: 96,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 9999,
  },
  fabText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  eventModalContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalFormLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  modalFormInput: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    color: colors.text,
  },
  modalFormMultilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFormRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalFormCol: {
    flex: 1,
  },
  modalFormErrorText: {
    color: '#fa5252',
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    marginBottom: 10,
  },
  modalFormTypeSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalFormTypeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  modalFormTypeOptionSelected: {
    backgroundColor: colors.primary,
  },
  modalFormTypeOptionText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
  },
  modalFormTypeOptionTextSelected: {
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalSaveBtnText: {
    color: colors.white,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  modalCancelBtn: {
    backgroundColor: '#f1f3f5',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalCancelBtnText: {
    color: '#495057',
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});
