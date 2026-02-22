import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { useToast } from '@/context/toast';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const { showToast } = useToast();
  const { preference, setThemePreference, theme } = useAppTheme();
  const { signOut, user, profile } = useAuth();
  const themeColors = Colors[theme];
  const isDark = preference === 'dark';
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || '';

  useEffect(() => {
    if (profile?.avatar_url) downloadImage(profile.avatar_url);
    else setAvatarUrl(null);
  }, [profile?.avatar_url]);

  async function downloadImage(path: string) {
    try {
      const { data, error } = await supabase.storage.from('avatars').download(path);
      if (error) throw error;
      const fr = new FileReader();
      fr.readAsDataURL(data);
      fr.onload = () => setAvatarUrl(fr.result as string);
    } catch { }
  }

  const handleSignOut = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signOut();
      showToast('Signed out successfully', 'success');
    } catch {
      showToast('Error signing out', 'error');
    }
  };

  // Setting item component
  const SettingItem = ({ label, icon, iconColor, value, type = 'arrow', onPress, onToggle, isLast = false }: any) => (
    <TouchableOpacity
      activeOpacity={type === 'toggle' ? 1 : 0.6}
      onPress={onPress}
      style={[
        styles.settingItem,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.border },
      ]}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor || themeColors.primary }]}>
          <IconSymbol name={icon} size={18} color="#FFF" />
        </View>
        <Text style={[styles.settingLabel, { color: themeColors.text }]}>{label}</Text>
      </View>

      {type === 'toggle' ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: themeColors.border, true: themeColors.primary }}
          thumbColor={'#FFF'}
        />
      ) : (
        <IconSymbol name="chevron.right" size={14} color={themeColors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  // Section component
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        {children}
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Profile Card */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(app)/profile')}
          style={[styles.profileCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
        >
          <View style={[styles.profileAvatar, { backgroundColor: themeColors.primary + '20' }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImage} contentFit="cover" />
            ) : (
              <Text style={[styles.profileInitial, { color: themeColors.primary }]}>
                {displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: themeColors.text }]}>{displayName}</Text>
            <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]}>{user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: themeColors.primary + '15' }]}>
              <Text style={[styles.roleText, { color: themeColors.primary }]}>
                {profile?.role?.charAt(0).toUpperCase()}{profile?.role?.slice(1) || 'User'}
              </Text>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={16} color={themeColors.textSecondary} />
        </TouchableOpacity>

        {/* Appearance */}
        <Section title="APPEARANCE">
          <SettingItem
            label="Dark Mode"
            icon="moon.fill"
            iconColor="#5856D6"
            type="toggle"
            value={isDark}
            isLast
            onToggle={(val: boolean) => {
              setThemePreference(val ? 'dark' : 'light');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        </Section>

        {/* Account */}
        <Section title="ACCOUNT">
          <SettingItem
            label="Edit Profile"
            icon="person.fill"
            iconColor={themeColors.primary}
            onPress={() => router.push('/(app)/profile')}
          />
          <SettingItem
            label="Notifications"
            icon="bell"
            iconColor="#FF9500"
          />
          <SettingItem
            label="Security"
            icon="lock.fill"
            iconColor="#34C759"
            isLast
          />
        </Section>

        {/* Support */}
        <Section title="SUPPORT">
          <SettingItem
            label="Help Center"
            icon="questionmark.circle"
            iconColor="#007AFF"
          />
          <SettingItem
            label="Privacy Policy"
            icon="hand.raised.fill"
            iconColor="#FF3B30"
            isLast
          />
        </Section>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSignOut}
            style={[styles.signOutButton, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          >
            <IconSymbol name="arrow.right.square" size={18} color="#FF3B30" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={[styles.versionText, { color: themeColors.textSecondary }]}>
          MotivAid v1.0.2 • Build 2026.02.17
        </Text>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileInitial: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  profileName: {
    ...Typography.headingSm,
  },
  profileEmail: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  roleText: {
    ...Typography.labelSm,
  },

  // Sections
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.md,
  },
  sectionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Setting items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.smd,
    paddingHorizontal: Spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    ...Typography.bodyMd,
  },

  // Sign out
  signOutSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  signOutText: {
    color: '#FF3B30',
    ...Typography.buttonMd,
  },

  // Version
  versionText: {
    textAlign: 'center',
    ...Typography.labelSm,
    opacity: 0.6,
  },
});
