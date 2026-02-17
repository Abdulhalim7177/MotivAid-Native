import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { checkBiometrics, getSavedEmail } from '@/lib/security';

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

  const textColor = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const errorColor = useThemeColor({}, 'error');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const shadowColor = useThemeColor({}, 'shadow');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');

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
          <Image
            source={logo}
            style={styles.logo}
            resizeMode="contain"
          />
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
              placeholderTextColor={placeholderColor}
              autoCapitalize={'none'}
              style={[
                styles.input,
                { color: textColor, backgroundColor: inputBg, borderColor: emailError ? errorColor : inputBorder }
              ]}
              keyboardType="email-address"
            />
            {emailError ? <ThemedText style={[styles.errorText, { color: errorColor }]}>{emailError}</ThemedText> : null}
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
              placeholderTextColor={placeholderColor}
              autoCapitalize={'none'}
              style={[
                styles.input,
                { color: textColor, backgroundColor: inputBg, borderColor: passwordError ? errorColor : inputBorder }
              ]}
            />
            {passwordError ? <ThemedText style={[styles.errorText, { color: errorColor }]}>{passwordError}</ThemedText> : null}
          </View>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <ThemedText style={[styles.forgotPasswordText, { color: tint }]}>Forgot Password?</ThemedText>
            </TouchableOpacity>
          </Link>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  flex: 1,
                  backgroundColor: tint,
                  ...Platform.select({
                    ios: { shadowColor },
                    web: { boxShadow: `0px 4px 12px ${shadowColor}40` },
                  }),
                }
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={buttonTextColor} />
              ) : (
                <ThemedText style={[styles.loginButtonText, { color: buttonTextColor }]}>Sign In</ThemedText>
              )}
            </TouchableOpacity>

            {hasBiometrics && (
              <TouchableOpacity
                style={[styles.bioButton, { backgroundColor: tint + '15', borderColor: tint + '30' }]}
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
              <ThemedText style={[styles.link, { color: tint }]}>Create Account</ThemedText>
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  loginButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  bioButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
    justifyContent: 'center',
  },
  link: {
    fontWeight: '700',
  },
});
