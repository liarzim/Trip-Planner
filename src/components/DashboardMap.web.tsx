import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Event } from '../types';
import appJson from '../../app.json';

interface DashboardMapProps {
  events: Event[];
  onClose?: () => void;
}

export default function DashboardMap({ events }: DashboardMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const apiKey = appJson.expo.android.config.googleMaps.apiKey;

  // Filter events with coordinates
  const geoEvents = events.filter(
    (e) => typeof e.latitude === 'number' && typeof e.longitude === 'number'
  );

  useEffect(() => {
    const loadScript = () => {
      if ((window as any).google && (window as any).google.maps) {
        setMapLoaded(true);
        return;
      }
      const scriptId = 'google-maps-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => setMapLoaded(true);
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', () => setMapLoaded(true));
      }
    };

    loadScript();
  }, [apiKey]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || geoEvents.length === 0) return;

    const google = (window as any).google;
    const center = { lat: geoEvents[0].latitude!, lng: geoEvents[0].longitude! };

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
    });

    const markers: any[] = [];
    geoEvents.forEach((item, index) => {
      let emoji = '📍';
      const type = item.type.toLowerCase();
      if (type.includes('flight') || type.includes('airport')) emoji = '✈️';
      else if (type.includes('hotel') || type.includes('accommodation') || type.includes('stay')) emoji = '🛏️';
      else if (type.includes('trail') || type.includes('hike') || type.includes('hiking') || type.includes('sightseeing')) emoji = '🥾';
      else if (type.includes('poi') || type.includes('museum') || type.includes('sight')) emoji = '🏛️';

      // Create a marker with custom label containing the emoji
      const marker = new google.maps.Marker({
        position: { lat: item.latitude!, lng: item.longitude! },
        map,
        title: item.title,
        label: {
          text: emoji,
          fontSize: '18px',
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding: 8px; color: #212529; font-family: sans-serif;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px;">${index + 1}. ${item.title}</h4>
          <p style="margin: 0; font-size: 12px; color: #868e96;">${item.type.toUpperCase()} • ${item.startTime}</p>
        </div>`,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markers.push(marker);
    });

    // Draw route Directions on Google Maps
    if (geoEvents.length > 1) {
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#228be6',
          strokeOpacity: 0.8,
          strokeWeight: 4,
        },
      });

      const origin = { lat: geoEvents[0].latitude!, lng: geoEvents[0].longitude! };
      const destination = { lat: geoEvents[geoEvents.length - 1].latitude!, lng: geoEvents[geoEvents.length - 1].longitude! };
      const waypoints = geoEvents.slice(1, -1).map((e) => ({
        location: { lat: e.latitude!, lng: e.longitude! },
        stopover: true,
      }));

      directionsService.route({
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
      }, (response: any, status: any) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(response);
        } else {
          console.error('Directions request failed due to ' + status);
        }
      });
    }

  }, [mapLoaded, events]);

  return (
    <View style={styles.container}>
      {geoEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No geotagged events found</Text>
        </View>
      ) : (
        <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    height: '100%',
  },
  emptyText: {
    color: '#868e96',
    fontSize: 14,
  },
});
