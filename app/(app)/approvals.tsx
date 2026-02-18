import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { useToast } from '@/context/toast';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type UnassignedStaff = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  updated_at: string;
};

type Unit = {
  id: string;
  name: string;
  facility_id: string;
};

export default function ApprovalsScreen() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];

  const [loading, setLoading] = useState(true);
  const [unassignedStaff, setUnassignedStaff] = useState<UnassignedStaff[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<UnassignedStaff | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get the supervisor's facility_id from their profile
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('facility_id')
        .eq('id', user?.id || '')
        .maybeSingle();

      if (!myProfile?.facility_id) {
        setLoading(false);
        return;
      }

      const facilityId = myProfile.facility_id;

      // 2. Get all units in this facility
      const { data: facilityUnits } = await supabase
        .from('units')
        .select('id, name, facility_id')
        .eq('facility_id', facilityId);

      setUnits(facilityUnits || []);

      // 3. Get all staff profiles at this facility
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, updated_at')
        .eq('facility_id', facilityId)
        .in('role', ['midwife', 'nurse', 'student'])
        .neq('id', user?.id || '');

      if (!staffProfiles || staffProfiles.length === 0) {
        setUnassignedStaff([]);
        setLoading(false);
        return;
      }

      // 4. Get profiles that already have approved memberships
      const { data: existingMemberships } = await supabase
        .from('unit_memberships')
        .select('profile_id')
        .eq('status', 'approved');

      const assignedIds = new Set(existingMemberships?.map(m => m.profile_id) || []);

      // 5. Filter to only unassigned staff
      const unassigned = staffProfiles.filter(p => !assignedIds.has(p.id));
      setUnassignedStaff(unassigned);
    } catch (error: any) {
      showToast(error.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (staff: UnassignedStaff, unit: Unit) => {
    setAssigningId(staff.id);
    try {
      // Create approved membership directly (supervisor assignment)
      const { error } = await supabase
        .from('unit_memberships')
        .upsert({
          profile_id: staff.id,
          unit_id: unit.id,
          status: 'approved',
          role_in_unit: 'member',
        }, { onConflict: 'profile_id,unit_id' });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`${staff.full_name || 'Staff'} assigned to ${unit.name}`, 'success');

      // Remove from unassigned list
      setUnassignedStaff(prev => prev.filter(s => s.id !== staff.id));
      setSelectedStaff(null);
    } catch (error: any) {
      showToast(error.message || 'Assignment failed', 'error');
    } finally {
      setAssigningId(null);
    }
  };

  const renderItem = ({ item, index }: { item: UnassignedStaff; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <Card style={styles.card}>
        <View style={styles.memberInfo}>
          <View style={[styles.avatar, { backgroundColor: tint + '20' }]}>
            <ThemedText style={[styles.avatarText, { color: tint }]}>
              {item.full_name?.charAt(0).toUpperCase() || '?'}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="labelLg">{item.full_name || 'Anonymous User'}</ThemedText>
            <View style={[styles.roleBadge, { backgroundColor: themeColors.primary + '15' }]}>
              <ThemedText style={[styles.roleText, { color: themeColors.primary }]}>
                {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
              </ThemedText>
            </View>
            <ThemedText type="caption" color="secondary" style={styles.dateText}>
              {item.updated_at
                ? `Registered ${new Date(item.updated_at).toLocaleDateString()}`
                : 'Recently registered'}
            </ThemedText>
          </View>
        </View>

        <Button
          title="Assign to Unit"
          size="md"
          onPress={() => setSelectedStaff(item)}
        />
      </Card>
    </Animated.View>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{
        title: 'Staff Assignments',
        headerShown: true,
        headerTransparent: true,
        headerTintColor: textColor,
      }} />

      {loading ? (
        <View style={styles.listContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={unassignedStaff}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="shield-checkmark-outline" size={64} color={tint} style={{ opacity: 0.3 }} />
              <ThemedText type="headingSm" style={styles.emptyTitle}>All caught up!</ThemedText>
              <ThemedText color="secondary" style={styles.emptySubtitle}>
                No staff members awaiting unit assignment.
              </ThemedText>
            </View>
          }
          refreshing={loading}
          onRefresh={fetchData}
        />
      )}

      {/* Unit selection modal */}
      <Modal
        animationType="slide"
        transparent
        visible={!!selectedStaff}
        onRequestClose={() => setSelectedStaff(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: themeColors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <View>
                <ThemedText type="headingSm">Assign to Unit</ThemedText>
                <ThemedText type="caption" color="secondary" style={styles.modalSubtitle}>
                  Assign {selectedStaff?.full_name || 'staff member'} to a unit
                </ThemedText>
              </View>
              <Pressable onPress={() => setSelectedStaff(null)}>
                <IconSymbol name="close" size={24} color={textColor} />
              </Pressable>
            </View>

            {units.length === 0 ? (
              <View style={styles.noUnits}>
                <IconSymbol name="home-outline" size={40} color={tint} style={{ opacity: 0.3 }} />
                <ThemedText color="secondary" style={styles.noUnitsText}>
                  No units available. Create a unit first.
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={units}
                keyExtractor={(item) => item.id}
                renderItem={({ item: unit }) => (
                  <Pressable
                    style={[styles.unitItem, { borderColor: themeColors.border }]}
                    onPress={() => selectedStaff && handleAssign(selectedStaff, unit)}
                  >
                    <View style={[styles.unitIcon, { backgroundColor: tint + '15' }]}>
                      <IconSymbol name="home-outline" size={20} color={tint} />
                    </View>
                    <ThemedText type="labelLg" style={{ flex: 1 }}>{unit.name}</ThemedText>
                    {assigningId === selectedStaff?.id ? (
                      <ThemedText type="caption" color="secondary">Assigning...</ThemedText>
                    ) : (
                      <IconSymbol name="chevron.right" size={16} color={themeColors.textSecondary} />
                    )}
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
    marginBottom: Spacing.md,
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
  dateText: {
    marginTop: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyTitle: {
    marginTop: Spacing.mdl,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.lg,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  modalSubtitle: {
    marginTop: 4,
  },
  noUnits: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  noUnitsText: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  unitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.smd,
    gap: Spacing.smd,
  },
  unitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
