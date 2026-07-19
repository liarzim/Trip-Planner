import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Linking
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getDocumentAsync } from 'expo-document-picker';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getEventsForTrip, getExpensesForTrip, getDocumentsForTrip, saveDocument } from '../services/dbService';
import { uploadTripDocument } from '../services/storageService';
import { Event, Expense, Document } from '../types';

type TripDashboardRouteProp = RouteProp<RootStackParamList, 'TripDashboard'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TripDashboard'>;

export default function TripDashboardScreen() {
  const route = useRoute<TripDashboardRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { tripId } = route.params;

  const [events, setEvents] = useState<Event[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentUploading, setDocumentUploading] = useState(false);

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

  // Open document download URL in default browser
  const openDocument = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't open URL", err));
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
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setDocumentUploading(false);
    }
  };

  // Calculate total spent across logged expenses
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);

  const getEventBadgeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'flight':
        return { bg: '#e7f5ff', text: '#228be6' };
      case 'hotel':
        return { bg: '#ebfbee', text: '#40c057' };
      case 'poi':
      case 'sightseeing':
        return { bg: '#fff0f6', text: '#d6336c' };
      default:
        return { bg: '#f1f3f5', text: '#495057' };
    }
  };

  const renderEventItem = ({ item }: { item: Event }) => {
    const badge = getEventBadgeStyle(item.type);
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
          ⏰ {item.startTime} {item.endTime ? `to ${item.endTime}` : ''}
        </Text>
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footerSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Attached Documents</Text>
        <TouchableOpacity 
          style={styles.attachButton} 
          onPress={handlePickAndUpload}
          disabled={documentUploading}
        >
          {documentUploading ? (
            <ActivityIndicator size="small" color="#228be6" />
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
        documents.map((doc) => (
          <TouchableOpacity 
            key={doc.id} 
            style={styles.docRow}
            onPress={() => openDocument(doc.downloadUrl)}
          >
            <Text style={styles.docEmoji}>📄</Text>
            <Text style={styles.docName} numberOfLines={1}>
              {doc.name}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Dashboard</Text>
        <TouchableOpacity 
          style={styles.mapHeaderButton} 
          onPress={() => navigation.navigate('TripMap', { tripId })}
        >
          <Text style={styles.mapHeaderText}>🗺️ Map</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Total Spent Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Spent</Text>
          <Text style={styles.summaryAmount}>${totalSpent.toFixed(2)} USD</Text>
          <Text style={styles.summarySubtitle}>Logged from {expenses.length} expenses</Text>
        </View>

        <Text style={styles.sectionTitle}>Daily Itinerary & Events</Text>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#228be6" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backText: {
    color: '#228be6',
    fontWeight: '600',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  mapHeaderButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  mapHeaderText: {
    color: '#228be6',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 0,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#868e96',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2b2f3a',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 11,
    color: '#adb5bd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 15,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  eventTime: {
    fontSize: 13,
    color: '#495057',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#495057',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubText: {
    color: '#868e96',
    fontSize: 13,
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
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  eventButton: {
    backgroundColor: '#228be6',
  },
  expenseButton: {
    backgroundColor: '#40c057',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footerSection: {
    marginTop: 24,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attachButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e7f5ff',
    borderWidth: 1,
    borderColor: '#d0ebff',
  },
  attachButtonText: {
    color: '#228be6',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyDocContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
  },
  emptyDocText: {
    color: '#868e96',
    fontSize: 13,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  docEmoji: {
    marginRight: 8,
    fontSize: 16,
  },
  docName: {
    color: '#228be6',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
