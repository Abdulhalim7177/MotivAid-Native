import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { showToast } = useToast();
  
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.1)', dark: 'rgba(255,255,255,0.1)' }, 'icon');
  const tint = useThemeColor({}, 'tint');

  const validate = () => {
    let valid = true;
    setPasswordError('');

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    } else if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      valid = false;
    }

    return valid;
  };

  async function handleUpdatePassword() {
    if (!validate()) return;
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Password updated successfully!', 'success');
      router.replace('/(auth)/login');
    }
    setLoading(false);
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <IconSymbol size={60} name="lock-closed-outline" color={tint} />
          </View>
          <ThemedText type="title" style={styles.title}>New Password</ThemedText>
          <ThemedText style={styles.subtitle}>Enter your new secure password</ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>New Password</ThemedText>
            <TextInput
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
              }}
              value={password}
              secureTextEntry={true}
              placeholder="Min 6 characters"
              placeholderTextColor="#888"
              autoCapitalize={'none'}
              style={[
                styles.input, 
                { color: textColor, borderColor: passwordError ? '#ff4444' : borderColor }
              ]}
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Confirm Password</ThemedText>
            <TextInput
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (passwordError) setPasswordError('');
              }}
              value={confirmPassword}
              secureTextEntry={true}
              placeholder="Confirm new password"
              placeholderTextColor="#888"
              autoCapitalize={'none'}
              style={[
                styles.input, 
                { color: textColor, borderColor: passwordError ? '#ff4444' : borderColor }
              ]}
            />
            {passwordError ? <ThemedText style={styles.errorText}>{passwordError}</ThemedText> : null}
          </View>

          <TouchableOpacity 
            style={[styles.resetButton, { backgroundColor: tint }]} 
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <ThemedText style={styles.resetButtonText}>Update Password</ThemedText>
            )}
          </TouchableOpacity>
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
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 4,
    marginTop: 2,
  },
  input: {
    height: 56,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
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
  resetButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
