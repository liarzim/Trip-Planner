import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

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
  const currentLat = latitude || 31.7683;
  const currentLon = longitude || 35.2137;

  const googleEmbedUrl = `https://maps.google.com/maps?q=${currentLat},${currentLon}&z=14&output=embed`;
  const googleDirectUrl = `https://www.google.com/maps?q=${currentLat},${currentLon}`;

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[styles.instruction, { marginBottom: 0, fontWeight: 'bold', color: '#2b8a3e' }]}>
          🗺️ {isRTL ? `מפת אישור מיקום: (${currentLat.toFixed(4)}, ${currentLon.toFixed(4)})` : `Location Map: (${currentLat.toFixed(4)}, ${currentLon.toFixed(4)})`}
        </Text>
        <a
          href={googleDirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '12px',
            color: '#1971c2',
            fontWeight: 'bold',
            textDecoration: 'none',
          }}
        >
          {isRTL ? '↗️ פתח במפת Google' : '↗️ Open Google Maps'}
        </a>
      </View>

      <View style={styles.mapContainer}>
        <iframe
          src={googleEmbedUrl}
          style={{
            width: '100%',
            height: '240px',
            border: 'none',
            borderRadius: '12px',
          }}
          title="Location Map"
          allowFullScreen
          loading="lazy"
        />
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
});
