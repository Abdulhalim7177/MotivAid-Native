import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.1)', dark: 'rgba(255,255,255,0.1)' }, 'icon');
  const tint = useThemeColor({}, 'tint');

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
        Alert.alert('Registration Failed', error.message);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Account created! Please verify your email.', 'success');
      router.replace('/(auth)/login');
    }
    setLoading(false);
  }

  const RoleButton = ({ role, label }: { role: typeof selectedRole, label: string }) => (
    <TouchableOpacity 
      style={[
        styles.roleButton, 
        selectedRole === role && { backgroundColor: tint, borderColor: tint }
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedRole(role);
      }}
    >
      <ThemedText style={[styles.roleButtonText, selectedRole === role && { color: '#000' }]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
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
              resizeMode="contain"
            />
            <ThemedText type="title" style={styles.title}>Join MotivAid</ThemedText>
            <ThemedText style={styles.subtitle}>Create an account to start your journey</ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                onChangeText={setFullName}
                value={fullName}
                placeholder="Enter your full name"
                placeholderTextColor="#888"
                style={[styles.input, { color: textColor, borderColor: borderColor }]}
              />
            </View>

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
                placeholder="Create a password"
                placeholderTextColor="#888"
                autoCapitalize={'none'}
                style={[
                  styles.input, 
                  { color: textColor, borderColor: passwordError ? '#ff4444' : borderColor }
                ]}
              />
              {passwordError ? <ThemedText style={styles.errorText}>{passwordError}</ThemedText> : null}
            </View>

            <View style={styles.staffToggleContainer}>
              <ThemedText style={styles.staffToggleLabel}>Are you medical staff?</ThemedText>
              <TouchableOpacity 
                style={[styles.toggleBackground, isStaff && { backgroundColor: tint }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsStaff(!isStaff);
                }}
              >
                <View style={[styles.toggleCircle, isStaff && { transform: [{ translateX: 24 }] }]} />
              </TouchableOpacity>
            </View>

            {isStaff && (
              <View style={styles.staffSection}>
                <View style={styles.inputContainer}>
                  <View style={styles.labelRow}>
                    <ThemedText style={styles.label}>Facility Access Code</ThemedText>
                    {isValidatingCode && <ActivityIndicator size="small" color={tint} />}
                    {codeVerified && <IconSymbol name="shield-checkmark-outline" size={16} color="#4CAF50" />}
                  </View>
                  <TextInput
                    onChangeText={(text) => setAccessCode(text.toUpperCase())}
                    value={accessCode}
                    placeholder="ENTER 6-DIGIT CODE"
                    placeholderTextColor="#888"
                    autoCapitalize={'characters'}
                    maxLength={6}
                    style={[
                      styles.input, 
                      { 
                        color: textColor, 
                        borderColor: codeError ? '#ff4444' : codeVerified ? '#4CAF50' : borderColor 
                      }
                    ]}
                  />
                  {codeError ? <ThemedText style={styles.errorText}>{codeError}</ThemedText> : null}
                </View>

                <ThemedText style={styles.label}>Select Your Role</ThemedText>
                <View style={styles.roleGrid}>
                  <RoleButton role="midwife" label="Midwife" />
                  <RoleButton role="nurse" label="Nurse" />
                  <RoleButton role="student" label="Student" />
                  <RoleButton role="supervisor" label="Supervisor" />
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.registerButton, { backgroundColor: tint }]} 
              onPress={signUpWithEmail}
              disabled={loading || (isStaff && !codeVerified)}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <ThemedText style={styles.registerButtonText}>Register</ThemedText>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <ThemedText>Already have an account? </ThemedText>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <ThemedText style={[styles.link, { color: tint }]}>Sign In</ThemedText>
              </TouchableOpacity>
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
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 216,
    height: 144,
    marginBottom: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    height: 52,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 4,
  },
  staffToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
    marginBottom: 8,
  },
  staffToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleBackground: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    padding: 2,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  staffSection: {
    gap: 16,
    paddingVertical: 10,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  registerButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
  registerButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'center',
  },
  link: {
    fontWeight: '700',
  },
});
