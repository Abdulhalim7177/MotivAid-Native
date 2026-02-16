import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { useAuth } from '@/context/auth';
import { checkBiometrics, getSavedEmail } from '@/lib/security';

export default function LoginScreen() {
  const { showToast } = useToast();
  const { signIn, signInBiometric, isOfflineAuthenticated } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.1)', dark: 'rgba(255,255,255,0.1)' }, 'icon');
  const tint = useThemeColor({}, 'tint');

  useEffect(() => {
    async function init() {
      const bioAvailable = await checkBiometrics();
      setHasBiometrics(bioAvailable);
      
      const savedEmail = await getSavedEmail();
      if (savedEmail) setEmail(savedEmail);
    }
    init();
  }, []);

  const validate = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }

    return valid;
  };

  async function handleLogin() {
    if (!validate()) return;
    
    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error.message.includes('Invalid credentials')) {
        setPasswordError('Incorrect email or password');
      } else {
        Alert.alert('Login Failed', error.message);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Welcome back!', 'success');
      router.replace('/(app)/(tabs)');
    }
    setLoading(false);
  }

  async function handleBiometric() {
    const success = await signInBiometric();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Unlocked!', 'success');
      router.replace('/(app)/(tabs)');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <IconSymbol size={60} name="lock.fill" color={tint} />
          </View>
          <ThemedText type="title" style={styles.title}>Welcome Back</ThemedText>
          <ThemedText style={styles.subtitle}>Sign in to continue your journey</ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              value={email}
              placeholder="Enter your email"
              placeholderTextColor="#888"
              autoCapitalize={'none'}
              style={[
                styles.input, 
                { color: textColor, borderColor: emailError ? '#ff4444' : borderColor }
              ]}
              keyboardType="email-address"
            />
            {emailError ? <ThemedText style={styles.errorText}>{emailError}</ThemedText> : null}
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <TextInput
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
              }}
              value={password}
              secureTextEntry={true}
              placeholder="Enter your password"
              placeholderTextColor="#888"
              autoCapitalize={'none'}
              style={[
                styles.input, 
                { color: textColor, borderColor: passwordError ? '#ff4444' : borderColor }
              ]}
            />
            {passwordError ? <ThemedText style={styles.errorText}>{passwordError}</ThemedText> : null}
          </View>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <ThemedText style={styles.forgotPasswordText}>Forgot Password?</ThemedText>
            </TouchableOpacity>
          </Link>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.loginButton, { flex: 1 }]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
              )}
            </TouchableOpacity>

            {hasBiometrics && (
              <TouchableOpacity 
                style={styles.bioButton} 
                onPress={handleBiometric}
              >
                <IconSymbol name="finger-print-outline" size={32} color={tint} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText>New here? </ThemedText>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <ThemedText style={styles.link}>Create Account</ThemedText>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
    marginTop: 8,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 4,
    marginTop: 2,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: '#00D2FF',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    height: 56,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: 'inherit',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  loginButton: {
    height: 56,
    backgroundColor: '#00D2FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 8px rgba(0, 210, 255, 0.3)',
      },
    }),
  },
  bioButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.2)',
  },
  loginButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
    justifyContent: 'center',
  },
  link: {
    color: '#00D2FF',
    fontWeight: '700',
  },
});
