import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
const CACHE_FILE = FileSystem.documentDirectory ? FileSystem.documentDirectory + 'weather_cache.json' : '';

export interface WeatherData {
  temp: number;
  morningTemp: number;
  eveningTemp: number;
  humidity: number;
  windSpeed: number;
  status: string; // 'sunny' | 'rainy' | 'cloudy' | 'snowy' | 'stormy'
  description: string;
  date: string;
}

export interface WeatherForecast {
  lat: number;
  lon: number;
  daily: WeatherData[];
  timestamp: number;
}

// Coordinate-based cache grouping key
const getCacheKey = (lat: number, lon: number): string => {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
};

// Web Caching
const loadCacheWeb = (): Record<string, WeatherForecast> => {
  try {
    const raw = localStorage.getItem('weather_cache');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const saveCacheWeb = (cache: Record<string, WeatherForecast>) => {
  try {
    localStorage.setItem('weather_cache', JSON.stringify(cache));
  } catch (e) {}
};

// Mobile Caching using Expo FileSystem
const loadCacheMobile = async (): Promise<Record<string, WeatherForecast>> => {
  try {
    if (!CACHE_FILE) return {};
    const info = await FileSystem.getInfoAsync(CACHE_FILE);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(CACHE_FILE);
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
};

const saveCacheMobile = async (cache: Record<string, WeatherForecast>) => {
  try {
    if (!CACHE_FILE) return;
    await FileSystem.writeAsStringAsync(CACHE_FILE, JSON.stringify(cache));
  } catch (e) {}
};

// Seeded mock forecast generator when API key is missing
const generateMockWeather = (lat: number, lon: number): WeatherForecast => {
  const daily: WeatherData[] = [];
  const now = new Date();
  const seed = Math.abs(Math.sin(lat) * Math.cos(lon));
  const statuses = ['sunny', 'cloudy', 'rainy', 'cloudy', 'sunny'];

  for (let i = 0; i < 5; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    const baseTemp = 28 - Math.abs(lat) * 0.35;
    const tempOffset = Math.sin(seed * (i + 1)) * 5;
    const avgTemp = Math.round(baseTemp + tempOffset);

    daily.push({
      temp: avgTemp,
      morningTemp: avgTemp - 2,
      eveningTemp: avgTemp - 4,
      humidity: Math.round(55 + Math.cos(seed * i) * 20),
      windSpeed: parseFloat((3 + Math.sin(seed + i) * 2.5).toFixed(1)),
      status: statuses[(Math.floor(seed * 10) + i) % statuses.length],
      description: 'mock weather',
      date: dateStr,
    });
  }

  return {
    lat,
    lon,
    daily,
    timestamp: Date.now(),
  };
};

/**
 * Fetches the 5-day/3-hour forecast from OpenWeatherMap and groups daily forecasts.
 * Integrates local caching to support offline reads.
 */
export const fetchWeatherForecast = async (lat: number, lon: number): Promise<WeatherForecast | null> => {
  const key = getCacheKey(lat, lon);
  const now = Date.now();
  const ONE_HOUR = 3600000; // Cache valid for 1 hour

  // 1. Read cached weather data
  let currentCache: Record<string, WeatherForecast> = {};
  if (Platform.OS === 'web') {
    currentCache = loadCacheWeb();
  } else {
    currentCache = await loadCacheMobile();
  }

  const cached = currentCache[key];
  if (cached && now - cached.timestamp < ONE_HOUR) {
    return cached;
  }

  // 2. Fallback to mock data if API key is not present
  if (!API_KEY) {
    const mockForecast = generateMockWeather(lat, lon);
    currentCache[key] = mockForecast;
    if (Platform.OS === 'web') {
      saveCacheWeb(currentCache);
    } else {
      await saveCacheMobile(currentCache);
    }
    return mockForecast;
  }

  // 3. Query OpenWeather API
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather fetch status: ${response.status}`);
    }
    const data = await response.json();

    // Group forecast slots by day
    const grouped: Record<string, any[]> = {};
    data.list.forEach((item: any) => {
      const date = item.dt_txt.split(' ')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });

    const dailyForecasts: WeatherData[] = Object.keys(grouped).map((date) => {
      const slots = grouped[date];
      const temps = slots.map((s: any) => s.main.temp);
      const avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
      const humidities = slots.map((s: any) => s.main.humidity);
      const avgHumidity = humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length;
      const windSpeeds = slots.map((s: any) => s.wind.speed);
      const avgWind = windSpeeds.reduce((a: number, b: number) => a + b, 0) / windSpeeds.length;

      let morningTemp = avgTemp;
      let eveningTemp = avgTemp;

      const morningSlot = slots.find((s: any) => s.dt_txt.includes('09:00:00'));
      if (morningSlot) morningTemp = morningSlot.main.temp;
      else morningTemp = slots[0].main.temp;

      const eveningSlot = slots.find((s: any) => s.dt_txt.includes('21:00:00') || s.dt_txt.includes('18:00:00'));
      if (eveningSlot) eveningTemp = eveningSlot.main.temp;
      else eveningTemp = slots[slots.length - 1].main.temp;

      const statuses = slots.map((s: any) => s.weather[0].main.toLowerCase());
      const counts = statuses.reduce((acc: Record<string, number>, s: string) => {
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

      let dominantStatus = 'clear';
      let maxCount = 0;
      Object.keys(counts).forEach((k) => {
        if (counts[k] > maxCount) {
          maxCount = counts[k];
          dominantStatus = k;
        }
      });

      let statusTag = 'sunny';
      if (dominantStatus.includes('rain') || dominantStatus.includes('drizzle')) {
        statusTag = 'rainy';
      } else if (dominantStatus.includes('cloud')) {
        statusTag = 'cloudy';
      } else if (dominantStatus.includes('snow')) {
        statusTag = 'snowy';
      } else if (dominantStatus.includes('thunderstorm')) {
        statusTag = 'stormy';
      } else if (dominantStatus.includes('clear')) {
        statusTag = 'sunny';
      }

      return {
        temp: Math.round(avgTemp),
        morningTemp: Math.round(morningTemp),
        eveningTemp: Math.round(eveningTemp),
        humidity: Math.round(avgHumidity),
        windSpeed: parseFloat(avgWind.toFixed(1)),
        status: statusTag,
        description: slots[0].weather[0].description,
        date,
      };
    });

    const forecastResult: WeatherForecast = {
      lat,
      lon,
      daily: dailyForecasts.slice(0, 5),
      timestamp: now,
    };

    // Cache the result
    currentCache[key] = forecastResult;
    if (Platform.OS === 'web') {
      saveCacheWeb(currentCache);
    } else {
      await saveCacheMobile(currentCache);
    }

    return forecastResult;
  } catch (error) {
    console.error('Failed to retrieve live forecast from OpenWeatherMap:', error);
    if (cached) return cached;
    return null;
  }
};
