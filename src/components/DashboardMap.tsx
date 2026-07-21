import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { Event } from '../types';
import appJson from '../../app.json';

interface DashboardMapProps {
  events: Event[];
  onClose?: () => void;
}

export default function DashboardMap({ events }: DashboardMapProps) {
  const mapRef = useRef<MapView>(null);
  const apiKey = appJson.expo.android.config.googleMaps.apiKey;

  // Filter events with coordinates
  const geoEvents = events.filter(
    (e) => typeof e.latitude === 'number' && typeof e.longitude === 'number'
  );

  useEffect(() => {
    if (geoEvents.length > 0 && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          geoEvents.map((e) => ({
            latitude: e.latitude!,
            longitude: e.longitude!,
          })),
          {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          }
        );
      }, 500);
    }
  }, [events]);

  if (geoEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No geotagged events found</Text>
      </View>
    );
  }

  const originLat = geoEvents[0].latitude!;
  const originLng = geoEvents[0].longitude!;
  const destLat = geoEvents[geoEvents.length - 1].latitude!;
  const destLng = geoEvents[geoEvents.length - 1].longitude!;

  const origin = { latitude: originLat, longitude: originLng };
  const destination = { latitude: destLat, longitude: destLng };

  const waypoints = geoEvents.slice(1, -1).map((e) => ({
    latitude: e.latitude!,
    longitude: e.longitude!,
  }));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: originLat,
          longitude: originLng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {geoEvents.map((item, index) => {
          let emoji = '📍';
          const type = item.type.toLowerCase();
          if (type.includes('flight') || type.includes('airport')) emoji = '✈️';
          else if (type.includes('hotel') || type.includes('accommodation') || type.includes('stay')) emoji = '🛏️';
          else if (type.includes('trail') || type.includes('hike') || type.includes('hiking') || type.includes('sightseeing')) emoji = '🥾';
          else if (type.includes('poi') || type.includes('museum') || type.includes('sight')) emoji = '🏛️';

          return (
            <Marker
              key={item.id}
              coordinate={{
                latitude: item.latitude!,
                longitude: item.longitude!,
              }}
              title={`${index + 1}. ${item.title}`}
              description={`${item.type.toUpperCase()} • ${item.startTime}`}
            >
              <View style={styles.markerContainer}>
                <Text style={styles.markerText}>{emoji}</Text>
              </View>
            </Marker>
          );
        })}

        {geoEvents.length > 1 && (
          <MapViewDirections
            origin={{ latitude: originLat, longitude: originLng }}
            destination={{ latitude: destLat, longitude: destLng }}
            waypoints={waypoints}
            apikey={apiKey}
            strokeWidth={4}
            strokeColor="#228be6"
            optimizeWaypoints={true}
            onError={(errorMessage) => {
              console.error('MapViewDirections error:', errorMessage);
            }}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  emptyText: {
    color: '#868e96',
    fontSize: 14,
  },
  markerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: '#ced4da',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  markerText: {
    fontSize: 16,
  },
});
