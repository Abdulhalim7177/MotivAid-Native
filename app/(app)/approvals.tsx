import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/toast';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Spacing, Radius } from '@/constants/theme';

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
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);

  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

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

  const renderItem = ({ item, index }: { item: PendingMember; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <Card style={styles.card}>
        <View style={styles.memberInfo}>
          <View style={[styles.avatar, { backgroundColor: tint + '20' }]}>
            <ThemedText style={[styles.avatarText, { color: tint }]}>
              {item.profiles.full_name?.charAt(0).toUpperCase() || '?'}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="labelLg">{item.profiles.full_name || 'Anonymous User'}</ThemedText>
            <ThemedText type="overline">{item.profiles.role.toUpperCase()}</ThemedText>
            <View style={styles.unitBadge}>
              <IconSymbol name="home-outline" size={12} color={textColor} style={{ opacity: 0.5 }} />
              <ThemedText type="caption" color="secondary">{item.units.name}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <Button
              title="Reject"
              variant="outline"
              size="md"
              onPress={() => handleAction(item.id, 'rejected')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Approve"
              size="md"
              onPress={() => handleAction(item.id, 'approved')}
            />
          </View>
        </View>
      </Card>
    </Animated.View>
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
        <View style={styles.listContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
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
              <ThemedText type="headingSm" style={styles.emptyTitle}>All caught up!</ThemedText>
              <ThemedText color="secondary">No pending membership requests.</ThemedText>
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
  listContent: {
    padding: Spacing.lg,
    paddingTop: 100,
  },
  card: {
    marginBottom: Spacing.md,
  },
  memberInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.mdl,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  unitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.smd,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyTitle: {
    marginTop: Spacing.mdl,
    marginBottom: Spacing.sm,
  },
});
