import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Avatar from '@/components/avatar';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { Stack } from 'expo-router';

export default function ProfileScreen() {
  const { showToast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const tint = useThemeColor({}, 'tint');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const shadowColor = useThemeColor({}, 'shadow');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setFullName(profile.full_name || '');
      setWebsite(profile.website || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  async function updateProfile(newAvatarUrl?: string) {
    try {
      setLoading(true);
      if (!user) throw new Error('No user on the session!');

      const finalAvatarUrl = typeof newAvatarUrl === 'string' ? newAvatarUrl : avatarUrl;

      const updates = {
        id: user.id,
        username,
        full_name: fullName,
        website,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;

      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (typeof newAvatarUrl !== 'string') {
        showToast('Profile updated!', 'success');
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{
        headerShown: true,
        title: 'Edit Profile',
        headerTransparent: true,
        headerTintColor: textColor
      }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <Avatar
            size={120}
            url={avatarUrl}
            onUpload={(url) => {
              setAvatarUrl(url);
              updateProfile(url);
            }}
          />
          <ThemedText style={styles.emailLabel}>{user?.email}</ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Username</ThemedText>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Your username"
              placeholderTextColor={placeholderColor}
              style={[styles.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Full Name</ThemedText>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={placeholderColor}
              style={[styles.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Website</ThemedText>
            <TextInput
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yourwebsite.com"
              placeholderTextColor={placeholderColor}
              style={[styles.input, { color: textColor, backgroundColor: inputBg, borderColor: inputBorder }]}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: tint,
                ...Platform.select({
                  ios: { shadowColor },
                  web: { boxShadow: `0px 4px 12px ${shadowColor}40` },
                }),
              }
            ]}
            onPress={() => updateProfile()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={buttonTextColor} />
            ) : (
              <ThemedText style={[styles.saveButtonText, { color: buttonTextColor }]}>Save Changes</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 100,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emailLabel: {
    opacity: 0.6,
    fontSize: 16,
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
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
