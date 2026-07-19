import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { Trip } from '../types';

// Dummy trips matching the Firestore Trip schema
const dummyTrips: Trip[] = [
  {
    id: '1',
    groupId: 'g1',
    name: 'Summer Getaway in Paris',
    startDate: '2026-08-01',
    endDate: '2026-08-10',
    status: 'planned',
  },
  {
    id: '2',
    groupId: 'g1',
    name: 'Business Summit in Tokyo',
    startDate: '2026-09-15',
    endDate: '2026-09-22',
    status: 'planned',
  },
  {
    id: '3',
    groupId: 'g2',
    name: 'Skiing Trip in Swiss Alps',
    startDate: '2026-12-20',
    endDate: '2026-12-28',
    status: 'planned',
  },
];

export default function HomeScreen() {
  const user = auth.currentUser;
  const welcomeName = user?.displayName || user?.email || 'Traveler';

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderTripItem = ({ item }: { item: Trip }) => (
    <View style={styles.tripCard}>
      <Text style={styles.tripName}>{item.name}</Text>
      <View style={styles.tripDetails}>
        <Text style={styles.tripDate}>
          📅 {item.startDate} to {item.endDate}
        </Text>
        <Text style={[styles.tripStatus, { color: item.status === 'planned' ? '#ff9800' : '#4caf50' }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.userName}>{welcomeName}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Your Upcoming Trips</Text>
        <FlatList
          data={dummyTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No trips scheduled yet.</Text>
            </View>
          }
        />
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
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  welcomeText: {
    fontSize: 14,
    color: '#868e96',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff0f6',
    borderWidth: 1,
    borderColor: '#ffdeeb',
  },
  signOutText: {
    color: '#d6336c',
    fontWeight: '600',
    fontSize: 13,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 15,
  },
  listContainer: {
    paddingBottom: 20,
  },
  tripCard: {
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
  tripName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDate: {
    fontSize: 13,
    color: '#495057',
  },
  tripStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: '#868e96',
    fontSize: 14,
  },
});
