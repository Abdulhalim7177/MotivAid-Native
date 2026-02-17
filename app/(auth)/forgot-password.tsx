import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Radius, Typography } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [timer, setTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();
  const colorScheme = useColorScheme();

  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

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

  const getNextInterval = () => 60;

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
        setTimer(getNextInterval());
      } else {
        showToast(error.message, 'error');
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
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.right" size={24} color={textColor} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>

        <View style={styles.header}>
          <Image
            source={logo}
            style={styles.logo}
            contentFit="contain"
            transition={300}
          />
          <ThemedText type="displaySm">Reset Password</ThemedText>
          <ThemedText color="secondary" style={styles.subtitle}>
            Enter your email to receive a reset link
          </ThemedText>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError('');
            }}
            error={emailError}
            placeholder="Enter your email"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={timer === 0}
          />

          {timer > 0 && (
            <View style={[styles.timerContainer, { backgroundColor: tint + '0D' }]}>
              <IconSymbol name="time-outline" size={20} color={tint} />
              <ThemedText style={[Typography.labelMd, { color: tint }]}>
                Wait {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')} before resending
              </ThemedText>
            </View>
          )}

          <Button
            title={resendCount > 0 ? 'Resend Link' : 'Send Reset Link'}
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading || timer > 0}
            variant={timer > 0 ? 'secondary' : 'primary'}
          />

          {resendCount > 0 && timer === 0 && (
            <ThemedText color="secondary" style={styles.infoText}>
              Didn&apos;t receive the email? Check your spam folder or try resending.
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
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: Spacing.mdl,
    padding: Spacing.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logo: {
    width: 216,
    height: 144,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.mdl,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.smd,
    borderRadius: Radius.md,
  },
  infoText: {
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
