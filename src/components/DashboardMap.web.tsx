import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Event } from '../types';

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

interface DashboardMapProps {
  events: Event[];
  focusedEventId?: string | null;
  onSelectEvent?: (event: Event) => void;
  onClose?: () => void;
}

export default function DashboardMap({ events, onSelectEvent }: DashboardMapProps) {
  React.useEffect(() => {
    const handleMessage = (evt: MessageEvent) => {
      if (evt.data && evt.data.type === 'SELECT_EVENT' && onSelectEvent) {
        const found = events.find(e => e.id === evt.data.id);
        if (found) onSelectEvent(found);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [events, onSelectEvent]);

  const markerItems: string[] = [];
  const arcItems: string[] = [];

  events.forEach((item, index) => {
    const lat = item.latitude;
    const lon = item.longitude;
    const isFlight = item.type.toLowerCase() === 'flight';
    const isHotel = item.type.toLowerCase() === 'hotel';

    if (typeof lat === 'number' && typeof lon === 'number') {
      const emoji = isFlight ? '🛬' : isHotel ? '🏨' : '📍';
      const label = `${index + 1}. ${item.title.replace(/'/g, "\\'")}`;
      
      markerItems.push(`
        (function() {
          var icon = L.divIcon({
            className: 'custom-div-icon',
            html: '${emoji}',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          var m = L.marker([${lat}, ${lon}], { icon: icon }).addTo(map);
          m.bindPopup('<b>${label}</b><br>${item.type.toUpperCase()}');
          m.on('click', function() {
            if (window.parent) {
              window.parent.postMessage({ type: 'SELECT_EVENT', id: '${item.id}' }, '*');
            }
          });
          bounds.push([${lat}, ${lon}]);
        })();
      `);
    }

    if (isFlight) {
      // Origin coordinates: fallback to Tel Aviv (32.0094, 34.8769) if missing
      const origLat = typeof item.originLatitude === 'number' ? item.originLatitude : 32.0094;
      const origLon = typeof item.originLongitude === 'number' ? item.originLongitude : 34.8769;
      const destLat = typeof lat === 'number' ? lat : 50.0647;
      const destLon = typeof lon === 'number' ? lon : 19.9450;

      const origLabel = item.originAirport ? `🛫 Origin (${item.originAirport})` : '🛫 Flight Origin';

      // Flight Origin Marker
      markerItems.push(`
        (function() {
          var icon = L.divIcon({
            className: 'custom-div-icon origin-icon',
            html: '🛫',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          var m = L.marker([${origLat}, ${origLon}], { icon: icon }).addTo(map);
          m.bindPopup('<b>${origLabel}</b>');
          bounds.push([${origLat}, ${origLon}]);
        })();
      `);

      // Flight Arc Line
      const arcPoints = getGeodesicPoints(
        { latitude: origLat, longitude: origLon },
        { latitude: destLat, longitude: destLon },
        40
      );

      const latLngArray = JSON.stringify(arcPoints.map(p => [p.latitude, p.longitude]));

      arcItems.push(`
        (function() {
          var line = L.polyline(${latLngArray}, {
            color: '#e222b6',
            weight: 4,
            dashArray: '8, 8',
            opacity: 0.95
          }).addTo(map);
        })();
      `);
    }
  });

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #e9ecef; }
        .custom-div-icon {
          font-size: 18px;
          text-align: center;
          line-height: 28px;
          background: white;
          border: 2px solid #1971c2;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .origin-icon {
          border-color: #e222b6;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        var bounds = [];

        ${markerItems.join('\n')}
        ${arcItems.join('\n')}

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [50, 50] });
        } else {
          map.setView([32.0094, 34.8769], 4);
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {React.createElement('iframe', {
        srcDoc: mapHtml,
        style: {
          width: '100%',
          height: '350px',
          border: 'none',
          borderRadius: '16px',
        },
        title: 'Trip Main Map',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 350,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ced4da',
    backgroundColor: '#e9ecef',
  },
});
