import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
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

// --- User Dashboard Component ---
function UserDashboard({ tint, cardStyle }: { tint: string, cardStyle: any }) {
  const { user, profile } = useAuth();
  return (
    <View>
      <View style={[styles.card, cardStyle]}>
        <ThemedText style={styles.cardLabel}>Personal Progress</ThemedText>
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, cardStyle]}>
            <ThemedText style={styles.statNumber}>12</ThemedText>
            <ThemedText style={styles.statLabel}>Tasks Done</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statNumber}>85%</ThemedText>
            <ThemedText style={styles.statLabel}>Success</ThemedText>
          </View>
        </View>
      </View>
      
      <ThemedText type="subtitle" style={styles.sectionTitle}>My Actions</ThemedText>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIcon, { backgroundColor: tint + '15' }]}>
            <IconSymbol size={24} name="plus" color={tint} />
          </View>
          <ThemedText style={styles.actionLabel}>Add Task</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIcon, { backgroundColor: tint + '15' }]}>
            <IconSymbol size={24} name="calendar" color={tint} />
          </View>
          <ThemedText style={styles.actionLabel}>Schedule</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Supervisor Dashboard Component ---
function SupervisorDashboard({ tint, cardStyle }: { tint: string, cardStyle: any }) {
  return (
    <View>
      <View style={[styles.card, cardStyle]}>
        <ThemedText style={styles.cardLabel}>Team Overview</ThemedText>
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, cardStyle]}>
            <ThemedText style={styles.statNumber}>8</ThemedText>
            <ThemedText style={styles.statLabel}>Active Users</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statNumber}>24</ThemedText>
            <ThemedText style={styles.statLabel}>Pending</ThemedText>
          </View>
        </View>
      </View>

      <ThemedText type="subtitle" style={styles.sectionTitle}>Supervisor Actions</ThemedText>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIcon, { backgroundColor: tint + '15' }]}>
            <IconSymbol size={24} name="person.2.fill" color={tint} />
          </View>
          <ThemedText style={styles.actionLabel}>Manage Team</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIcon, { backgroundColor: tint + '15' }]}>
            <IconSymbol size={24} name="doc.text.fill" color={tint} />
          </View>
          <ThemedText style={styles.actionLabel}>Reports</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Admin Dashboard Component ---
function AdminDashboard({ tint, cardStyle }: { tint: string, cardStyle: any }) {
  return (
    <View>
      <View style={[styles.card, cardStyle, { borderColor: '#FF444450' }]}>
        <ThemedText style={[styles.cardLabel, { color: '#FF4444' }]}>System Status</ThemedText>
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, cardStyle]}>
            <ThemedText style={styles.statNumber}>99.9%</ThemedText>
            <ThemedText style={styles.statLabel}>Uptime</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statNumber}>1.2k</ThemedText>
            <ThemedText style={styles.statLabel}>Logins Today</ThemedText>
          </View>
        </View>
      </View>

      <ThemedText type="subtitle" style={styles.sectionTitle}>Admin Controls</ThemedText>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIcon, { backgroundColor: tint + '15' }]}>
            <IconSymbol size={24} name="gearshape.fill" color={tint} />
          </View>
          <ThemedText style={styles.actionLabel}>Settings</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIcon, { backgroundColor: tint + '15' }]}>
            <IconSymbol size={24} name="shield.fill" color={tint} />
          </View>
          <ThemedText style={styles.actionLabel}>Security</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const cardStyle = { backgroundColor: cardBg, borderColor: borderColor };

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0];

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
      fr.onload = () => {
        setAvatarUrl(fr.result as string);
      };
    } catch (error) {
      // Error handled
    }
  }

  const renderDashboard = () => {
    switch (profile?.role) {
      case 'admin':
        return <AdminDashboard tint={tint} cardStyle={cardStyle} />;
      case 'supervisor':
        return <SupervisorDashboard tint={tint} cardStyle={cardStyle} />;
      default:
        return <UserDashboard tint={tint} cardStyle={cardStyle} />;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.greetingText}>{profile?.role?.toUpperCase() || 'USER'}</ThemedText>
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

        {renderDashboard()}

        <View style={[styles.card, cardStyle, { marginTop: 24 }]}>
          <ThemedText style={styles.cardLabel}>Account Information</ThemedText>
          <View style={styles.infoRow}>
            <IconSymbol size={20} name="envelope.fill" color={tint} />
            <ThemedText style={styles.infoValue}>{user?.email}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol size={20} name="clock.fill" color={tint} />
            <ThemedText style={styles.infoValue}>
              Joined: {new Date(user?.created_at || '').toLocaleDateString()}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '800',
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.5,
    marginBottom: -4,
    letterSpacing: 1,
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
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 20,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionItem: {
    alignItems: 'center',
    width: '30%',
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
