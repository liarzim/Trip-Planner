import React from 'react';
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
  // Default to Jerusalem if coordinates aren't set
  const initialLat = latitude || 31.7683;
  const initialLon = longitude || 35.2137;

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude: clickLat, longitude: clickLon } = e.nativeEvent.coordinate;
    onSelectLocation(clickLat, clickLon);
  };

  const handleMarkerDragEnd = (e: any) => {
    const { latitude: dragLat, longitude: dragLon } = e.nativeEvent.coordinate;
    onSelectLocation(dragLat, dragLon);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.instruction, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t ? t('event.pin_instruction') : 'Tap the map or drag the pin to set coordinates'}
      </Text>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: initialLat,
            longitude: initialLon,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={handleMapPress}
        >
          <Marker
            coordinate={{ latitude: initialLat, longitude: initialLon }}
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
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
});
