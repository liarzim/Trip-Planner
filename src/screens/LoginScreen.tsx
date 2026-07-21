import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { loginUser, registerUser, loginWithGoogle } from '../services/authService';
import { useTranslation } from '../services/translationService';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { t, isRTL } = useTranslation();

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !displayName)) {
      setError(t('expense.required_error'));
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await loginUser(email, password);
      } else {
        await registerUser(email, password, displayName);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.card, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          <Text style={styles.title}>
            {isLogin 
              ? (isRTL ? 'ברוכים הבאים' : 'Welcome Back')
              : (isRTL ? 'יצירת חשבון' : 'Create Account')
            }
          </Text>
          <Text style={styles.subtitle}>
            {isLogin 
              ? t('login.subtitle')
              : (isRTL ? 'הצטרף והתחל לתכנן טיולים ביחד' : 'Join and start planning trips together')
            }
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={[styles.label, textAlignStyle]}>{t('login.name')}</Text>
              <TextInput
                style={[styles.input, textAlignStyle]}
                placeholder="John Doe"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={[styles.label, textAlignStyle]}>{t('login.email')}</Text>
            <TextInput
              style={[styles.input, textAlignStyle]}
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, textAlignStyle]}>{t('login.password')}</Text>
            <TextInput
              style={[styles.input, textAlignStyle]}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isLogin ? t('login.button') : t('login.signup_button')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Social Sign-In Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{isRTL ? 'או' : 'or'}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.googleButtonText}>
              🔵  {isRTL ? 'התחבר עם Google' : 'Sign In with Google'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleButtonText}>
              {isLogin ? t('login.switch_signup') : t('login.switch_signin')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    color: '#fa5252',
    backgroundColor: '#fff5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#212529',
    backgroundColor: '#f8f9fa',
  },
  primaryButton: {
    backgroundColor: '#228be6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dee2e6',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#868e96',
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#228be6',
    fontSize: 14,
    fontWeight: '600',
  },
});
