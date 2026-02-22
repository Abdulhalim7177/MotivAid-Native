import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Input } from '@/components/ui/input';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { useToast } from '@/context/toast';
import { checkBiometrics, getSavedEmail } from '@/lib/security';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];
  const { showToast } = useToast();
  const { signIn, signInBiometric } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [, setHasBiometrics] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/motivaid-light.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <Text style={[styles.title, { color: themeColors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Sign in to continue
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email or Phone"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError('');
            }}
            error={emailError}
            placeholder="Enter your email or phone"
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon={<IconSymbol name="person" size={20} color={themeColors.textSecondary} />}
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
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            leftIcon={<IconSymbol name="lock.fill" size={20} color={themeColors.textSecondary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <IconSymbol
                  name={showPassword ? "eye.slash" : "eye"}
                  size={20}
                  color={themeColors.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          <View style={styles.optionsRow}>
            <View style={styles.checkboxContainer}>
              {/* Simplified checkbox placeholder */}
              <View style={[styles.checkbox, { borderColor: themeColors.border }]} />
              <Text style={[styles.rememberText, { color: themeColors.textSecondary }]}>Remember me</Text>
            </View>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity>
                <Text style={[styles.forgotText, { color: themeColors.secondary }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.actionRow}>
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.signInButton}
            />

            {/* Show only on native platforms if biometrics are available */}
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={[styles.biometricButton, { borderColor: themeColors.primary, borderWidth: 2 }]}
                onPress={handleBiometric}
              >
                <IconSymbol name="touchid" size={28} color={themeColors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.orContainer}>
            <Text style={[styles.orText, { color: themeColors.textSecondary }]}>or continue with</Text>
          </View>

          {/* Social Row Removed as requested (Fingerprint moved up) */}

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={[styles.signUpText, { color: themeColors.secondary }]}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    // Removed card background/shadow
  },
  logo: {
    width: 158, // Matching register size
    height: 158,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    gap: Spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4,
  },
  rememberText: {
    fontSize: 14,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  signInButton: {
    flex: 1,
    marginTop: 0, // Reset margin since it's in a row
  },
  biometricButton: {
    width: 56,
    height: 56,
    borderRadius: 28, // Circle
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  orText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg, // Reduced from xl
  },
  footerText: {
    fontSize: 14,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
