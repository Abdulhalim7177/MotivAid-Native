import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';

type PendingMember = {
  id: string;
  status: string;
  unit_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  };
  units: {
    name: string;
  };
};

export default function ApprovalsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);

  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const errorColor = useThemeColor({}, 'error');
  const buttonTextColor = useThemeColor({}, 'buttonText');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('unit_memberships')
        .select(`
          id,
          status,
          unit_id,
          profiles(full_name, avatar_url, role),
          units(name)
        `)
        .eq('status', 'pending');

      if (error) throw error;
      // @ts-ignore
      setPendingMembers(data || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('unit_memberships')
        .update({ status: action })
        .eq('id', id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Member ${action}!`, 'success');
      setPendingMembers(prev => prev.filter(m => m.id !== id));
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const renderItem = ({ item }: { item: PendingMember }) => (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.memberInfo}>
        <View style={[styles.avatar, { backgroundColor: tint + '20' }]}>
          <ThemedText style={[styles.avatarText, { color: tint }]}>
            {item.profiles.full_name?.charAt(0).toUpperCase() || '?'}
          </ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.memberName}>{item.profiles.full_name || 'Anonymous User'}</ThemedText>
          <ThemedText style={styles.memberRole}>{item.profiles.role.toUpperCase()}</ThemedText>
          <View style={styles.unitBadge}>
            <IconSymbol name="home-outline" size={12} color={textColor} style={{ opacity: 0.5 }} />
            <ThemedText style={styles.unitText}>{item.units.name}</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.button, styles.rejectButton, { backgroundColor: errorColor + '15', borderColor: errorColor + '30' }]}
          onPress={() => handleAction(item.id, 'rejected')}
        >
          <ThemedText style={[styles.rejectText, { color: errorColor }]}>Reject</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tint }]}
          onPress={() => handleAction(item.id, 'approved')}
        >
          <ThemedText style={[styles.approveText, { color: buttonTextColor }]}>Approve</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{
        title: 'Team Approvals',
        headerShown: true,
        headerTransparent: true,
        headerTintColor: textColor
      }} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      ) : (
        <FlatList
          data={pendingMembers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="shield-checkmark-outline" size={64} color={tint} style={{ opacity: 0.3 }} />
              <ThemedText style={styles.emptyTitle}>All caught up!</ThemedText>
              <ThemedText style={styles.emptySub}>No pending membership requests.</ThemedText>
            </View>
          }
          refreshing={loading}
          onRefresh={fetchPending}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 24,
    paddingTop: 100,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  memberInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 17,
    fontWeight: '700',
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '800',
    opacity: 0.5,
    letterSpacing: 1,
    marginTop: 2,
  },
  unitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  unitText: {
    fontSize: 13,
    opacity: 0.6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    borderWidth: 1,
  },
  rejectText: {
    fontWeight: '700',
  },
  approveText: {
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 20,
  },
  emptySub: {
    fontSize: 14,
    opacity: 0.5,
    marginTop: 8,
  },
});
