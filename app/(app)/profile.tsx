import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Avatar from '@/components/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { Stack } from 'expo-router';
import { Spacing } from '@/constants/theme';

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

      <ScreenContainer edges={['bottom']} contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <Avatar
            size={120}
            url={avatarUrl}
            onUpload={(url) => {
              setAvatarUrl(url);
              updateProfile(url);
            }}
          />
          <ThemedText color="secondary" style={styles.emailLabel}>{user?.email}</ThemedText>
        </View>

        <View style={styles.form}>
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Your username"
          />

          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
          />

          <Input
            label="Website"
            value={website}
            onChangeText={setWebsite}
            placeholder="https://yourwebsite.com"
          />

          <Button
            title="Save Changes"
            onPress={() => updateProfile()}
            loading={loading}
            disabled={loading}
          />
        </View>
      </ScreenContainer>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  emailLabel: {
    marginTop: Spacing.sm,
  },
  form: {
    gap: Spacing.mdl,
  },
});
