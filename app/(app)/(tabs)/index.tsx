import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { AwaitingAssignment } from '@/components/dashboard/awaiting-assignment';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StaffDashboard } from '@/components/dashboard/staff-dashboard';
import { SupervisorDashboard } from '@/components/dashboard/supervisor-dashboard';
import { UserDashboard } from '@/components/dashboard/user-dashboard';
import { ScreenContainer } from '@/components/ui/screen-container';

import { useAuth } from '@/context/auth';
import { useUnits } from '@/context/unit';
import { supabase } from '@/lib/supabase';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { activeUnit, isLoading: unitsLoading } = useUnits();
  const [isOffline, setIsOffline] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasUnitMembership, setHasUnitMembership] = useState<boolean | null>(null);
  const isWeb = Platform.OS === 'web';

  // Staff roles that require unit assignment
  const isStaffRole = ['midwife', 'nurse', 'student'].includes(profile?.role || '');
  const isNormalUser = !profile?.role || profile.role === 'user';

  // Check if staff has been assigned to any unit (via unit_memberships)
  useEffect(() => {
    if (!isStaffRole || !user?.id) {
      setHasUnitMembership(true); // Normal users and non-staff don't need unit membership
      return;
    }

    const checkMembership = async () => {
      const { data } = await supabase
        .from('unit_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', user.id)
        .eq('status', 'approved');

      setHasUnitMembership((data?.length ?? 0) > 0);
    };

    checkMembership();
  }, [isStaffRole, user?.id]);

  // Show AwaitingAssignment for staff who have no unit memberships
  const needsAssignment = isStaffRole && hasUnitMembership === false;

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
    } catch { }
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
      <View style={isWeb ? styles.webWrapper : undefined}>
        <DashboardHeader
          displayName={displayName}
          roleBadge={profile?.role?.toUpperCase() || 'USER'}
          avatarUrl={avatarUrl}
          isOffline={isOffline}
        />

        {needsAssignment ? (
          <AwaitingAssignment />
        ) : (
          renderDashboard()
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    maxWidth: 1200,
    alignSelf: 'center' as any,
    width: '100%',
  },
});
