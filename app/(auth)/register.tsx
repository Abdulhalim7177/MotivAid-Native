import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Spacing, Radius, Typography } from '@/constants/theme';

export default function RegisterScreen() {
  const { showToast } = useToast();
  const colorScheme = useColorScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<'midwife' | 'nurse' | 'student' | 'supervisor'>('midwife');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  const tint = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'success');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const cardColor = useThemeColor({}, 'card');

  const logo = colorScheme === 'dark'
    ? require('@/assets/images/motivaid-dark.png')
    : require('@/assets/images/motivaid-light.png');

  useEffect(() => {
    if (isStaff && accessCode.length === 6) {
      validateCode(accessCode, selectedRole);
    } else {
      setCodeVerified(false);
    }
  }, [accessCode, selectedRole, isStaff]);

  const validateCode = async (code: string, role: string) => {
    setIsValidatingCode(true);
    setCodeError('');
    try {
      const { data, error } = await supabase
        .from('facility_codes')
        .select('role, facilities(name)')
        .eq('code', code)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setCodeError('Invalid access code');
        setCodeVerified(false);
      } else if (data.role !== role) {
        setCodeError(`This code is for a ${data.role.toUpperCase()} role`);
        setCodeVerified(false);
      } else {
        setCodeVerified(true);
        // @ts-ignore
        showToast(`Verified for ${data.facilities.name}`, 'success');
      }
    } catch (err) {
      // Error handled
    } finally {
      setIsValidatingCode(false);
    }
  };

  const validate = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    setCodeError('');

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

    if (isStaff) {
      if (!accessCode) {
        setCodeError('Facility access code is required');
        valid = false;
      } else if (!codeVerified) {
        setCodeError('Please provide a valid code for your role');
        valid = false;
      }
    }

    return valid;
  };

  async function signUpWithEmail() {
    if (!validate()) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: isStaff ? selectedRole : 'user',
          registration_code: isStaff ? accessCode : null,
        }
      }
    });

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error.message.includes('User already registered')) {
        setEmailError('This email is already taken');
      } else {
        setEmailError(error.message);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Account created! Please verify your email.', 'success');
      router.replace('/(auth)/login');
    }
    setLoading(false);
  }

  const RoleButton = ({ role, label }: { role: typeof selectedRole, label: string }) => (
    <Pressable
      style={[
        styles.roleButton,
        { borderColor },
        selectedRole === role && { backgroundColor: tint, borderColor: tint }
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedRole(role);
      }}
    >
      <ThemedText style={[Typography.labelMd, selectedRole === role && { color: buttonTextColor }]}>
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image
              source={logo}
              style={styles.logo}
              contentFit="contain"
              transition={300}
            />
            <ThemedText type="displaySm">Join MotivAid</ThemedText>
            <ThemedText color="secondary" style={styles.subtitle}>
              Create an account to start your journey
            </ThemedText>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
            />

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
              placeholder="Create a password"
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={[styles.staffToggleContainer, { borderBottomColor: borderColor }]}>
              <ThemedText type="defaultSemiBold">Are you medical staff?</ThemedText>
              <Pressable
                style={[styles.toggleBackground, { backgroundColor: isStaff ? tint : borderColor }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsStaff(!isStaff);
                }}
              >
                <View style={[styles.toggleCircle, { backgroundColor: cardColor }, isStaff && { transform: [{ translateX: 24 }] }]} />
              </Pressable>
            </View>

            {isStaff && (
              <View style={styles.staffSection}>
                <Input
                  label="Facility Access Code"
                  value={accessCode}
                  onChangeText={(text) => setAccessCode(text.toUpperCase())}
                  error={codeError}
                  placeholder="ENTER 6-DIGIT CODE"
                  autoCapitalize="characters"
                  maxLength={6}
                  rightIcon={
                    isValidatingCode ? (
                      <ActivityIndicator size="small" color={tint} />
                    ) : codeVerified ? (
                      <IconSymbol name="shield-checkmark-outline" size={16} color={successColor} />
                    ) : null
                  }
                />

                <ThemedText style={[Typography.labelMd, styles.roleLabel]}>Select Your Role</ThemedText>
                <View style={styles.roleGrid}>
                  <RoleButton role="midwife" label="Midwife" />
                  <RoleButton role="nurse" label="Nurse" />
                  <RoleButton role="student" label="Student" />
                  <RoleButton role="supervisor" label="Supervisor" />
                </View>
              </View>
            )}

            <Button
              title="Register"
              onPress={signUpWithEmail}
              loading={loading}
              disabled={loading || (isStaff && !codeVerified)}
            />
          </View>

          <View style={styles.footer}>
            <ThemedText type="bodyMd">Already have an account? </ThemedText>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <ThemedText style={[Typography.labelMd, { color: tint }]}>Sign In</ThemedText>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 80,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
    gap: Spacing.md,
  },
  staffToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    marginBottom: Spacing.sm,
  },
  toggleBackground: {
    width: 52,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  staffSection: {
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  roleLabel: {
    marginLeft: Spacing.xs,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    justifyContent: 'center',
  },
});
