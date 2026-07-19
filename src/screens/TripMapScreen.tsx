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
import MapView, { Marker } from 'react-native-maps';
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

  // Fetch events when the screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const fetchEvents = async () => {
        try {
          setLoading(true);
          const data = await getEventsForTrip(tripId);
          if (active) {
            setEvents(data);
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
        <Text style={styles.headerTitle}>Itinerary Map</Text>
        <View style={{ width: 60 }} /> {/* Spacer */}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#228be6" />
        </View>
      ) : (
        <View style={styles.mapContainer}>
          {geoEvents.length === 0 ? (
            <View style={styles.noGeoContainer}>
              <Text style={styles.noGeoText}>No geotagged events found for this trip.</Text>
              <Text style={styles.noGeoSubText}>
                Create events containing latitude and longitude properties to see them on the map.
              </Text>
            </View>
          ) : (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: geoEvents[0].latitude!,
                longitude: geoEvents[0].longitude!,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
            >
              {geoEvents.map((item) => (
                <Marker
                  key={item.id}
                  coordinate={{
                    latitude: item.latitude!,
                    longitude: item.longitude!,
                  }}
                  title={item.title}
                  description={`${item.type.toUpperCase()} • ${item.startTime}`}
                />
              ))}
            </MapView>
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
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
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
