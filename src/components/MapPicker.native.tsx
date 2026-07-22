import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onSelectLocation: (lat: number, lon: number) => void;
  lang?: string;
  isRTL?: boolean;
  t?: (key: string) => string;
}

export default function MapPicker({
  latitude,
  longitude,
  onSelectLocation,
  lang,
  isRTL,
  t
}: MapPickerProps) {
  const mapRef = useRef<MapView>(null);
  const currentLat = latitude || 31.7683;
  const currentLon = longitude || 35.2137;

  useEffect(() => {
    if (latitude && longitude && mapRef.current) {
      try {
        if (typeof (mapRef.current as any).animateToRegion === 'function') {
          (mapRef.current as any).animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 500);
        }
      } catch (e) {
        // Fallback
      }
    }
  }, [latitude, longitude]);

  const handleMapPress = (e: MapPressEvent) => {
    if (e && e.nativeEvent && e.nativeEvent.coordinate) {
      const { latitude: clickLat, longitude: clickLon } = e.nativeEvent.coordinate;
      onSelectLocation(clickLat, clickLon);
    }
  };

  const handleMarkerDragEnd = (e: any) => {
    if (e && e.nativeEvent && e.nativeEvent.coordinate) {
      const { latitude: dragLat, longitude: dragLon } = e.nativeEvent.coordinate;
      onSelectLocation(dragLat, dragLon);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.instruction, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t ? t('event.pin_instruction') : 'Tap the map or drag the pin to set coordinates'}
      </Text>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={{
            latitude: currentLat,
            longitude: currentLon,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={handleMapPress}
        >
          <Marker
            coordinate={{ latitude: currentLat, longitude: currentLon }}
            draggable
            onDragEnd={handleMarkerDragEnd}
            title={t ? t('event.pin_location') : 'Event Location'}
          />
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  instruction: {
    fontSize: 12,
    color: '#868e96',
    marginBottom: 6,
    fontWeight: '500',
  },
  mapContainer: {
    height: 240,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ced4da',
    backgroundColor: '#e9ecef',
  },
  map: {
    width: '100%',
    height: '100%',
    minHeight: 240,
  },
});
