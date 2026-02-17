import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenContainer } from '@/components/ui/screen-container';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { useToast } from '@/context/toast';
import * as Haptics from 'expo-haptics';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

export default function SettingsScreen() {
  const { showToast } = useToast();
  const { preference, setThemePreference, theme } = useAppTheme();
  const { signOut, user } = useAuth();

  const themeColors = Colors[theme];
  const isDark = preference === 'dark';

  const handleSignOut = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signOut();
      showToast('Signed out successfully', 'success');
    } catch (error: any) {
      showToast('Error signing out', 'error');
    }
  };

  const SettingItem = ({ label, icon, value, type = 'arrow', onPress, onToggle }: any) => (
    <View style={[styles.settingItem, { borderBottomColor: themeColors.border }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: themeColors.inputBackground }]}>
          <IconSymbol name={icon} size={20} color={themeColors.text} />
        </View>
        <ThemedText type="bodyMd" style={styles.settingLabel}>{label}</ThemedText>
      </View>

      {type === 'toggle' ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: themeColors.border, true: themeColors.primary }}
          thumbColor={'#FFF'}
        />
      ) : (
        <IconSymbol name="chevron.right" size={16} color={themeColors.textSecondary} />
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <ThemedText type="displaySm">Settings</ThemedText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        <SectionHeader title="Appearance" />
        <Card style={styles.card}>
          <SettingItem
            label="Dark Mode"
            icon="moon.fill"
            type="toggle"
            value={isDark}
            onToggle={(val: boolean) => {
              setThemePreference(val ? 'dark' : 'light');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        </Card>

        <SectionHeader title="Account" />
        <Card style={styles.card}>
          <SettingItem label="Edit Profile" icon="person.fill" />
          <SettingItem label="Notifications" icon="bell" />
          <SettingItem label="Security" icon="lock.fill" />
        </Card>

        <SectionHeader title="Support" />
        <Card style={styles.card}>
          <SettingItem label="Help Center" icon="questionmark.circle" />
          <SettingItem label="Privacy Policy" icon="hand.raised.fill" />
        </Card>

        <View style={styles.logoutContainer}>
          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleSignOut}
            style={{ borderColor: '#FF3B30' }}
            rightIcon={<IconSymbol name="arrow.right.square" size={18} color="#FF3B30" />}
          />
          <ThemedText color="secondary" style={styles.versionText}>MotivAid v1.0.2 • Build 2026.02.17</ThemedText>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
  },
  card: {
    paddingVertical: 0,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontWeight: '500',
  },
  logoutContainer: {
    marginTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  versionText: {
    textAlign: 'center',
    marginTop: Spacing.md,
    fontSize: 12,
    opacity: 0.7,
  },
});
