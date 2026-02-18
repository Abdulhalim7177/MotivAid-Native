import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { AwaitingAssignment } from '@/components/dashboard/awaiting-assignment';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StaffDashboard } from '@/components/dashboard/staff-dashboard';
import { SupervisorDashboard } from '@/components/dashboard/supervisor-dashboard';
import { UserDashboard } from '@/components/dashboard/user-dashboard';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenContainer } from '@/components/ui/screen-container';
import UnitSelector from '@/components/unit-selector';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useUnits } from '@/context/unit';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { activeUnit, isLoading: unitsLoading } = useUnits();
  const [isOffline, setIsOffline] = useState(false);
  const tint = useThemeColor({}, 'tint');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Staff roles that require unit assignment
  const isStaffRole = ['midwife', 'nurse', 'student'].includes(profile?.role || '');
  const needsAssignment = isStaffRole && !unitsLoading && !activeUnit;

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || '';

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

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
    } catch (error) { }
  }

  const renderDashboard = () => {
    switch (profile?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'supervisor':
        return <SupervisorDashboard />;
      case 'midwife':
      case 'nurse':
      case 'student':
        return <StaffDashboard />;
      default:
        return <UserDashboard />;
    }
  };

  return (
    <ScreenContainer>
      <DashboardHeader
        displayName={displayName}
        roleBadge={profile?.role?.toUpperCase() || 'USER'}
        avatarUrl={avatarUrl}
        isOffline={isOffline}
      />

      {needsAssignment ? (
        <AwaitingAssignment />
      ) : (
        <>
          <UnitSelector />

          {renderDashboard()}

          <Card style={styles.infoCard}>
            <ThemedText type="overline" color="secondary" style={styles.infoLabel}>Identity Information</ThemedText>
            <View style={styles.infoRow}>
              <IconSymbol size={20} name="mail-outline" color={tint} />
              <ThemedText type="bodyMd">{user?.email}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol size={20} name="time-outline" color={tint} />
              <ThemedText type="bodyMd">
                Joined {new Date(user?.created_at || '').toLocaleDateString()}
              </ThemedText>
            </View>
          </Card>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    marginTop: Spacing.lg,
  },
  infoLabel: {
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.smd,
    gap: Spacing.smd,
  },
});
