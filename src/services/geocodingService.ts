import appJson from '../../app.json';

const apiKey = appJson.expo.android.config.googleMaps.apiKey;

// Built-in offline IATA Airport Coordinates Dictionary for instant matching
const IATA_AIRPORT_MAP: Record<string, { latitude: number; longitude: number }> = {
  TLV: { latitude: 32.0094, longitude: 34.8769 }, // Ben Gurion Airport, Tel Aviv
  LHR: { latitude: 51.4700, longitude: -0.4543 }, // London Heathrow
  LGW: { latitude: 51.1537, longitude: -0.1821 }, // London Gatwick
  STN: { latitude: 51.8860, longitude: 0.2389 },  // London Stansted
  LTN: { latitude: 51.8747, longitude: -0.3683 }, // London Luton
  JFK: { latitude: 40.6413, longitude: -73.7781 },// New York JFK
  EWR: { latitude: 40.6895, longitude: -74.1745 },// Newark Liberty
  LGA: { latitude: 40.7769, longitude: -73.8740 },// LaGuardia
  LAX: { latitude: 33.9416, longitude: -118.4085 },// Los Angeles
  SFO: { latitude: 37.6213, longitude: -122.3790 },// San Francisco
  MIA: { latitude: 25.7959, longitude: -80.2870 },// Miami
  ORD: { latitude: 41.9742, longitude: -87.9073 },// Chicago O'Hare
  CDG: { latitude: 49.0097, longitude: 2.5479 },  // Paris Charles de Gaulle
  ORY: { latitude: 48.7262, longitude: 2.3652 },  // Paris Orly
  BCN: { latitude: 41.2974, longitude: 2.0785 },  // Barcelona El Prat
  MAD: { latitude: 40.4839, longitude: -3.5679 }, // Madrid Barajas
  FCO: { latitude: 41.7999, longitude: 12.2462 }, // Rome Fiumicino
  MXP: { latitude: 45.6301, longitude: 8.7255 },  // Milan Malpensa
  AMS: { latitude: 52.3105, longitude: 4.7683 },  // Amsterdam Schiphol
  FRA: { latitude: 50.0379, longitude: 8.5622 },  // Frankfurt
  MUC: { latitude: 48.3537, longitude: 11.7860 }, // Munich
  BER: { latitude: 52.3667, longitude: 13.5033 }, // Berlin Brandenburg
  ZRH: { latitude: 47.4582, longitude: 8.5555 },  // Zurich
  VIE: { latitude: 48.1103, longitude: 16.5697 }, // Vienna
  ATH: { latitude: 37.9364, longitude: 23.9472 }, // Athens
  IST: { latitude: 41.2753, longitude: 28.7519 }, // Istanbul
  SAW: { latitude: 40.8986, longitude: 29.3092 }, // Istanbul Sabiha
  DXB: { latitude: 25.2532, longitude: 55.3657 }, // Dubai
  DOH: { latitude: 25.2731, longitude: 51.6081 }, // Doha Hamad
  BKK: { latitude: 13.6900, longitude: 100.7501 },// Bangkok Suvarnabhumi
  HND: { latitude: 35.5494, longitude: 139.7798 },// Tokyo Haneda
  NRT: { latitude: 35.7720, longitude: 140.3929 },// Tokyo Narita
  SIN: { latitude: 1.3644, longitude: 103.9915 }, // Singapore Changi
  SYD: { latitude: -33.9399, longitude: 151.1753 },// Sydney
  YYZ: { latitude: 43.6777, longitude: -79.6248 },// Toronto Pearson
  YVR: { latitude: 49.1967, longitude: -123.1815 },// Vancouver
  BUD: { latitude: 47.4369, longitude: 19.2556 }, // Budapest
  PRG: { latitude: 50.1008, longitude: 14.2600 }, // Prague
  OTP: { latitude: 44.5706, longitude: 26.0844 }, // Bucharest
  LCA: { latitude: 34.8751, longitude: 33.6249 }, // Larnaca
  PFO: { latitude: 34.7180, longitude: 32.4857 }, // Paphos
  HER: { latitude: 35.3397, longitude: 25.1803 }, // Heraklion
  RHO: { latitude: 36.4054, longitude: 28.0862 }, // Rhodes
  LIS: { latitude: 38.7756, longitude: -9.1354 },  // Lisbon
  OPO: { latitude: 41.2481, longitude: -8.6814 },  // Porto
  CPH: { latitude: 55.6180, longitude: 12.6508 },  // Copenhagen
  OSL: { latitude: 60.1976, longitude: 11.1004 },  // Oslo
  ARN: { latitude: 59.6498, longitude: 17.9238 },  // Stockholm Arlanda
  HEL: { latitude: 60.3172, longitude: 24.9633 },  // Helsinki
  WAW: { latitude: 52.1672, longitude: 20.9679 },  // Warsaw Chopin
  KRK: { latitude: 50.0777, longitude: 19.7848 },  // Krakow
  PZN: { latitude: 52.4210, longitude: 16.8263 },  // Poznan
};

/**
 * Converts a textual address or airport code to geographic coordinates.
 * Tries IATA dictionary -> OpenStreetMap Nominatim -> Google Maps Geocoding API.
 */
export const geocodeAddress = async (
  address: string
): Promise<{ latitude: number; longitude: number } | null> => {
  if (!address || !address.trim()) return null;
  const cleanInput = address.trim();

  // 1. Check IATA Airport dictionary match (3 letters uppercase)
  const iataUpper = cleanInput.toUpperCase();
  if (IATA_AIRPORT_MAP[iataUpper]) {
    return IATA_AIRPORT_MAP[iataUpper];
  }

  // 2. Try OpenStreetMap Nominatim API (CORS-friendly on web & mobile)
  try {
    const searchQuery = cleanInput.length === 3 ? `${cleanInput} Airport` : cleanInput;
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`;
    const nomRes = await fetch(nominatimUrl, {
      headers: {
        'Accept-Language': 'en,he',
      },
    });
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        const first = nomData[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { latitude: lat, longitude: lon };
        }
      }
    }
  } catch (nomErr) {
    console.warn('Nominatim geocoding fallback failed:', nomErr);
  }

  // 3. Fallback to Google Maps Geocoding API if key exists
  if (apiKey) {
    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        cleanInput
      )}&key=${apiKey}`;
      const gRes = await fetch(googleUrl);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
          const loc = gData.results[0].geometry.location;
          return {
            latitude: loc.lat,
            longitude: loc.lng,
          };
        }
      }
    } catch (gErr) {
      console.warn('Google Geocoding API failed:', gErr);
    }
  }

  return null;
};
