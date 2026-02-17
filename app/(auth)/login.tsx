import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { checkBiometrics, getSavedEmail } from '@/lib/security';
import { Spacing, Radius, Typography } from '@/constants/theme';

export default function LoginScreen() {
  const { showToast } = useToast();
  const { signIn, signInBiometric, isOfflineAuthenticated } = useAuth();
  const colorScheme = useColorScheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);

  const tint = useThemeColor({}, 'tint');

  const logo = colorScheme === 'dark'
    ? require('@/assets/images/motivaid-dark.png')
    : require('@/assets/images/motivaid-light.png');

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
        setPasswordError(error.message);
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
          <Image
            source={logo}
            style={styles.logo}
            contentFit="contain"
            transition={300}
          />
          <ThemedText type="displaySm">Welcome Back</ThemedText>
          <ThemedText color="secondary" style={styles.subtitle}>
            Sign in to continue your journey
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
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError('');
            }}
            error={passwordError}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
          />

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable style={styles.forgotPasswordContainer}>
              <ThemedText style={[Typography.labelMd, { color: tint }]}>Forgot Password?</ThemedText>
            </Pressable>
          </Link>

          <View style={styles.buttonRow}>
            <View style={{ flex: 1 }}>
              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
              />
            </View>

            {hasBiometrics && (
              <Pressable
                style={[styles.bioButton, { backgroundColor: tint + '15', borderColor: tint + '30' }]}
                onPress={handleBiometric}
              >
                <IconSymbol name="finger-print-outline" size={32} color={tint} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText type="bodyMd">New here? </ThemedText>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <ThemedText style={[Typography.labelMd, { color: tint }]}>Create Account</ThemedText>
            </Pressable>
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
    padding: Spacing.lg,
    justifyContent: 'center',
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
  },
  form: {
    gap: Spacing.mdl,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.smd,
    alignItems: 'center',
  },
  bioButton: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    justifyContent: 'center',
  },
});
