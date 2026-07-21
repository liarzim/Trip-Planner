import appJson from '../../app.json';

const apiKey = appJson.expo.android.config.googleMaps.apiKey;

export interface DirectionsResult {
  distanceMeters: number;
  durationText: string;
  encodedPolyline: string;
  mode: string;
}

/**
 * Calculates route directions, distances, and duration from the Google Directions API.
 */
export const fetchRouteDirections = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: 'driving' | 'transit'
): Promise<DirectionsResult | null> => {
  try {
    const googleMode = mode === 'transit' ? 'transit' : 'driving';
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=${googleMode}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      const distanceMeters = leg.distance?.value || 0;
      const durationText = leg.duration?.text || '';
      const encodedPolyline = route.overview_polyline?.points || '';

      return {
        distanceMeters,
        durationText,
        encodedPolyline,
        mode: googleMode,
      };
    } else {
      console.warn('Google Directions API returned non-OK status:', data.status, data.error_message);
      return null;
    }
  } catch (error) {
    console.error('Error in fetchRouteDirections:', error);
    return null;
  }
};
