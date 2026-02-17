import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [timer, setTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();
  const colorScheme = useColorScheme();

  const textColor = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const errorColor = useThemeColor({}, 'error');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const shadowColor = useThemeColor({}, 'shadow');
  const borderColor = useThemeColor({}, 'border');

  const logo = colorScheme === 'dark'
    ? require('@/assets/images/motivaid-dark.png')
    : require('@/assets/images/motivaid-light.png');

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timer]);

  const validate = () => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const getNextInterval = () => {
    return 60; // Standard Supabase rate limit is 60 seconds
  };

  async function handleResetPassword() {
    if (!validate()) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'motivaid://reset-password',
    });

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error.message.includes('rate limit')) {
        showToast('Too many requests. Please wait.', 'error');
        setTimer(getNextInterval()); // Force start timer on rate limit
      } else {
        Alert.alert('Error', error.message);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Reset link sent!', 'success');
      setTimer(getNextInterval());
      setResendCount((prev) => prev + 1);
    }
    setLoading(false);
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.right" size={24} color={textColor} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Image
            source={logo}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="title" style={styles.title}>Reset Password</ThemedText>
          <ThemedText style={styles.subtitle}>Enter your email to receive a reset link</ThemedText>
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
              placeholderTextColor={placeholderColor}
              autoCapitalize={'none'}
              style={[
                styles.input,
                { color: textColor, backgroundColor: inputBg, borderColor: emailError ? errorColor : inputBorder }
              ]}
              keyboardType="email-address"
              editable={timer === 0}
            />
            {emailError ? <ThemedText style={[styles.errorText, { color: errorColor }]}>{emailError}</ThemedText> : null}
          </View>

          {timer > 0 && (
            <View style={[styles.timerContainer, { backgroundColor: tint + '0D' }]}>
              <IconSymbol name="time-outline" size={20} color={tint} />
              <ThemedText style={[styles.timerText, { color: tint }]}>
                Wait {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')} before resending
              </ThemedText>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.resetButton,
              {
                backgroundColor: timer > 0 ? inputBg : tint,
                ...Platform.select({
                  ios: { shadowColor: timer > 0 ? 'transparent' : shadowColor },
                  web: { boxShadow: timer > 0 ? 'none' : `0px 4px 12px ${shadowColor}40` },
                }),
              }
            ]}
            onPress={handleResetPassword}
            disabled={loading || timer > 0}
          >
            {loading ? (
              <ActivityIndicator color={buttonTextColor} />
            ) : (
              <ThemedText style={[
                styles.resetButtonText,
                { color: timer > 0 ? textColor : buttonTextColor },
                timer > 0 && { opacity: 0.5 }
              ]}>
                {resendCount > 0 ? 'Resend Link' : 'Send Reset Link'}
              </ThemedText>
            )}
          </TouchableOpacity>

          {resendCount > 0 && timer === 0 && (
            <ThemedText style={styles.infoText}>
              Didn't receive the email? Check your spam folder or try resending.
            </ThemedText>
          )}
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 216,
    height: 144,
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
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
    fontSize: 12,
    marginLeft: 4,
    marginTop: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 10,
  },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  resetButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
