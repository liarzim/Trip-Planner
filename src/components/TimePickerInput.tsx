import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';

interface TimePickerInputProps {
  value: string; // e.g. "14:30" or "02:30 PM"
  onChange: (val: string) => void;
  format?: '24h' | '12h';
  isRTL?: boolean;
  placeholder?: string;
}

export default function TimePickerInput({
  value,
  onChange,
  format = '24h',
  isRTL = false,
  placeholder = ''
}: TimePickerInputProps) {
  // Parse current value into hours, minutes, ampm
  const parseTime = () => {
    if (!value) return { hh: '10', mm: '00', ampm: 'AM' };
    const clean = value.trim();
    
    // Check 12h format e.g. "02:30 PM"
    const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = match12[2];
      const p = match12[3].toUpperCase();
      const hhStr = String(h).padStart(2, '0');
      return { hh: hhStr, mm: m, ampm: p };
    }

    // Check 24h format e.g. "14:30"
    const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      let h = parseInt(match24[1], 10);
      const m = match24[2];
      if (format === '12h') {
        const p = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        return { hh: String(h).padStart(2, '0'), mm: m, ampm: p };
      }
      return { hh: String(h).padStart(2, '0'), mm: m, ampm: 'AM' };
    }

    return { hh: '10', mm: '00', ampm: 'AM' };
  };

  const { hh, mm, ampm } = parseTime();

  const handle24Change = (newHh: string, newMm: string) => {
    onChange(`${newHh}:${newMm}`);
  };

  const handle12Change = (newHh: string, newMm: string, newAmpm: string) => {
    let hInt = parseInt(newHh, 10);
    if (isNaN(hInt)) hInt = 12;
    if (newAmpm === 'PM' && hInt < 12) hInt += 12;
    if (newAmpm === 'AM' && hInt === 12) hInt = 0;
    const h24 = String(hInt).padStart(2, '0');
    onChange(`${h24}:${newMm}`);
  };

  const webSelectStyle: any = {
    flex: 1,
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '10px 8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#212529',
    fontWeight: 'bold',
    height: '42px',
    cursor: 'pointer',
    outline: 'none',
  };

  if (Platform.OS === 'web') {
    if (format === '24h') {
      return (
        <View style={styles.webRow}>
          <select
            value={hh}
            onChange={(e) => handle24Change(e.target.value, mm)}
            style={webSelectStyle}
          >
            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
              <option key={h} value={h}>
                {h} {isRTL ? 'שעות' : 'hrs'}
              </option>
            ))}
          </select>
          <Text style={styles.colon}>:</Text>
          <select
            value={mm}
            onChange={(e) => handle24Change(hh, e.target.value)}
            style={webSelectStyle}
          >
            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
              <option key={m} value={m}>
                {m} {isRTL ? 'דקות' : 'min'}
              </option>
            ))}
          </select>
        </View>
      );
    } else {
      return (
        <View style={styles.webRow}>
          <select
            value={hh}
            onChange={(e) => handle12Change(e.target.value, mm, ampm)}
            style={webSelectStyle}
          >
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <Text style={styles.colon}>:</Text>
          <select
            value={mm}
            onChange={(e) => handle12Change(hh, e.target.value, ampm)}
            style={webSelectStyle}
          >
            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={ampm}
            onChange={(e) => handle12Change(hh, mm, e.target.value)}
            style={{ ...webSelectStyle, marginLeft: '4px', width: '70px' }}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </View>
      );
    }
  }

  // Native Mobile Fallback
  return (
    <TextInput
      style={styles.nativeInput}
      placeholder={placeholder || (format === '24h' ? '14:30' : '02:30 PM')}
      placeholderTextColor="#adb5bd"
      value={value}
      onChangeText={onChange}
    />
  );
}

const styles = StyleSheet.create({
  webRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  colon: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 4,
    color: '#495057',
  },
  nativeInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#212529',
  },
});
