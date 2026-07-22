import React from 'react';
import { Platform } from 'react-native';
import MapPickerWeb from './MapPicker.web';
import MapPickerNative from './MapPicker.native';

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onSelectLocation: (lat: number, lon: number) => void;
  lang?: string;
  isRTL?: boolean;
  t?: (key: string) => string;
}

export default function MapPicker(props: MapPickerProps) {
  if (Platform.OS === 'web') {
    return <MapPickerWeb {...props} />;
  }
  return <MapPickerNative {...props} />;
}
