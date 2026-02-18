import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import { useToast } from '@/context/toast';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<'midwife' | 'nurse' | 'student' | 'supervisor'>('midwife');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  // Debounced code validation — triggers after user stops typing
  const codeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (codeTimerRef.current) clearTimeout(codeTimerRef.current);

    if (isStaff && accessCode.length >= 4) {
      codeTimerRef.current = setTimeout(() => {
        validateCode(accessCode, selectedRole);
      }, 500);
    } else {
      setCodeVerified(false);
      setCodeError('');
    }

    return () => { if (codeTimerRef.current) clearTimeout(codeTimerRef.current); };
  }, [accessCode, selectedRole, isStaff]);

  const validateCode = async (code: string, role: string) => {
    setIsValidatingCode(true);
    setCodeError('');
    try {
      const { data, error } = await supabase
        .from('facility_codes')
        .select('role, is_active, facilities(name)')
        .eq('code', code)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setCodeError('Invalid access code');
        setCodeVerified(false);
      } else if (!data.is_active) {
        setCodeError('This code has been deactivated');
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
          phone_number: phoneNumber,
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

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="arrow.left" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.title, { color: themeColors.text }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                Join MotivAid to start helping mothers
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.form}>
            {/* Large Logo */}
            <View style={styles.logoContainer}>
              <Image source={require('@/assets/images/motivaid-light.png')} style={styles.logo} contentFit="contain" />
            </View>

            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              leftIcon={<IconSymbol name="person" size={20} color={themeColors.textSecondary} />}
            />

            <Input
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              error={emailError}
              placeholder="Enter your email"
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<IconSymbol name="envelope" size={20} color={themeColors.textSecondary} />}
            />

            <Input
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              leftIcon={<IconSymbol name="phone" size={20} color={themeColors.textSecondary} />}
            />

            {/* Role Switch */}
            <View style={[styles.switchContainer, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
              <View>
                <Text style={[styles.switchLabel, { color: themeColors.text }]}>Medical Staff Account</Text>
                <Text style={[styles.switchSubLabel, { color: themeColors.textSecondary }]}>Are you a midwife, nurse, or student?</Text>
              </View>
              <Switch
                value={isStaff}
                onValueChange={setIsStaff}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
                thumbColor={'#FFF'}
              />
            </View>

            {isStaff && (
              <View style={styles.staffSection}>
                <Input
                  label="Facility Access Code"
                  value={accessCode}
                  onChangeText={(text) => setAccessCode(text.toUpperCase().replace(/[^A-Z0-9\-]/g, ''))}
                  error={codeError}
                  placeholder="e.g. AKTH1-SUP"
                  autoCapitalize="characters"
                  maxLength={12}
                  leftIcon={<IconSymbol name="building.2" size={20} color={themeColors.textSecondary} />}
                  rightIcon={
                    isValidatingCode ? (
                      <ActivityIndicator size="small" color={themeColors.primary} />
                    ) : codeVerified ? (
                      <IconSymbol name="checkmark.circle.fill" size={20} color={themeColors.success} />
                    ) : null
                  }
                />

                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Specific Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleScroll}>
                  {['midwife', 'nurse', 'student', 'supervisor'].map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.chip,
                        { borderColor: themeColors.border },
                        selectedRole === role && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                      ]}
                      onPress={() => setSelectedRole(role as any)}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: selectedRole === role ? '#FFF' : themeColors.text }
                      ]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
              }}
              error={passwordError}
              placeholder="Create a password"
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

            <Button
              title="Sign Up"
              onPress={signUpWithEmail}
              loading={loading}
              disabled={loading || (isStaff && !codeVerified)}
              style={styles.signUpButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={[styles.signInText, { color: themeColors.secondary }]}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    gap: Spacing.md,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 158,
    height: 158,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchSubLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  label: {
    marginBottom: Spacing.xs,
    fontSize: 14,
    fontWeight: '600',
  },
  staffSection: {
    gap: Spacing.md,
  },
  roleScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontWeight: '600',
  },
  signUpButton: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  signInText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
