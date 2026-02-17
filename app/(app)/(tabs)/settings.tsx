import { StyleSheet, View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { useAppTheme } from '@/context/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import { Spacing, Typography } from '@/constants/theme';

export default function SettingsScreen() {
  const { showToast } = useToast();
  const { preference, setThemePreference } = useAppTheme();
  const { signOut } = useAuth();
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const handleSignOut = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signOut();
      showToast('Signed out successfully', 'success');
    } catch (error: any) {
      showToast('Error signing out', 'error');
    }
  };

  const ThemeOption = ({ label, value, icon }: { label: string, value: 'light' | 'dark' | 'system', icon: any }) => {
    const isActive = preference === value;
    const radioScale = useSharedValue(isActive ? 1 : 0);

    const radioInnerStyle = useAnimatedStyle(() => ({
      transform: [{ scale: radioScale.value }],
    }));

    if (isActive && radioScale.value === 0) {
      radioScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    } else if (!isActive && radioScale.value === 1) {
      radioScale.value = withSpring(0, { damping: 12, stiffness: 200 });
    }

    return (
      <Pressable
        style={[styles.settingRow, { borderColor }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setThemePreference(value);
          showToast(`Theme set to ${label}`, 'info');
        }}
      >
        <View style={styles.settingLabelContainer}>
          <IconSymbol name={icon} size={22} color={textColor} />
          <ThemedText type="bodyMd">{label}</ThemedText>
        </View>
        <View style={[styles.radio, { borderColor: tint }]}>
          <Animated.View style={[styles.radioInner, { backgroundColor: tint }, radioInnerStyle]} />
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <ThemedText type="displayLg" style={styles.title}>Settings</ThemedText>

      <SectionHeader title="Account" />
      <Pressable
        style={[styles.settingRow, { borderColor }]}
        onPress={() => router.push('/(app)/profile')}
      >
        <View style={styles.settingLabelContainer}>
          <IconSymbol name="person.fill" size={22} color={textColor} />
          <ThemedText type="bodyMd">Edit Profile</ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={20} color={textColor} style={{ opacity: 0.3 }} />
      </Pressable>

      <SectionHeader title="Appearance" />
      <ThemeOption label="Light Mode" value="light" icon="sun.max.fill" />
      <ThemeOption label="Dark Mode" value="dark" icon="moon.fill" />
      <ThemeOption label="System Default" value="system" icon="gearshape.fill" />

      <SectionHeader title="Danger Zone" />
      <Button
        title="Sign Out"
        variant="danger"
        onPress={handleSignOut}
        icon={<IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />}
      />

      <ThemedText color="secondary" style={styles.versionText}>MotivAid v1.0.0</ThemedText>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.xl,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smd,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  versionText: {
    textAlign: 'center',
    marginTop: Spacing.mdl,
    ...Typography.caption,
  },
});
