import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';

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
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Default to Jerusalem if coordinates aren't set
  const initialLat = latitude ? parseFloat(latitude.toString()) : 31.7683;
  const initialLon = longitude ? parseFloat(longitude.toString()) : 35.2137;

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const runInit = () => {
      const L = (window as any).L;
      if (!L) return;

      const container = document.getElementById('web-map-picker');
      if (!container) return;

      if (!mapRef.current) {
        // Initialize Leaflet Map
        const map = L.map('web-map-picker').setView([initialLat, initialLon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        mapRef.current = map;

        // Custom marker icon using standard Leaflet CDN images to prevent path issues
        const defaultIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        // Add draggable marker
        const marker = L.marker([initialLat, initialLon], {
          draggable: true,
          icon: defaultIcon
        }).addTo(map);
        markerRef.current = marker;

        // Listen for drag events to update parent inputs
        marker.on('dragend', () => {
          const position = marker.getLatLng();
          onSelectLocation(parseFloat(position.lat.toFixed(6)), parseFloat(position.lng.toFixed(6)));
        });

        // Listen for map clicks to place marker and update parent inputs
        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          onSelectLocation(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
        });
      }
    };

    // Load Leaflet Script
    const scriptId = 'leaflet-js';
    if (!(window as any).L) {
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = runInit;
        document.head.appendChild(script);
      }
    } else {
      runInit();
    }

    // Cleanup: destroy map instance to prevent Leaflet container reuse error on remounting
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update map and marker if inputs coordinates are typed/modified
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;

    if (map && marker && latitude && longitude) {
      const latVal = parseFloat(latitude.toString());
      const lonVal = parseFloat(longitude.toString());

      if (!isNaN(latVal) && !isNaN(lonVal)) {
        const currentCenter = map.getCenter();
        const diffLat = Math.abs(currentCenter.lat - latVal);
        const diffLon = Math.abs(currentCenter.lng - lonVal);

        // Update view if coordinate differs significantly
        if (diffLat > 0.0001 || diffLon > 0.0001) {
          map.setView([latVal, lonVal], map.getZoom());
          marker.setLatLng([latVal, lonVal]);
        }
      }
    }
  }, [latitude, longitude]);

  return (
    <View style={styles.container}>
      <Text style={[styles.instruction, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t ? t('event.pin_instruction') : 'Tap the map or drag the pin to set coordinates'}
      </Text>
      <div id="web-map-picker" style={{ height: '220px', borderRadius: '12px', border: '1px solid #ced4da', zIndex: 1 }} />
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
});
