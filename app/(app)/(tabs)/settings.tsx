import { StyleSheet, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/toast';
import { useAppTheme } from '@/context/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { showToast } = useToast();
  const { preference, setThemePreference } = useAppTheme();
  const { profile, signOut } = useAuth();
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const dangerColor = useThemeColor({}, 'danger');

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

    return (
      <TouchableOpacity
        style={[styles.settingRow, { borderColor }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setThemePreference(value);
          showToast(`Theme set to ${label}`, 'info');
        }}
      >
        <View style={styles.settingLabelContainer}>
          <IconSymbol name={icon} size={22} color={textColor} />
          <ThemedText style={styles.settingLabel}>{label}</ThemedText>
        </View>
        <View style={[styles.radio, { borderColor: tint }]}>
          {isActive && <View style={[styles.radioInner, { backgroundColor: tint }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>Settings</ThemedText>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account</ThemedText>
          <TouchableOpacity
            style={[styles.settingRow, { borderColor }]}
            onPress={() => router.push('/(app)/profile')}
          >
            <View style={styles.settingLabelContainer}>
              <IconSymbol name="person.fill" size={22} color={textColor} />
              <ThemedText style={styles.settingLabel}>Edit Profile</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color={textColor} style={{ opacity: 0.3 }} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Appearance</ThemedText>
          <ThemeOption label="Light Mode" value="light" icon="sun.max.fill" />
          <ThemeOption label="Dark Mode" value="dark" icon="moon.fill" />
          <ThemeOption label="System Default" value="system" icon="gearshape.fill" />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Danger Zone</ThemedText>
          <TouchableOpacity
            style={[styles.settingRow, { borderColor }]}
            onPress={handleSignOut}
          >
            <View style={styles.settingLabelContainer}>
              <IconSymbol name="paperplane.fill" size={22} color={dangerColor} />
              <ThemedText style={[styles.settingLabel, { color: dangerColor }]}>Sign Out</ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.versionText}>MotivAid v1.0.0</ThemedText>
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
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.5,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
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
    opacity: 0.3,
    fontSize: 12,
    marginTop: 20,
  },
});
