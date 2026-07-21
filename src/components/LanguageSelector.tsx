import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from '../services/translationService';
import { colors } from '../theme/colors';

export default function LanguageSelector() {
  const { lang, setLanguage } = useTranslation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, lang === 'en' && styles.activeBtn]}
        onPress={() => setLanguage('en')}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, lang === 'en' && styles.activeText]}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, lang === 'he' && styles.activeBtn]}
        onPress={() => setLanguage('he')}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, lang === 'he' && styles.activeText]}>עב</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  btn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBtn: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#adb5bd',
  },
  activeText: {
    color: colors?.primary || '#228be6',
  },
});
