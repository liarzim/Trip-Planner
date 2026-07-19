import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator 
} from 'react-native';
import { signOut } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth } from '../config/firebaseConfig';
import { getTripsForUser } from '../services/dbService';
import { Trip } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;
  const welcomeName = user?.displayName || user?.email || 'Traveler';

  // Fetch trips from Firestore whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const fetchTrips = async () => {
        if (!user) return;
        try {
          setLoading(true);
          const data = await getTripsForUser(user.uid);
          if (active) {
            setTrips(data);
          }
        } catch (error) {
          console.error('Failed to fetch trips:', error);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      fetchTrips();

      return () => {
        active = false;
      };
    }, [user])
  );

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
        
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#228be6" />
          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id}
            renderItem={renderTripItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No trips scheduled yet.</Text>
                <Text style={styles.emptySubText}>Tap below to plan your first adventure!</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Floating Action Button for Trip Creation */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('CreateTrip')}
      >
        <Text style={styles.fabText}>+ Plan Trip</Text>
      </TouchableOpacity>
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 80, // Extra padding to make sure FAB doesn't cover list items
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
    color: '#495057',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubText: {
    color: '#868e96',
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#228be6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#228be6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
