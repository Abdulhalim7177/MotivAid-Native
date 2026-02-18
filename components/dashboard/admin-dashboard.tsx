import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Skeleton } from '@/components/ui/skeleton';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const isWeb = Platform.OS === 'web';

type SystemStats = {
  facilities: number;
  units: number;
  totalStaff: number;
  pendingAssignments: number;
};

export function AdminDashboard() {
  const { theme } = useAppTheme();
  const themeColors = Colors[theme];
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [facilitiesRes, unitsRes, staffRes, membershipRes] = await Promise.all([
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
        supabase.from('units').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
          .in('role', ['midwife', 'nurse', 'student', 'supervisor']),
        supabase.from('unit_memberships').select('id', { count: 'exact', head: true })
          .eq('status', 'approved'),
      ]);

      const totalStaff = staffRes.count || 0;
      const approvedMembers = membershipRes.count || 0;

      setStats({
        facilities: facilitiesRes.count || 0,
        units: unitsRes.count || 0,
        totalStaff,
        pendingAssignments: Math.max(0, totalStaff - approvedMembers),
      });
    } catch {
      setStats({ facilities: 0, units: 0, totalStaff: 0, pendingAssignments: 0 });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Facilities',
      value: stats?.facilities ?? 0,
      icon: 'building.2' as const,
      color: themeColors.primary,
      description: 'Registered healthcare facilities',
    },
    {
      label: 'Total Staff',
      value: stats?.totalStaff ?? 0,
      icon: 'person.2.fill' as const,
      color: themeColors.secondary,
      description: 'Active staff members across all facilities',
    },
    {
      label: 'Pending Assignments',
      value: stats?.pendingAssignments ?? 0,
      icon: 'clock.fill' as const,
      color: themeColors.warning,
      description: 'Staff awaiting unit assignment',
    },
    {
      label: 'Active Units',
      value: stats?.units ?? 0,
      icon: 'square.grid.2x2.fill' as const,
      color: themeColors.success,
      description: 'Operational units across facilities',
    },
  ];

  const navItems = [
    {
      label: 'Manage Facilities',
      description: 'Create, edit, manage healthcare facilities and registration codes',
      icon: 'building.2' as const,
      color: themeColors.primary,
      onPress: () => router.push('/(app)/facilities'),
    },
    {
      label: 'All Staff',
      description: 'View and manage staff across all facilities',
      icon: 'person.2.fill' as const,
      color: themeColors.secondary,
      onPress: () => { },
    },
    {
      label: 'Audit Log',
      description: 'View system activity, changes and security events',
      icon: 'clock.arrow.circlepath' as const,
      color: '#8B5CF6',
      onPress: () => { },
    },
    {
      label: 'System Settings',
      description: 'Configure application settings and preferences',
      icon: 'gearshape.fill' as const,
      color: '#6B7280',
      onPress: () => { },
    },
  ];

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      {/* Page Title — desktop only */}
      {isWeb && (
        <Animated.View entering={FadeInDown.springify()} style={styles.pageHeader}>
          <ThemedText style={[Typography.displaySm, { color: themeColors.text }]}>
            System Overview
          </ThemedText>
          <ThemedText type="bodyMd" color="secondary">
            Real-time statistics and system management
          </ThemedText>
        </Animated.View>
      )}

      {/* KPI Stat Cards */}
      <View style={[styles.statsGrid, isWeb && styles.statsGridWeb]}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={[styles.statCard, isWeb && styles.statCardWeb]}>
              <Skeleton width="100%" height={isWeb ? 140 : 100} borderRadius={Radius.lg} />
            </View>
          ))
          : statCards.map((card, i) => (
            <Animated.View
              key={card.label}
              entering={FadeInDown.delay(i * 60).springify()}
              style={[
                styles.statCard,
                isWeb && styles.statCardWeb,
                {
                  backgroundColor: card.color + '08',
                  borderColor: card.color + '18',
                  borderWidth: 1,
                },
                Shadows.sm,
              ]}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconCircle, { backgroundColor: card.color + '18' }]}>
                  <IconSymbol name={card.icon} size={isWeb ? 22 : 18} color={card.color} />
                </View>
              </View>
              <ThemedText style={[
                isWeb ? Typography.displayLg : Typography.statLg,
                { color: themeColors.text },
              ]}>
                {card.value}
              </ThemedText>
              <ThemedText type="labelMd" color="secondary">
                {card.label}
              </ThemedText>
              {isWeb && (
                <ThemedText type="bodySm" color="secondary" style={styles.statDesc}>
                  {card.description}
                </ThemedText>
              )}
            </Animated.View>
          ))}
      </View>

      {/* Navigation Section */}
      <View style={styles.sectionHeader}>
        <ThemedText style={[Typography.headingMd, { color: themeColors.text }]}>
          Quick Actions
        </ThemedText>
        <ThemedText type="bodySm" color="secondary">
          Manage your healthcare system
        </ThemedText>
      </View>

      <View style={[styles.navGrid, isWeb && styles.navGridWeb]}>
        {navItems.map((item, i) => (
          <Animated.View
            key={item.label}
            entering={FadeInDown.delay(200 + i * 60).springify()}
            style={isWeb ? styles.navItemWeb : { width: '100%' }}
          >
            <Pressable
              onPress={item.onPress}
              style={({ pressed, hovered }) => [
                styles.navCard,
                {
                  backgroundColor: themeColors.card,
                  borderColor: hovered ? item.color + '40' : themeColors.cardBorder || themeColors.border,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
                isWeb && styles.navCardWeb,
                Shadows.sm,
              ]}
            >
              <View style={[styles.navIconCircle, { backgroundColor: item.color + '12' }]}>
                <IconSymbol name={item.icon} size={isWeb ? 24 : 22} color={item.color} />
              </View>
              <View style={styles.navTextContainer}>
                <ThemedText type="labelLg">{item.label}</ThemedText>
                <ThemedText type="bodySm" color="secondary" numberOfLines={2}>
                  {item.description}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={16} color={themeColors.textSecondary} />
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  containerWeb: {
    maxWidth: 1200,
    alignSelf: 'center' as any,
    width: '100%',
  },

  /* Page Header — desktop only */
  pageHeader: {
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.smd,
    marginBottom: Spacing.xl,
  },
  statsGridWeb: {
    gap: Spacing.md,
  },
  statCard: {
    width: '47%',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  statCardWeb: {
    flex: 1,
    minWidth: 220,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDesc: {
    marginTop: Spacing.xs,
    opacity: 0.7,
  },

  /* Section Header */
  sectionHeader: {
    marginBottom: Spacing.md,
    gap: 2,
  },

  /* Nav Grid */
  navGrid: {
    gap: Spacing.smd,
  },
  navGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  navItemWeb: {
    flex: 1,
    minWidth: 260,
    maxWidth: '48%',
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  navCardWeb: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    cursor: 'pointer' as any,
    transitionDuration: '150ms' as any,
  },
  navIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextContainer: {
    flex: 1,
    gap: 4,
  },
});
