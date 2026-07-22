import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { Event } from '../types';
import appJson from '../../app.json';

interface Coordinate {
  latitude: number;
  longitude: number;
}

const toRadians = (deg: number) => (deg * Math.PI) / 180;
const toDegrees = (rad: number) => (rad * 180) / Math.PI;

function getGeodesicPoints(start: Coordinate, end: Coordinate, numPoints: number = 30): Coordinate[] {
  const points: Coordinate[] = [];
  const lat1 = toRadians(start.latitude);
  const lon1 = toRadians(start.longitude);
  const lat2 = toRadians(end.latitude);
  const lon2 = toRadians(end.longitude);

  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)
  ));

  if (d === 0) {
    return [start];
  }

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    points.push({
      latitude: toDegrees(lat),
      longitude: toDegrees(lon),
    });
  }

  return points;
}

/**
 * Decodes a Google overview polyline string into an array of LatLng coordinates.
 */
function decodePolyline(encoded: string): Coordinate[] {
  const points: Coordinate[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: (lat / 1E5),
      longitude: (lng / 1E5)
    });
  }
  return points;
}

function getBearing(start: Coordinate, end: Coordinate): number {
  const lat1 = toRadians(start.latitude);
  const lon1 = toRadians(start.longitude);
  const lat2 = toRadians(end.latitude);
  const lon2 = toRadians(end.longitude);

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = toDegrees(Math.atan2(y, x));
  
  return (brng + 360) % 360;
}

interface DashboardMapProps {
  events: Event[];
  focusedEventId?: string | null;
  onClose?: () => void;
}

export default function DashboardMap({ events, focusedEventId }: DashboardMapProps) {
  const mapRef = useRef<MapView>(null);
  const apiKey = appJson.expo.android.config.googleMaps.apiKey;
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Filter events with coordinates
  const geoEvents = events.filter(
    (e) => typeof e.latitude === 'number' && typeof e.longitude === 'number'
  );

  useEffect(() => {
    if (focusedEventId && mapRef.current) {
      const match = geoEvents.find((e) => e.id === focusedEventId);
      if (match) {
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            latitude: match.latitude!,
            longitude: match.longitude!,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }, 100);
      }
    }
  }, [focusedEventId]);

  useEffect(() => {
    if (geoEvents.length > 0 && mapRef.current) {
      setTimeout(() => {
        const allCoords: Coordinate[] = [];
        geoEvents.forEach((e) => {
          if (typeof e.latitude === 'number' && typeof e.longitude === 'number') {
            allCoords.push({ latitude: e.latitude, longitude: e.longitude });
          }
          if (e.type === 'flight' && typeof e.originLatitude === 'number' && typeof e.originLongitude === 'number') {
            allCoords.push({ latitude: e.originLatitude, longitude: e.originLongitude });
          }
        });

        if (allCoords.length > 0) {
          mapRef.current?.fitToCoordinates(allCoords, {
            edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
            animated: true,
          });
        }
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

  const driveEvents = geoEvents.filter((e) => e.type !== 'flight');
  const driveOriginLat = driveEvents.length > 0 ? driveEvents[0].latitude! : 0;
  const driveOriginLng = driveEvents.length > 0 ? driveEvents[0].longitude! : 0;
  const driveDestLat = driveEvents.length > 0 ? driveEvents[driveEvents.length - 1].latitude! : 0;
  const driveDestLng = driveEvents.length > 0 ? driveEvents[driveEvents.length - 1].longitude! : 0;
  const driveWaypoints = driveEvents.slice(1, -1).map((e) => ({
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
          const isHotel = type === 'hotel';
          
          if (type.includes('flight') || type.includes('airport')) {
            emoji = selectedEventId === item.id ? '🛬' : '✈️';
          } else if (isHotel || type.includes('accommodation') || type.includes('stay')) {
            emoji = '🏨';
          } else if (type.includes('trail') || type.includes('hike') || type.includes('hiking') || type.includes('sightseeing')) {
            emoji = '🥾';
          } else if (type.includes('poi') || type.includes('museum') || type.includes('sight')) {
            emoji = '🏛️';
          }

          return (
            <Marker
              key={item.id}
              coordinate={{
                latitude: item.latitude!,
                longitude: item.longitude!,
              }}
              title={`${index + 1}. ${item.title}`}
              description={`${item.type.toUpperCase()} • ${item.startTime}`}
              onPress={() => setSelectedEventId(item.id)}
            >
              <View style={[
                styles.markerContainer,
                isHotel && { backgroundColor: '#ebfbee', borderColor: '#2b8a3e', borderWidth: 2 },
                selectedEventId === item.id && { borderColor: '#e222b6', borderWidth: 3 }
              ]}>
                <Text style={styles.markerText}>{emoji}</Text>
              </View>
            </Marker>
          );
        })}

        {/* Geodesic Flight Paths */}
        {geoEvents.map((item) => {
          if (item.type === 'flight' && typeof item.originLatitude === 'number' && typeof item.originLongitude === 'number') {
            const isSelected = selectedEventId === item.id;
            const start = { latitude: item.originLatitude, longitude: item.originLongitude };
            const end = { latitude: item.latitude!, longitude: item.longitude! };
            const geodesicPoints = getGeodesicPoints(start, end, 30);
            
            const midpointIndex = Math.floor(geodesicPoints.length / 2);
            const midpoint = geodesicPoints[midpointIndex];
            const nextPoint = geodesicPoints[midpointIndex + 1] || end;
            const bearing = getBearing(midpoint, nextPoint);

            return (
              <React.Fragment key={`flight-path-${item.id}`}>
                {/* Geodesic flight path polyline */}
                <Polyline
                  coordinates={geodesicPoints}
                  strokeColor="#e222b6"
                  strokeWidth={4}
                  lineDashPattern={[6, 6]}
                />
                
                {/* Airplane icon midpoint marker */}
                <Marker
                  coordinate={midpoint}
                  anchor={{ x: 0.5, y: 0.5 }}
                  flat={true}
                  rotation={bearing}
                >
                  <View style={styles.airplaneMarker}>
                    <Text style={styles.airplaneMarkerText}>✈️</Text>
                  </View>
                </Marker>

                {/* Draw origin airport marker */}
                <Marker
                  coordinate={start}
                  title={item.originAirport ? `${item.originAirport} (Departure)` : 'Departure'}
                  description={item.airline ? `${item.airline} ${item.flightNumber || ''}` : 'Flight Origin'}
                >
                  <View style={styles.flightOriginMarker}>
                    <Text style={styles.markerText}>🛫</Text>
                  </View>
                </Marker>
              </React.Fragment>
            );
          }
          return null;
        })}

        {/* Saved Static Waypoint Route Polylines */}
        {geoEvents.map((item) => {
          if (item.routePolyline) {
            try {
              const decodedCoords = decodePolyline(item.routePolyline);
              return (
                <Polyline
                  key={`route-polyline-${item.id}`}
                  coordinates={decodedCoords}
                  strokeColor="#ff922b"
                  strokeWidth={5}
                />
              );
            } catch (err) {
              console.error('Error rendering decoded polyline:', err);
            }
          }
          return null;
        })}

        {driveEvents.length > 1 && (
          <MapViewDirections
            origin={{ latitude: driveOriginLat, longitude: driveOriginLng }}
            destination={{ latitude: driveDestLat, longitude: driveDestLng }}
            waypoints={driveWaypoints}
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
  airplaneMarker: {
    backgroundColor: '#e222b6',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  airplaneMarkerText: {
    fontSize: 16,
    color: '#ffffff',
  },
  flightOriginMarker: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#e222b6',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
