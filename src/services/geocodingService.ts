import appJson from '../../app.json';

const apiKey = appJson.expo.android.config.googleMaps.apiKey;

/**
 * Converts a textual address to geographic coordinates using the Google Maps Geocoding API.
 */
export const geocodeAddress = async (
  address: string
): Promise<{ latitude: number; longitude: number } | null> => {
  if (!address || !address.trim()) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address.trim()
    )}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    } else {
      console.warn('Geocoding API returned non-OK status:', data.status, data.error_message);
      return null;
    }
  } catch (error) {
    console.error('Error in geocodeAddress:', error);
    return null;
  }
};
