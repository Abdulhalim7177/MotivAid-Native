import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import UnitSelector from '@/components/unit-selector';

// --- Shared Components ---
const StatBox = ({ label, value, tint, cardStyle }: { label: string, value: string | number, tint: string, cardStyle: any }) => (
  <View style={[styles.statBox, cardStyle]}>
    <ThemedText style={styles.statNumber}>{value}</ThemedText>
    <ThemedText style={styles.statLabel}>{label}</ThemedText>
  </View>
);

const ActionItem = ({ label, icon, tint, onPress }: { label: string, icon: any, tint: string, onPress?: () => void }) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <View style={[styles.actionIcon, { backgroundColor: tint + '15' }]}>
      <IconSymbol size={24} name={icon} color={tint} />
    </View>
    <ThemedText style={styles.actionLabel}>{label}</ThemedText>
  </TouchableOpacity>
);

// --- Staff Dashboard (Midwife, Nurse, Student) ---
function StaffDashboard({ tint, cardStyle }: { tint: string, cardStyle: any }) {
  return (
    <View>
      <View style={[styles.card, cardStyle]}>
        <ThemedText style={styles.cardLabel}>Shift Overview</ThemedText>
        <View style={styles.statsContainer}>
          <StatBox label="My Cases" value="8" tint={tint} cardStyle={cardStyle} />
          <StatBox label="Success Rate" value="100%" tint={tint} cardStyle={cardStyle} />
        </View>
      </View>
      
      <ThemedText type="subtitle" style={styles.sectionTitle}>Main Workflow</ThemedText>
      <View style={styles.actionsGrid}>
        <ActionItem label="Clinical Mode" icon="plus" tint={tint} />
        <ActionItem label="Training" icon="calendar" tint={tint} />
        <ActionItem label="My History" icon="document-text-outline" tint={tint} />
      </View>

      <View style={[styles.card, cardStyle, { marginTop: 24 }]}>
        <ThemedText style={styles.cardLabel}>Training Progress</ThemedText>
        <View style={styles.progressRow}>
          <View style={[styles.progressBarBase, { backgroundColor: tint + '20' }]}>
            <View style={[styles.progressBarFill, { backgroundColor: tint, width: '65%' }]} />
          </View>
          <ThemedText style={styles.progressText}>65% Complete</ThemedText>
        </View>
      </View>
    </View>
  );
}

// --- Supervisor Dashboard ---
function SupervisorDashboard({ tint, cardStyle }: { tint: string, cardStyle: any }) {
  return (
    <View>
      <View style={[styles.card, cardStyle]}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.cardLabel}>Unit Adherence</ThemedText>
          <View style={styles.trendBadge}>
            <IconSymbol name="chevron.right" size={12} color="#4CAF50" style={{ transform: [{ rotate: '-90deg' }] }} />
            <ThemedText style={styles.trendText}>+4%</ThemedText>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <StatBox label="Avg Response" value="3.2m" tint={tint} cardStyle={cardStyle} />
          <StatBox label="E-MOTIVE" value="92%" tint={tint} cardStyle={cardStyle} />
        </View>
      </View>

      <TouchableOpacity 
        style={styles.alertCard}
        onPress={() => router.push('/(app)/approvals')}
      >
        <View style={styles.alertIcon}>
          <IconSymbol name="person-add-outline" size={20} color="#FFD600" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.alertTitle}>Pending Approvals</ThemedText>
          <ThemedText style={styles.alertSub}>Midwives awaiting unit assignment</ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={20} color="#888" />
      </TouchableOpacity>

      <ThemedText type="subtitle" style={styles.sectionTitle}>Management</ThemedText>
      <View style={styles.actionsGrid}>
        <ActionItem label="Team" icon="people-outline" tint={tint} />
        <ActionItem label="Analytics" icon="document-text-outline" tint={tint} />
        <ActionItem label="Units" icon="settings-outline" tint={tint} />
      </View>
    </View>
  );
}

// --- Admin Dashboard ---
function AdminDashboard({ tint, cardStyle }: { tint: string, cardStyle: any }) {
  return (
    <View>
      <View style={[styles.card, cardStyle, { borderLeftWidth: 4, borderLeftColor: tint }]}>
        <ThemedText style={styles.cardLabel}>Global Statistics</ThemedText>
        <View style={styles.statsContainer}>
          <StatBox label="Facilities" value="24" tint={tint} cardStyle={cardStyle} />
          <StatBox label="Total Users" value="1.2k" tint={tint} cardStyle={cardStyle} />
        </View>
      </View>

      <ThemedText type="subtitle" style={styles.sectionTitle}>System Administration</ThemedText>
      <View style={styles.actionsGrid}>
        <ActionItem label="Security" icon="shield-checkmark-outline" tint={tint} />
        <ActionItem label="Config" icon="settings-outline" tint={tint} />
        <ActionItem label="Audit Logs" icon="time-outline" tint={tint} />
      </View>
    </View>
  );
}

// --- Basic User Dashboard ---
function UserDashboard({ tint, cardStyle }: { tint: string, cardStyle: any }) {
  return (
    <View style={{ gap: 24 }}>
      <View style={[styles.card, cardStyle, { paddingVertical: 40, alignItems: 'center' }]}>
        <View style={[styles.largeIconCircle, { backgroundColor: tint + '15' }]}>
          <IconSymbol size={48} name="plus" color={tint} />
        </View>
        <ThemedText type="subtitle" style={{ marginTop: 16 }}>Start Clinical Mode</ThemedText>
        <ThemedText style={{ opacity: 0.6, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 }}>
          Begin an E-MOTIVE clinical session immediately.
        </ThemedText>
        
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: tint, marginTop: 24 }]}>
          <ThemedText style={styles.primaryButtonText}>Initialize Case</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const [isOffline, setIsOffline] = useState(false);
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const cardStyle = { backgroundColor: cardBg, borderColor: borderColor };
  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0];

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
    } catch (error) {}
  }

  const renderDashboard = () => {
    switch (profile?.role) {
      case 'admin':
        return <AdminDashboard tint={tint} cardStyle={cardStyle} />;
      case 'supervisor':
        return <SupervisorDashboard tint={tint} cardStyle={cardStyle} />;
      case 'midwife':
      case 'nurse':
      case 'student':
        return <StaffDashboard tint={tint} cardStyle={cardStyle} />;
      default:
        return <UserDashboard tint={tint} cardStyle={cardStyle} />;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <View style={styles.greetingRow}>
              <Image 
                source={require('@/assets/images/app-logo-small.png')} 
                style={styles.smallLogo} 
                resizeMode="contain"
              />
              <ThemedText style={styles.greetingText}>{profile?.role?.toUpperCase() || 'USER'}</ThemedText>
              {isOffline && (
                <View style={styles.offlineBadge}>
                  <ThemedText style={styles.offlineText}>OFFLINE</ThemedText>
                </View>
              )}
            </View>
            <ThemedText type="title" style={styles.welcomeText}>
              {displayName}
            </ThemedText>
          </View>
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => router.push('/(app)/profile')}
          >
            <View style={[styles.avatar, { backgroundColor: tint + '20' }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <ThemedText style={[styles.avatarText, { color: tint }]}>
                  {displayName?.charAt(0).toUpperCase()}
                </ThemedText>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <UnitSelector />

        {renderDashboard()}

        <View style={[styles.card, cardStyle, { marginTop: 24 }]}>
          <ThemedText style={styles.cardLabel}>Identity Information</ThemedText>
          <View style={styles.infoRow}>
            <IconSymbol size={20} name="mail-outline" color={tint} />
            <ThemedText style={styles.infoValue}>{user?.email}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol size={20} name="time-outline" color={tint} />
            <ThemedText style={styles.infoValue}>
              Joined {new Date(user?.created_at || '').toLocaleDateString()}
            </ThemedText>
          </View>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.5,
    marginBottom: -2,
    letterSpacing: 1,
  },
  smallLogo: {
    width: 20,
    height: 20,
    marginRight: -4,
  },
  offlineBadge: {
    backgroundColor: 'rgba(255, 61, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF3D00',
  },
  offlineText: {
    fontSize: 8,
    color: '#FF3D00',
    fontWeight: '900',
  },
  profileButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.5,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    borderRadius: 18,
    padding: 16,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 32,
    marginBottom: 16,
    fontSize: 18,
    fontWeight: '700',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Specific UI Elements
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBase: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    width: 85,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 0, 0.08)',
    padding: 16,
    borderRadius: 20,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.2)',
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  alertSub: {
    fontSize: 12,
    opacity: 0.6,
  },
  largeIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
