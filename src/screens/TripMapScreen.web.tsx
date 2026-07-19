import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getEventsForTrip } from '../services/dbService';
import { Event } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type TripMapRouteProp = RouteProp<RootStackParamList, 'TripMap'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TripMap'>;

export default function TripMapScreen() {
  const route = useRoute<TripMapRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { tripId } = route.params;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Fetch events when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const fetchEvents = async () => {
        try {
          setLoading(true);
          const data = await getEventsForTrip(tripId);
          if (active) {
            setEvents(data);
            const geo = data.filter((e) => typeof e.latitude === 'number' && typeof e.longitude === 'number');
            if (geo.length > 0) {
              setSelectedEvent(geo[0]);
            }
          }
        } catch (error) {
          console.error('Failed to fetch map events:', error);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      fetchEvents();

      return () => {
        active = false;
      };
    }, [tripId])
  );

  // Filter events containing valid coordinates
  const geoEvents = events.filter(
    (e) => typeof e.latitude === 'number' && typeof e.longitude === 'number'
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Itinerary Map (Web)</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#228be6" />
        </View>
      ) : (
        <View style={styles.layout}>
          {geoEvents.length === 0 ? (
            <View style={styles.noGeoContainer}>
              <Text style={styles.noGeoText}>No geotagged events found for this trip.</Text>
              <Text style={styles.noGeoSubText}>
                Create events containing latitude and longitude properties to see them on the map.
              </Text>
            </View>
          ) : (
            <View style={styles.splitLayout}>
              {/* Left sidebar listing events */}
              <View style={styles.sidebar}>
                <Text style={styles.sidebarTitle}>Itinerary Pins</Text>
                {geoEvents.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.sidebarItem,
                      selectedEvent?.id === item.id && styles.sidebarItemActive,
                    ]}
                    onPress={() => setSelectedEvent(item)}
                  >
                    <Text
                      style={[
                        styles.itemTitle,
                        selectedEvent?.id === item.id && styles.itemTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.itemCoords}>
                      Lat: {item.latitude}, Lon: {item.longitude}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Right area embedding web maps */}
              <View style={styles.mapContainer}>
                {selectedEvent ? (
                  <iframe
                    src={`https://maps.google.com/maps?q=${selectedEvent.latitude},${selectedEvent.longitude}&z=15&output=embed`}
                    style={{ border: 0, width: '100%', height: '100%', borderRadius: 12 }}
                    allowFullScreen
                    loading="lazy"
                  />
                ) : (
                  <View style={styles.promptContainer}>
                    <Text style={styles.promptText}>Select an itinerary point to display</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layout: {
    flex: 1,
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    padding: 16,
  },
  sidebarTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 12,
  },
  sidebarItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 8,
  },
  sidebarItemActive: {
    backgroundColor: '#e7f5ff',
    borderColor: '#a5d8ff',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 4,
  },
  itemTitleActive: {
    color: '#228be6',
  },
  itemCoords: {
    fontSize: 11,
    color: '#868e96',
  },
  mapContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f1f3f5',
  },
  promptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    color: '#868e96',
    fontSize: 14,
  },
  noGeoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#ffffff',
  },
  noGeoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
    textAlign: 'center',
  },
  noGeoSubText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
  },
});
