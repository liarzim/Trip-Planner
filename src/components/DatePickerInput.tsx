import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface DatePickerInputProps {
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  placeholder?: string;
  isRTL?: boolean;
  style?: any;
}

export default function DatePickerInput({
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  isRTL = false,
  style = {}
}: DatePickerInputProps) {
  const hiddenDateInputRef = useRef<any>(null);

  const handleOpenCalendar = () => {
    if (Platform.OS === 'web' && hiddenDateInputRef.current) {
      try {
        if (typeof hiddenDateInputRef.current.showPicker === 'function') {
          hiddenDateInputRef.current.showPicker();
        } else if (typeof hiddenDateInputRef.current.click === 'function') {
          hiddenDateInputRef.current.click();
        }
      } catch (err) {
        if (typeof hiddenDateInputRef.current.click === 'function') {
          hiddenDateInputRef.current.click();
        }
      }
    }
  };

  const rowDir = (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse';
  const textAlign = (isRTL ? 'right' : 'left') as 'left' | 'right';

  return (
    <View style={[styles.container, { flexDirection: rowDir }, style]}>
      <TextInput
        style={[styles.textInput, { textAlign }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#adb5bd"
      />
      <TouchableOpacity
        onPress={handleOpenCalendar}
        style={styles.calendarBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.calendarIconText}>📅</Text>
      </TouchableOpacity>

      {Platform.OS === 'web' && (
        <input
          ref={hiddenDateInputRef}
          type="date"
          value={value || ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
            }
          }}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            width: 1,
            height: 1,
            bottom: 0,
            right: isRTL ? 'auto' : 0,
            left: isRTL ? 0 : 'auto',
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 46,
    marginBottom: 16,
    position: 'relative',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#212529',
    height: '100%',
    fontWeight: 'bold',
  },
  calendarBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#e7f5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIconText: {
    fontSize: 18,
  },
});
